"""
GoPro management endpoints.

Manages the BLE connection script, stream server, and media sync as subprocesses,
so the user can control the GoPro from the frontend.
"""

import os
import signal
import socket
import subprocess
import threading
import time
import urllib.request
from fastapi import APIRouter

router = APIRouter(prefix="/gopro", tags=["gopro"])

# Subprocess handles
_ble_process: subprocess.Popen | None = None
_stream_process: subprocess.Popen | None = None

# Media sync state
_media_sync_active = False
_media_sync_thread: threading.Thread | None = None
_last_synced_files: set = set()

# Paths
_BACKEND_DIR = os.path.dirname(os.path.dirname(__file__))
_VENV_PYTHON = os.path.join(_BACKEND_DIR, "venv", "bin", "python")
_BLE_SCRIPT = os.path.join(_BACKEND_DIR, "gopro_ble_connect.py")
_STREAM_SCRIPT = os.path.join(_BACKEND_DIR, "gopro_stream_server.py")
_CAPTURES_DIR = os.path.join(_BACKEND_DIR, "captures")

GOPRO_IP = "10.5.5.9"

os.makedirs(_CAPTURES_DIR, exist_ok=True)


def _is_running(proc: subprocess.Popen | None) -> bool:
    """Check if a subprocess is still running."""
    return proc is not None and proc.poll() is None


@router.get("/status")
def gopro_status():
    """Get the status of BLE connection, preview server, and media sync."""
    return {
        "ble_connected": _is_running(_ble_process),
        "preview_running": _is_running(_stream_process),
        "media_sync_active": _media_sync_active,
    }


@router.get("/wifi-status")
def wifi_status():
    """Check if laptop is connected to GoPro WiFi AP by trying to reach 10.5.5.9."""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)
        result = sock.connect_ex((GOPRO_IP, 8080))
        sock.close()
        return {"connected": result == 0}
    except Exception:
        return {"connected": False}


@router.get("/battery")
def battery_status():
    """Get the internal battery percentage of the GoPro."""
    import json
    try:
        req = urllib.request.Request(
            f"http://{GOPRO_IP}:8080/gopro/camera/state",
            headers={"Accept": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=2) as resp:
            data = json.loads(resp.read())
            status = data.get("status", {})
            percentage = status.get("70", 0)  # Status 70 is battery percentage
            return {"connected": True, "percentage": percentage}
    except Exception:
        return {"connected": False, "percentage": 0}


@router.get("/storage")
def storage_status():
    """Get the remaining storage capacity of the GoPro."""
    import json
    try:
        req = urllib.request.Request(
            f"http://{GOPRO_IP}:8080/gopro/camera/state",
            headers={"Accept": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read())
            status = data.get("status", {})
            total_kb = status.get("117", 0)
            rem_kb = status.get("54", 0)
            
            total_bytes = total_kb * 1024
            rem_bytes = rem_kb * 1024
            
            # Prevent negative used space if endpoints behave strangely
            used_bytes = total_bytes - rem_bytes if total_bytes > rem_bytes else 0
            
            return {
                "connected": True,
                "total_bytes": total_bytes,
                "used_bytes": used_bytes,
                "remaining_bytes": rem_bytes
            }
    except Exception:
        return {
            "connected": False,
            "total_bytes": 0,
            "used_bytes": 0,
            "remaining_bytes": 0
        }


@router.post("/format-sd")
def format_sd_card():
    """Clear all media from the GoPro SD card dynamically."""
    import urllib.request
    import json
    try:
        req = urllib.request.Request(f"http://{GOPRO_IP}:8080/gopro/media/list", headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
            
        media = data.get("media", [])
        deleted_count = 0
        for directory in media:
            d_name = directory.get("d", "")
            for f in directory.get("fs", []):
                f_name = f.get("n", "")
                if d_name and f_name:
                    try:
                        del_req = urllib.request.Request(
                            f"http://{GOPRO_IP}:8080/gopro/media/delete/file?path={d_name}/{f_name}",
                            headers={"Accept": "application/json"}
                        )
                        with urllib.request.urlopen(del_req, timeout=3) as del_resp:
                            if del_resp.getcode() == 200:
                                deleted_count += 1
                    except Exception:
                        pass # Ignore individual file deletion errors
        
        return {"success": True, "message": f"Successfully cleared {deleted_count} files from GoPro."}
    except Exception as e:
        return {"success": False, "detail": f"Failed to reach GoPro to clear SD Card: {str(e)}"}


@router.get("/ble-logs")
def ble_logs():
    """Get recent output from the BLE connection script."""
    if _ble_process is None:
        return {"running": False, "logs": ""}

    running = _ble_process.poll() is None
    logs = ""
    try:
        if _ble_process.stdout and _ble_process.stdout.readable():
            import select
            while select.select([_ble_process.stdout], [], [], 0)[0]:
                line = _ble_process.stdout.readline()
                if not line:
                    break
                logs += line
    except Exception:
        pass

    return {"running": running, "logs": logs}


@router.post("/ble-connect")
def ble_connect():
    """Start the BLE connection script to enable GoPro WiFi AP."""
    global _ble_process

    if _is_running(_ble_process):
        return {"status": "already_running", "message": "BLE connection is already active"}

    _ble_process = subprocess.Popen(
        [_VENV_PYTHON, _BLE_SCRIPT],
        cwd=_BACKEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    return {"status": "started", "message": "BLE connection started. Connect your Mac to GoPro WiFi AP when ready."}


@router.post("/ble-disconnect")
def ble_disconnect():
    """Stop the BLE connection script."""
    global _ble_process

    if not _is_running(_ble_process):
        _ble_process = None
        return {"status": "not_running"}

    try:
        _ble_process.send_signal(signal.SIGINT)
        _ble_process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        _ble_process.kill()
    except Exception:
        pass

    _ble_process = None
    return {"status": "stopped"}


@router.post("/start-preview")
def start_preview():
    """Start the GoPro stream server (port 8001)."""
    global _stream_process

    if _is_running(_stream_process):
        return {"status": "already_running", "message": "Preview server is already running"}

    _stream_process = subprocess.Popen(
        [_VENV_PYTHON, _STREAM_SCRIPT],
        cwd=_BACKEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    return {"status": "started", "message": "Preview server starting on port 8001..."}


@router.post("/stop-preview")
def stop_preview():
    """Stop the GoPro stream server."""
    global _stream_process

    if not _is_running(_stream_process):
        _stream_process = None
        return {"status": "not_running"}

    try:
        _stream_process.send_signal(signal.SIGINT)
        _stream_process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        _stream_process.kill()
    except Exception:
        pass

    _stream_process = None
    return {"status": "stopped"}


# ==============================
# Media Sync
# ==============================

_baseline_files: set = set()
_latest_new_capture: str | None = None  # path to latest new photo


def _get_gopro_media_keys() -> set:
    """Fetch all file keys currently on the GoPro."""
    import json
    keys = set()
    try:
        req = urllib.request.Request(
            f"http://{GOPRO_IP}:8080/gopro/media/list",
            headers={"Accept": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())

        for directory in data.get("media", []):
            dir_name = directory.get("d", "")
            for file_info in directory.get("fs", []):
                filename = file_info.get("n", "")
                if filename:
                    keys.add(f"{dir_name}/{filename}")
    except Exception:
        pass
    return keys


def _media_sync_worker():
    """
    Background thread: polls GoPro media list and downloads ONLY photos
    that appear AFTER the sync was started.
    """
    global _media_sync_active, _latest_new_capture

    while _media_sync_active:
        try:
            current_keys = _get_gopro_media_keys()
            new_keys = current_keys - _baseline_files

            for file_key in new_keys:
                # Only sync photos (JPG)
                if not file_key.lower().endswith((".jpg", ".jpeg")):
                    _baseline_files.add(file_key)
                    continue

                dir_name, filename = file_key.split("/", 1)
                photo_url = f"http://{GOPRO_IP}:8080/videos/DCIM/{dir_name}/{filename}"
                dest_path = os.path.join(_CAPTURES_DIR, f"gopro_{filename}")

                try:
                    urllib.request.urlretrieve(photo_url, dest_path)
                    _baseline_files.add(file_key)
                    _latest_new_capture = f"/captures/gopro_{filename}"
                    print(f"📸 New photo synced: {filename}")
                except Exception as e:
                    print(f"⚠️ Failed to download {filename}: {e}")

        except Exception:
            pass

        # Poll every 3 seconds
        for _ in range(30):
            if not _media_sync_active:
                break
            time.sleep(0.1)

    print("🛑 Media sync stopped")


@router.post("/start-media-sync")
def start_media_sync():
    """Start the media sync background thread. Snapshots existing files as baseline."""
    global _media_sync_active, _media_sync_thread, _baseline_files, _latest_new_capture

    if _media_sync_active:
        return {"status": "already_running"}

    # Snapshot current media as baseline — only NEW photos after this will be synced
    print("📋 Snapshotting GoPro media baseline...")
    _baseline_files = _get_gopro_media_keys()
    _latest_new_capture = None
    print(f"📋 Baseline: {len(_baseline_files)} existing files (will be ignored)")

    _media_sync_active = True
    _media_sync_thread = threading.Thread(target=_media_sync_worker, daemon=True)
    _media_sync_thread.start()

    return {"status": "started", "message": f"Media sync started. {len(_baseline_files)} existing files will be ignored."}


@router.post("/stop-media-sync")
def stop_media_sync():
    """Stop the media sync background thread."""
    global _media_sync_active

    if not _media_sync_active:
        return {"status": "not_running"}

    _media_sync_active = False
    return {"status": "stopped", "message": "Media sync stopped"}


@router.get("/latest-capture")
def latest_capture():
    """Get the most recently synced NEW photo (taken after sync started)."""
    return {"image_url": _latest_new_capture}

