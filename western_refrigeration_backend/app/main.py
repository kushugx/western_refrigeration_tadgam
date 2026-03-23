from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from .database import engine, Base, SessionLocal
from . import models, schemas
from .gopro_manager import router as gopro_router
from .auth import router as auth_router, seed_default_users
from .ml_pipeline import get_ml_model
from . import archive_manager
from pydantic import BaseModel
import os
import uuid
import shutil
import json
from datetime import datetime
import io

class ArchiveRequest(BaseModel):
    days: int


app = FastAPI()
app.include_router(gopro_router)
app.include_router(auth_router)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables
Base.metadata.create_all(bind=engine)

# Seed default users
_seed_db = SessionLocal()
seed_default_users(_seed_db)
_seed_db.close()

# Create uploads directory if it doesn't exist
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Create captures directory for GoPro synced photos
CAPTURES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "captures")
os.makedirs(CAPTURES_DIR, exist_ok=True)

# Mount uploads and captures as static files
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.mount("/captures", StaticFiles(directory=CAPTURES_DIR), name="captures")


# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/")
def root():
    return {"message": "Western Refrigeration Backend Running"}


class AnalyzeRequest(BaseModel):
    image_url: str
    job_type: str
    expected_count: int | None = None
    part_name: str | None = None  # Optional: when provided, filters detections to this specific part

@app.post("/api/analyze")
def analyze_image(request: AnalyzeRequest):
    """
    Runs the YOLO ML pipeline on the specified image URL.
    Returns pass/fail status and the URL of the annotated image.
    """
    # Convert URL back to absolute file path
    # e.g. "http://127.0.0.1:8000/captures/foo.jpg" -> "/path/to/captures/foo.jpg"
    file_path = ""
    if "/captures/" in request.image_url:
        filename = request.image_url.split("/captures/")[-1].split("?")[0]
        file_path = os.path.join(CAPTURES_DIR, filename)
    elif "/uploads/" in request.image_url:
        filename = request.image_url.split("/uploads/")[-1].split("?")[0]
        file_path = os.path.join(UPLOAD_DIR, filename)
    else:
        raise HTTPException(status_code=400, detail="Invalid image URL format")
        
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image file not found on server")

    # Get ML Instance and run analysis
    ml_model = get_ml_model()
    result = ml_model.analyze(
        image_path=file_path,
        job_type=request.job_type,
        expected_count=request.expected_count,
        part_name=request.part_name
    )
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
        
    return result


@app.post("/upload-image")
def upload_image(file: UploadFile = File()):
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Use JPEG, PNG, or WebP.")

    # Generate unique filename
    ext = os.path.splitext(file.filename)[1] if file.filename else ".png"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    # Save file
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    image_url = f"/uploads/{filename}"
    return {"image_url": image_url}


# Default images for known part types (case-insensitive lookup)
DEFAULT_PART_IMAGES = {
    "dew collector": "/uploads/dew_collector.png",
    "shelf": "/uploads/shelf.png",
    "tray": "/uploads/tray.png",
    "temperature knob": "/uploads/temperature_knob.png",
}


def get_default_image(part_name: str) -> str | None:
    """Return the default image URL for a known part name, or None."""
    return DEFAULT_PART_IMAGES.get(part_name.strip().lower())

@app.get("/api/captures")
def list_captures():
    """Returns a list of all images in the captures directory, sorted by newest first."""
    images = []
    valid_exts = {".jpg", ".jpeg", ".png", ".webp"}
    
    for root_dir, _, files in os.walk(CAPTURES_DIR):
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in valid_exts:
                full_path = os.path.join(root_dir, file)
                # Convert the absolute file path back to a URL path relative to the /captures mount
                rel_path = os.path.relpath(full_path, CAPTURES_DIR)
                # Replace windows separators if any
                rel_path = rel_path.replace("\\", "/")
                
                images.append({
                    "url": f"/captures/{rel_path}",
                    "filename": file,
                    "created_at": os.path.getmtime(full_path)
                })
                
    # Sort by newest
    images.sort(key=lambda x: x["created_at"], reverse=True)
    return images

class DeleteCapturesRequest(BaseModel):
    filenames: list[str]

@app.delete("/api/captures")
def delete_captures(request: DeleteCapturesRequest):
    """Deletes multiple images from the captures directory."""
    deleted_count = 0
    errors = []
    
    for filename in request.filenames:
        # Security checking against path traversal
        if ".." in filename or "/" in filename or "\\" in filename:
            errors.append(f"Invalid filename: {filename}")
            continue
            
        filepath = os.path.join(CAPTURES_DIR, filename)
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
                deleted_count += 1
            except Exception as e:
                errors.append(f"Failed to delete {filename}: {str(e)}")
        else:
            errors.append(f"File not found: {filename}")
            
    if errors and deleted_count == 0:
        raise HTTPException(status_code=400, detail={"message": "Failed to delete files", "errors": errors})
        
    return {
        "message": f"Successfully deleted {deleted_count} files.", 
        "errors": errors if errors else None
    }


@app.post("/masters")
def create_master(master: schemas.MasterCreate, db: Session = Depends(get_db)):
    if not master.parts:
        raise HTTPException(status_code=400, detail="At least one part is required")

    # Create Master
    db_master = models.Master(name=master.name)
    db.add(db_master)
    db.flush()  # Get master ID before commit

    # Create Parts
    for part in master.parts:
        if part.job_type == "counting" and not part.expected_count:
            raise HTTPException(
                status_code=400,
                detail=f"Expected count required for part {part.part_name}"
            )

        # Auto-assign default image if none provided
        image_url = part.image_url or get_default_image(part.part_name)

        db_part = models.MasterPart(
            master_id=db_master.id,
            part_name=part.part_name,
            job_type=part.job_type,
            expected_count=part.expected_count,
            image_url=image_url
        )
        db.add(db_part)

    db.commit()
    db.refresh(db_master)


    return {"message": "Master created successfully", "master_id": db_master.id}

@app.get("/masters")
def get_masters(db: Session = Depends(get_db)):
    masters = db.query(models.Master).all()

    result = []
    for master in masters:
        result.append({
            "id": master.id,
            "name": master.name
        })

    return result


# New endpoint to get a master by ID
@app.get("/masters/{master_id}")
def get_master_by_id(master_id: int, db: Session = Depends(get_db)):
    master = db.query(models.Master).filter(models.Master.id == master_id).first()

    if not master:
        raise HTTPException(status_code=404, detail="Master not found")

    return {
        "id": master.id,
        "name": master.name,
        "parts": [
            {
                "id": part.id,
                "part_name": part.part_name,
                "job_type": part.job_type,
                "expected_count": part.expected_count,
                "image_url": part.image_url
            }
            for part in master.parts
        ]
    }


@app.delete("/masters/{master_id}")
def delete_master(master_id: int, db: Session = Depends(get_db)):
    master = db.query(models.Master).filter(models.Master.id == master_id).first()

    if not master:
        raise HTTPException(status_code=404, detail="Master not found")

    db.delete(master)
    db.commit()

    return {"message": "Master deleted successfully"}


# PUT endpoint to update a master
@app.put("/masters/{master_id}")
def update_master(master_id: int, master: schemas.MasterCreate, db: Session = Depends(get_db)):
    db_master = db.query(models.Master).filter(models.Master.id == master_id).first()

    if not db_master:
        raise HTTPException(status_code=404, detail="Master not found")

    if not master.parts:
        raise HTTPException(status_code=400, detail="At least one part is required")

    # Update master name
    db_master.name = master.name

    # Delete existing parts
    db.query(models.MasterPart).filter(models.MasterPart.master_id == master_id).delete()

    # Add updated parts
    for part in master.parts:
        if part.job_type == "counting" and not part.expected_count:
            raise HTTPException(
                status_code=400,
                detail=f"Expected count required for part {part.part_name}"
            )

        # Auto-assign default image if none provided
        image_url = part.image_url or get_default_image(part.part_name)

        new_part = models.MasterPart(
            master_id=master_id,
            part_name=part.part_name,
            job_type=part.job_type,
            expected_count=part.expected_count,
            image_url=image_url
        )
        db.add(new_part)

    db.commit()
    db.refresh(db_master)

    return {"message": "Master updated successfully"}


# ─── Reports ───────────────────────────────────────────────

@app.post("/reports")
def create_report(report: schemas.ReportCreate, db: Session = Depends(get_db)):
    db_report = models.Report(
        master_name=report.master_name,
        operator=report.operator,
        created_at=datetime.utcnow(),
        parts_data=json.dumps([p.model_dump() for p in report.parts]),
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return {"message": "Report saved", "report_id": db_report.id}


@app.get("/reports")
def list_reports(role: str = "operator", username: str = None, db: Session = Depends(get_db)):
    query = db.query(models.Report)
    
    if role != "admin" and username:
        query = query.filter(models.Report.operator == username)
        
    reports = query.order_by(models.Report.created_at.desc()).all()
    results = []
    for r in reports:
        parts = json.loads(r.parts_data)
        success_count = sum(1 for p in parts if p.get("ml_status") == "success")
        is_partial = 0 < success_count < len(parts)
        is_all_fail = success_count == 0 and len(parts) > 0
        
        results.append({
            "id": r.id,
            "master_name": r.master_name,
            "operator": r.operator,
            "created_at": r.created_at.isoformat() + "Z",
            "parts_count": len(parts),
            "status": "PASS" if not is_partial and not is_all_fail else "PARTIAL" if is_partial else "FAIL"
        })
    return results


@app.get("/reports/{report_id}")
def get_report(report_id: int, db: Session = Depends(get_db)):
    r = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    return {
        "id": r.id,
        "master_name": r.master_name,
        "operator": r.operator,
        "created_at": r.created_at.isoformat() + "Z",
        "parts": json.loads(r.parts_data),
    }


class OverrideRequest(BaseModel):
    part_index: int
    new_status: str  # 'success' or 'fail'
    operator: str


@app.patch("/reports/{report_id}/override")
def override_report_part(report_id: int, req: OverrideRequest, db: Session = Depends(get_db)):
    r = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")

    parts = json.loads(r.parts_data)
    if req.part_index < 0 or req.part_index >= len(parts):
        raise HTTPException(status_code=400, detail="Invalid part index")

    part = parts[req.part_index]
    
    # Store original status if not already overridden
    if not part.get("is_overridden"):
        part["is_overridden"] = True
        part["original_ml_status"] = part.get("ml_status")
        part["original_ml_message"] = part.get("ml_message")
    
    # Update for audit
    part["ml_status"] = req.new_status
    part["overridden_by"] = req.operator
    part["overridden_at"] = datetime.utcnow().isoformat() + "Z"
    
    r.parts_data = json.dumps(parts)
    db.commit()
    return {"success": True, "parts": parts}


@app.get("/reports/{report_id}/pdf")
def download_report_pdf(report_id: int, db: Session = Depends(get_db)):
    r = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")

    parts = json.loads(r.parts_data)

    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image as RLImage
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib.enums import TA_CENTER
    import urllib.request
    import tempfile

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()
    center_style = ParagraphStyle("center", parent=styles["Normal"], alignment=TA_CENTER, fontSize=8, textColor=colors.grey)
    elements = []

    # Title
    elements.append(Paragraph("Western Refrigeration — Inspection Report", styles["Title"]))
    elements.append(Spacer(1, 12))

    # Info table
    info_data = [
        ["Master File", r.master_name],
        ["Operator", r.operator],
        ["Date", (r.created_at + __import__('datetime').timedelta(hours=5, minutes=30)).strftime("%Y-%m-%d %H:%M IST")],
        ["Report ID", str(r.id)],
    ]
    info_table = Table(info_data, colWidths=[1.5 * inch, 4 * inch])
    info_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 20))

    # Summary table
    elements.append(Paragraph("Inspection Summary", styles["Heading2"]))
    elements.append(Spacer(1, 8))

    summary_data = [["#", "Part Name", "Job Type", "Expected", "Photo", "Decision"]]
    for i, part in enumerate(parts, 1):
        ml_status = part.get("ml_status", "idle")
        is_overridden = part.get("is_overridden", False)
        
        if ml_status == "success":
            status_text = "PASS"
        elif ml_status == "fail":
            status_text = "FAIL"
        else:
            status_text = "-"
            
        if is_overridden:
            orig = "FAIL" if part.get("original_ml_status") == "fail" else "PASS"
            status_text = f"{status_text}\n(Manual Override)\n[ML: {orig}]"
            
        summary_data.append([
            str(i),
            part.get("part_name", ""),
            part.get("job_type", ""),
            str(part.get("expected_count", "-") or "-"),
            "Yes" if part.get("captured_image") else "No",
            status_text
        ])

    summary_table = Table(summary_data, colWidths=[0.3 * inch, 1.8 * inch, 1.1 * inch, 0.8 * inch, 0.6 * inch, 0.8 * inch])
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f4f8")]),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 24))

    # Helper to resolve image path to a file on disk
    def resolve_image(url: str | None) -> str | None:
        if not url:
            return None
        # Strip query strings (e.g. ?t=timestamp added by frontend cache-busting)
        clean_url = url.split("?")[0]
        # Local uploads (e.g., /uploads/dew_collector.png)
        if clean_url.startswith("/uploads/"):
            local_path = os.path.join(UPLOAD_DIR, clean_url.replace("/uploads/", ""))
            if os.path.exists(local_path):
                return local_path
        # Local captures (e.g., /captures/annotated/foo.jpg)
        if clean_url.startswith("/captures/"):
            local_path = os.path.join(CAPTURES_DIR, clean_url.replace("/captures/", ""))
            if os.path.exists(local_path):
                return local_path
        # Remote URL (e.g., http://localhost:8001/...)
        if clean_url.startswith("http"):
            try:
                tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
                urllib.request.urlretrieve(clean_url, tmp.name)
                return tmp.name
            except Exception:
                return None
        return None

    # Per-part detail with images
    elements.append(Paragraph("Part Details", styles["Heading2"]))
    elements.append(Spacer(1, 8))

    for i, part in enumerate(parts, 1):
        elements.append(Paragraph(f"Part {i}: {part.get('part_name', '')} — {part.get('job_type', '')}", styles["Heading3"]))
        elements.append(Spacer(1, 4))

        ml_msg = part.get("ml_message", "")
        ml_status = part.get("ml_status", "idle")
        if ml_msg and ml_msg != "No ML analysis performed":
            if ml_status == "success":
                msg_color = colors.HexColor("#10b981") # emerald-500
                prefix = "PASS:"
            elif ml_status == "fail":
                msg_color = colors.HexColor("#ef4444") # red-500
                prefix = "FAIL:"
            else:
                msg_color = colors.grey
                prefix = "ANALYSIS:"
                
            msg_style = ParagraphStyle("MLMsg", parent=styles["Normal"], textColor=msg_color, fontName="Helvetica-Bold", fontSize=10)
            elements.append(Paragraph(f"{prefix} {ml_msg}", msg_style))
            elements.append(Spacer(1, 6))

        ref_path = resolve_image(part.get("reference_image"))
        cap_path = resolve_image(part.get("captured_image"))

        img_w, img_h = 2.2 * inch, 1.6 * inch

        ref_cell = Paragraph("Reference image not available", center_style)
        cap_cell = Paragraph("No photo captured", center_style)

        if ref_path:
            try:
                ref_cell = RLImage(ref_path, width=img_w, height=img_h, kind="proportional")
            except Exception:
                ref_cell = Paragraph("Could not load reference image", center_style)

        if cap_path:
            try:
                cap_cell = RLImage(cap_path, width=img_w, height=img_h, kind="proportional")
            except Exception:
                cap_cell = Paragraph("Could not load captured image", center_style)

        img_table = Table(
            [
                [Paragraph("<b>Reference Image</b>", center_style), Paragraph("<b>Captured Image</b>", center_style)],
                [ref_cell, cap_cell],
            ],
            colWidths=[3 * inch, 3 * inch],
        )
        img_table.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.lightgrey),
            ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
        ]))
        elements.append(img_table)
        elements.append(Spacer(1, 16))

    doc.build(elements)
    buffer.seek(0)

    filename = f"report_{r.id}_{r.master_name.replace(' ', '_')}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={filename}"},
    )


@app.delete("/reports/{report_id}")
def delete_report(report_id: int, db: Session = Depends(get_db)):
    r = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    db.delete(r)
    db.commit()
    return {"message": "Report deleted"}


@app.get("/maintenance/stats")
def get_maintenance_stats(db: Session = Depends(get_db)):
    return archive_manager.get_storage_stats(db)


@app.post("/maintenance/archive")
def perform_maintenance_archive(req: ArchiveRequest, db: Session = Depends(get_db)):
    try:
        result = archive_manager.archive_old_data(db, req.days)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/maintenance/download/{filename}")
def download_maintenance_archive(filename: str):
    path = os.path.join(archive_manager.ARCHIVES_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Archive not found")
    return FileResponse(path, filename=filename)