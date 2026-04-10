import os
from ultralytics import YOLO
import cv2
import uuid
from .fridge_config import ALL_PARTS

# ─────────────────────────────────────────────
# Model loading priority:
#   1. models/fridge.pt  (current production model)
#   2. models/best.pt    (previous custom model, fallback)
#   3. yolov8n.pt        (generic pretrained, last resort)
#
# To swap models in future: drop the new .pt into models/ and rename
# it to fridge.pt.  No other code changes required.
# ─────────────────────────────────────────────
_MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")

def _resolve_model() -> str:
    for name in ("fridge.pt", "best.pt"):
        path = os.path.join(_MODELS_DIR, name)
        if os.path.exists(path):
            return path
    return "yolov8n.pt"   # generic fallback

DEFAULT_MODEL_PATH = _resolve_model()
print(f"[ML Pipeline] Using model: {DEFAULT_MODEL_PATH}")


# ─────────────────────────────────────────────
# Known parts registry
#
# Built from the 27-part universal catalog in fridge_config.
# Keys  : lowercase display names used throughout the app
# Values: canonical display names shown to the user
# ─────────────────────────────────────────────
KNOWN_PARTS: dict[str, str] = {
    part.strip().lower(): part for part in ALL_PARTS
}


def _normalize(s: str) -> str:
    """Lowercase and replace hyphens/underscores with spaces for fuzzy matching."""
    return s.strip().lower().replace("-", " ").replace("_", " ")


def _canonical_part(part_name: str) -> str | None:
    """Return the canonical display name for a part, or None if not recognised."""
    if part_name is None:
        return None
    lower = _normalize(part_name)
    for key, display in KNOWN_PARTS.items():
        if _normalize(key) in lower or lower in _normalize(key):
            return display
    return None


class YOLOInspectionModel:
    def __init__(self, model_path: str = DEFAULT_MODEL_PATH):
        print(f"Loading YOLO model from: {model_path}")
        self.model = YOLO(model_path)

        # Directory for annotated output images
        self.output_dir = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), "captures", "annotated"
        )
        os.makedirs(self.output_dir, exist_ok=True)

    def _get_class_names(self, result) -> list[str]:
        """Return the class name for every detected box in a result."""
        if result.boxes is None or len(result.boxes) == 0:
            return []
        return [result.names[int(c)] for c in result.boxes.cls.tolist()]

    def _save_annotated(self, result) -> str:
        """Save the annotated frame to disk and return its URL path."""
        annotated_frame = result.plot()
        filename = f"annotated_{uuid.uuid4().hex}.jpg"
        output_path = os.path.join(self.output_dir, filename)
        cv2.imwrite(output_path, annotated_frame)
        return f"/captures/annotated/{filename}"

    def analyze(
        self,
        image_path: str,
        job_type: str = "presence",
        part_name: str = None,
    ) -> dict:
        """
        Run YOLOv8 inference and evaluate pass/fail based on job_type.

        Parameters
        ----------
        image_path    : Absolute path to the captured image.
        job_type      : Only 'presence' is supported (presence/absence check).
        part_name     : The part being inspected (e.g. 'Dew Collector').
                        When provided, detection is filtered to that class only.
        """
        if not os.path.exists(image_path):
            return {"success": False, "error": f"Image file not found: {image_path}"}

        print(f"[ML] Inference | job={job_type} | part={part_name} | image={os.path.basename(image_path)}")

        # ── Debug pass at very low confidence so we can see what the model sees ──
        _dbg = self.model(image_path, conf=0.01, verbose=False)
        if _dbg and _dbg[0].boxes is not None and len(_dbg[0].boxes) > 0:
            _raw = [
                (_dbg[0].names[int(c)], round(float(s), 3))
                for c, s in zip(_dbg[0].boxes.cls.tolist(), _dbg[0].boxes.conf.tolist())
            ]
            print(f"[DEBUG] Raw detections (conf>0.01): {_raw}")
        else:
            print(f"[DEBUG] No detections even at conf=0.01 — model may not recognise this image.")

        # ── Production inference ──
        results = self.model(image_path, conf=0.25)
        if not results:
            return {"success": False, "error": "Model returned no results."}

        result = results[0]
        all_class_names = self._get_class_names(result)
        annotated_url   = self._save_annotated(result)

        # Resolve canonical part name
        display_name = _canonical_part(part_name)
        label        = display_name or "Object"

        # ─────────────────────────────────────────────
        # Filter detections to the target part class
        # ─────────────────────────────────────────────
        if display_name:
            target_norm    = _normalize(display_name)
            filtered_names = [n for n in all_class_names if target_norm in _normalize(n) or _normalize(n) in target_norm]
            filtered_count = len(filtered_names)
        else:
            # No specific part → count every detection (backward-compatible)
            filtered_count = len(all_class_names)

        # ─────────────────────────────────────────────
        # Presence / Absence check (only job type now)
        # ─────────────────────────────────────────────
        job_success = (filtered_count > 0)
        message = (
            f"{label} — Present."
            if job_success
            else f"Job Failed: {label} not detected in the image."
        )

        return {
            "success": job_success,
            "detected_count": filtered_count,
            "annotated_url": annotated_url,
            "message": message,
        }


# ── Singleton ──────────────────────────────────
_ml_model_instance = None

def get_ml_model() -> YOLOInspectionModel:
    global _ml_model_instance
    if _ml_model_instance is None:
        _ml_model_instance = YOLOInspectionModel()
    return _ml_model_instance
