import os
import shutil
import json
import zipfile
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from . import models

# Base directories
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
CAPTURES_DIR = os.path.join(BASE_DIR, "captures")
ARCHIVES_DIR = os.path.join(BASE_DIR, "archives")

# Ensure archives directory exists
os.makedirs(ARCHIVES_DIR, exist_ok=True)

def resolve_local_path(url: str | None) -> str | None:
    if not url:
        return None
    
    clean_url = url.split("?")[0]
    
    # Resolve /uploads/
    if "/uploads/" in clean_url:
        filename = clean_url.split("/uploads/")[-1]
        path = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(path):
            return path
            
    # Resolve /captures/
    if "/captures/" in clean_url:
        filename = clean_url.split("/captures/")[-1]
        path = os.path.join(CAPTURES_DIR, filename)
        if os.path.exists(path):
            return path
            
    return None

def archive_old_data(db: Session, days: int) -> dict:
    """
    Identifies reports and images older than `days`.
    Packs them into a ZIP and deletes them from the system.
    """
    threshold = datetime.utcnow() - timedelta(days=days)
    
    # 1. Find reports to archive
    old_reports = db.query(models.Report).filter(models.Report.created_at < threshold).all()
    
    if not old_reports:
        return {"success": True, "archived_count": 0, "message": "No data found to archive."}
    
    # 2. Prepare archiving directory
    archive_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    archive_name = f"archive_{archive_id}"
    temp_dir = os.path.join(ARCHIVES_DIR, archive_name)
    os.makedirs(temp_dir, exist_ok=True)
    os.makedirs(os.path.join(temp_dir, "images"), exist_ok=True)
    
    reports_summary = []
    files_to_delete = set()
    
    # 3. Process reports
    for r in old_reports:
        parts = json.loads(r.parts_data)
        
        # Track for summary JSON
        reports_summary.append({
            "id": r.id,
            "master_name": r.master_name,
            "operator": r.operator,
            "created_at": r.created_at.isoformat(),
            "parts": parts
        })
        
        # Collect image files
        for part in parts:
            for img_key in ["captured_image", "reference_image"]:
                url = part.get(img_key)
                local_path = resolve_local_path(url)
                if local_path and os.path.isfile(local_path):
                    # Copy to archive temp dir if not already there
                    dest_path = os.path.join(temp_dir, "images", os.path.basename(local_path))
                    if not os.path.exists(dest_path):
                        shutil.copy2(local_path, dest_path)
                    
                    # Mark for deletion ONLY if it's in uploads/ or captures/ (not a placeholder/static)
                    if UPLOAD_DIR in local_path or CAPTURES_DIR in local_path:
                        files_to_delete.add(local_path)
    
    # 4. Save summary JSON into archive
    with open(os.path.join(temp_dir, "reports_summary.json"), "w") as f:
        json.dump(reports_summary, f, indent=4)
        
    # 5. Create ZIP
    zip_path = shutil.make_archive(temp_dir, 'zip', temp_dir)
    
    # 6. Delete temp directory
    shutil.rmtree(temp_dir)
    
    # 7. Cleanup System (DB and Filesystem)
    # DELETE Reports from DB
    report_ids = [r.id for r in old_reports]
    db.query(models.Report).filter(models.Report.id.in_(report_ids)).delete(synchronize_session=False)
    db.commit()
    
    # DELETE files from disk
    deleted_files_count = 0
    for file_path in files_to_delete:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                deleted_files_count += 1
        except Exception as e:
            print(f"Error deleting file {file_path}: {e}")
            
    return {
        "success": True,
        "archived_count": len(old_reports),
        "deleted_files_count": deleted_files_count,
        "archive_file": os.path.basename(zip_path),
        "message": f"Successfully archived {len(old_reports)} reports and {deleted_files_count} files."
    }

def get_storage_stats(db: Session):
    """
    Returns statistics about current storage usage and potential archive sizes.
    """
    total_reports = db.query(models.Report).count()
    
    def count_older_than(days):
        t = datetime.utcnow() - timedelta(days=days)
        return db.query(models.Report).filter(models.Report.created_at < t).count()
    
    # Calculate image counts
    total_captured_images = 0
    if os.path.exists(CAPTURES_DIR):
        for root, dirs, files in os.walk(CAPTURES_DIR):
            total_captured_images += len(files)
            
    return {
        "total_reports": total_reports,
        "total_captured_images": total_captured_images,
        "older_than_30": count_older_than(30),
        "older_than_60": count_older_than(60),
        "older_than_90": count_older_than(90),
    }
