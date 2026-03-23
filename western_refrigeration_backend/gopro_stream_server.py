import cv2
import time
import os
import subprocess
import threading
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# ==============================
# GoPro Configuration
# (Matches your working preview script)
# ==============================
GOPRO_IP = "10.5.5.9"
UDP_PORT = 8554

# Directory for captured photos
CAPTURES_DIR = os.path.join(os.path.dirname(__file__), "captures")
os.makedirs(CAPTURES_DIR, exist_ok=True)

# Global state
cap = None
latest_frame = None
stream_running = False
connection_status = "disconnected"


# ==============================
# GoPro Stream Control
# (Uses curl — same as your working preview script)
# ==============================

def start_gopro_preview():
    """Start the GoPro preview stream via Open GoPro HTTP API (port 8080)."""
    url = f"http://{GOPRO_IP}:8080/gopro/camera/stream/start?port={UDP_PORT}"
    subprocess.run(
        ["curl", "-s", url],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        timeout=5,
    )
    print("📡 Preview stream start command sent")


def stop_gopro_preview():
    """Stop the GoPro preview stream."""
    url = f"http://{GOPRO_IP}:8080/gopro/camera/stream/stop"
    try:
        subprocess.run(
            ["curl", "-s", url],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=5,
        )
    except Exception:
        pass
    print("🛑 Preview stream stopped")


# ==============================
# Frame Reader Thread
# (Logic from your Tkinter app's run_preview_script)
# ==============================

def frame_reader():
    """Start the GoPro preview and continuously read frames."""
    global cap, latest_frame, stream_running, connection_status

    connection_status = "starting"
    print("🎥 Starting GoPro UDP Preview...")
    print("⚠️  Make sure you are connected to the GoPro WiFi AP!")

    start_gopro_preview()
    time.sleep(1.0)

    udp_url = f"udp://{GOPRO_IP}:{UDP_PORT}"
    cap = cv2.VideoCapture(udp_url, cv2.CAP_FFMPEG)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    if not cap.isOpened():
        connection_status = "stream_error"
        print("❌ Failed to open UDP stream")
        print("Tips:")
        print("  1. Run gopro_ble_connect.py first to enable WiFi AP")
        print("  2. Connect your Mac to the GoPro WiFi AP")
        print("  3. Then restart this server")
        stop_gopro_preview()
        return

    connection_status = "streaming"
    stream_running = True
    print("🟢 GoPro preview stream is LIVE!")

    last_successful_frame = time.time()
    stream_restart_count = 0

    while stream_running:
        ret, frame = cap.read()

        if ret:
            last_successful_frame = time.time()
            frame = cv2.resize(frame, (960, 540))
            latest_frame = frame
        else:
            time_since_last = time.time() - last_successful_frame

            # Auto-restart after 20s stall (up to 3 times — same as your Tkinter app)
            if time_since_last > 20 and stream_restart_count < 3:
                print(f"⚠️ Stream stalled for {time_since_last:.0f}s — restarting (attempt {stream_restart_count + 1}/3)...")
                try:
                    cap.release()
                    time.sleep(0.5)
                    stop_gopro_preview()
                    time.sleep(0.5)
                    start_gopro_preview()
                    time.sleep(0.5)
                    cap = cv2.VideoCapture(udp_url, cv2.CAP_FFMPEG)
                    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                    stream_restart_count += 1
                    last_successful_frame = time.time()
                except Exception as e:
                    print(f"⚠️ Restart failed: {e}")
                    stream_restart_count += 1

            # Give up after 30s total
            elif time_since_last > 30:
                print("❌ Stream unrecoverable — giving up")
                break
            else:
                time.sleep(0.5)

    cap.release()
    stop_gopro_preview()
    connection_status = "disconnected"
    stream_running = False
    print("🧹 Clean shutdown complete")


# ==============================
# FastAPI App
# ==============================

@asynccontextmanager
async def lifespan(app: FastAPI):
    thread = threading.Thread(target=frame_reader, daemon=True)
    thread.start()
    yield
    global stream_running
    stream_running = False


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount captures as static files
app.mount("/captures", StaticFiles(directory=CAPTURES_DIR), name="captures")


def generate_frames():
    """Generate MJPEG frames for the /video_feed endpoint."""
    while True:
        if latest_frame is None:
            time.sleep(0.01)
            continue

        _, buffer = cv2.imencode(".jpg", latest_frame)
        frame_bytes = buffer.tobytes()

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
        )


@app.get("/video_feed")
def video_feed():
    """MJPEG stream of the GoPro preview."""
    return StreamingResponse(
        generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@app.post("/capture_photo")
def capture_photo():
    """Capture the current frame from the live stream and save it as JPEG."""
    if latest_frame is None:
        raise HTTPException(
            status_code=503,
            detail="No frame available. Is the GoPro connected and streaming?"
        )

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    filename = f"capture_{timestamp}.jpg"
    filepath = os.path.join(CAPTURES_DIR, filename)

    success = cv2.imwrite(filepath, latest_frame, [cv2.IMWRITE_JPEG_QUALITY, 95])

    if not success:
        raise HTTPException(status_code=500, detail="Failed to save captured photo")

    image_url = f"/captures/{filename}"
    return {"image_url": image_url, "filename": filename}


@app.get("/status")
def status():
    """Health check — connection and stream status."""
    return {
        "connection_status": connection_status,
        "stream_running": stream_running,
        "has_frame": latest_frame is not None,
    }


@app.get("/snapshot")
def snapshot():
    """Return a single JPEG frame (for polling instead of MJPEG stream)."""
    from fastapi.responses import Response

    if latest_frame is None:
        raise HTTPException(status_code=503, detail="No frame available")

    _, buffer = cv2.imencode(".jpg", latest_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return Response(
        content=buffer.tobytes(),
        media_type="image/jpeg",
        headers={"Cache-Control": "no-cache, no-store, must-revalidate"},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
