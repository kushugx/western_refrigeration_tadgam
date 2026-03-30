import os
import shutil
import json
import zipfile
import base64
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

def get_base64_of_image(file_path: str) -> str | None:
    try:
        with open(file_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    except Exception as e:
        print(f"Error base64 encoding {file_path}: {e}")
        return None

def push_to_customer_db(archive_payload: list, api_key: str):
    """
    Stub for pushing the JSON archive to the customer's database.
    """
    if not api_key:
        print("API Key not configured. Skipping push to customer database.")
        return False
    # Example logic:
    # import requests
    # resp = requests.post("https://customer-database.com/api/archive", json=archive_payload, headers={"Authorization": f"Bearer {api_key}"})
    # return resp.status_code == 200
    print("Pretending to push to customer DB...")
    return True

def archive_old_data(db: Session, days: int) -> dict:
    """
    Identifies reports and images older than `days`.
    Packs them into a JSON payload with Base64 images and deletes them from the system.
    """
    threshold = datetime.utcnow() - timedelta(days=days)
    
    # 1. Find reports to archive
    old_reports = db.query(models.Report).filter(models.Report.created_at < threshold).all()
    
    if not old_reports:
        return {"success": True, "archived_count": 0, "message": "No data found to archive."}
    
    reports_summary = []
    files_to_delete = set()
    
    # 2. Process reports and convert images to Base64
    for r in old_reports:
        parts = json.loads(r.parts_data)
        
        for part in parts:
            for img_key in ["captured_image", "reference_image"]:
                url = part.get(img_key)
                local_path = resolve_local_path(url)
                if local_path and os.path.isfile(local_path):
                    # Convert to Base64
                    b64_str = get_base64_of_image(local_path)
                    if b64_str:
                        part[f"base64_{img_key}"] = b64_str
                        
                    # Mark for deletion ONLY if it's in uploads/ or captures/
                    if UPLOAD_DIR in local_path or CAPTURES_DIR in local_path:
                        files_to_delete.add(local_path)
        
        # Add to payload
        reports_summary.append({
            "id": r.id,
            "master_name": r.master_name,
            "operator": r.operator,
            "created_at": r.created_at.isoformat(),
            "parts": parts
        })
        
    # 3. Simulate Push to Customer Database
    api_key_placeholder = os.getenv("CUSTOMER_DB_API_KEY", "")
    push_to_customer_db(reports_summary, api_key_placeholder)
    
    # 4. Save summary JSON to archives dir
    archive_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    archive_filename = f"archive_{archive_id}.json"
    archive_path = os.path.join(ARCHIVES_DIR, archive_filename)
    
    with open(archive_path, "w") as f:
        json.dump(reports_summary, f, indent=4)
        
    # 5. Cleanup System (DB and Filesystem)
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
        "archive_file": archive_filename,
        "message": f"Successfully archived {len(old_reports)} reports to Base64 JSON and deleted {deleted_files_count} files."
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
