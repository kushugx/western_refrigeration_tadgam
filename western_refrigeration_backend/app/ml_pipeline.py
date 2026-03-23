import os
from ultralytics import YOLO
import cv2
import uuid

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
# Keys  : lowercase display names used throughout the app
# Values: canonical display names shown to the user
#
# The misaligned knob is NOT listed here as a "part" — it is an
# internal model class used only for alignment evaluation.
# ─────────────────────────────────────────────
KNOWN_PARTS = {
    "dew collector":    "Dew Collector",
    "tray":             "Tray",
    "temperature knob": "Temperature Knob",
    "shelf":            "Shelf",
}

# The model class name that indicates a misaligned temperature knob
MISALIGNED_CLASS = "temperature-knob-misalligned"


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
        job_type: str,
        expected_count: int = None,
        part_name: str = None,
    ) -> dict:
        """
        Run YOLOv8 inference and evaluate pass/fail based on job_type.

        Parameters
        ----------
        image_path    : Absolute path to the captured image.
        job_type      : One of 'presence', 'absence', 'counting', 'alignment'.
        expected_count: Required only for the 'counting' job.
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
        job_lower    = job_type.lower()

        # ─────────────────────────────────────────────
        # ALIGNMENT  (Temperature Knob only)
        #   The model has two dedicated classes:
        #     • temperature-knob             → knob is correctly aligned
        #     • temperature-knob-misalligned → knob is misaligned
        #
        #   Logic:
        #     - Misaligned class detected   → FAIL
        #     - Normal class detected only  → PASS
        #     - Neither class detected      → FAIL (can't evaluate)
        # ─────────────────────────────────────────────
        if "align" in job_lower:
            # ── Confidence-based alignment decision ──────────────────────────
            # Both "temperature-knob" and "temperature-knob-misalligned" may be
            # detected simultaneously.  We compare their PEAK confidence scores:
            # whichever class scored higher is treated as the true detection.
            #
            # Example from debug log:
            #   temperature-knob            0.807  ← winner → PASS
            #   temperature-knob-misalligned 0.597
            # ────────────────────────────────────────────────────────────────
            if result.boxes is not None and len(result.boxes) > 0:
                confs  = result.boxes.conf.tolist()
                names  = [result.names[int(c)] for c in result.boxes.cls.tolist()]

                # Gather max confidence per relevant class
                max_aligned     = max(
                    (conf for name, conf in zip(names, confs)
                     if _normalize(name) == _normalize("temperature-knob")),
                    default=0.0
                )
                max_misaligned  = max(
                    (conf for name, conf in zip(names, confs)
                     if _normalize(name) == _normalize(MISALIGNED_CLASS)),
                    default=0.0
                )

                print(f"[ALIGN] aligned_conf={max_aligned:.3f} | misaligned_conf={max_misaligned:.3f}")

                if max_aligned == 0.0 and max_misaligned == 0.0:
                    # Neither class at production threshold
                    return {
                        "success": False,
                        "detected_count": 0,
                        "annotated_url": annotated_url,
                        "message": "Job Failed: Temperature Knob not detected — cannot evaluate alignment.",
                    }
                elif max_aligned >= max_misaligned:
                    return {
                        "success": True,
                        "detected_count": 1,
                        "annotated_url": annotated_url,
                        "message": f"Temperature Knob — Properly Aligned. (confidence: {max_aligned:.0%})",
                    }
                else:
                    return {
                        "success": False,
                        "detected_count": 1,
                        "annotated_url": annotated_url,
                        "message": f"Temperature Knob — Misaligned. Adjustment required. (confidence: {max_misaligned:.0%})",
                    }
            else:
                return {
                    "success": False,
                    "detected_count": 0,
                    "annotated_url": annotated_url,
                    "message": "Job Failed: Temperature Knob not detected — cannot evaluate alignment.",
                }

        # ─────────────────────────────────────────────
        # All other jobs — filter detections to the target part class
        # ─────────────────────────────────────────────
        if display_name:
            target_norm    = _normalize(display_name)
            filtered_names = [n for n in all_class_names if target_norm in _normalize(n) or _normalize(n) in target_norm]
            filtered_count = len(filtered_names)
        else:
            # No specific part → count every detection (backward-compatible)
            filtered_count = len(all_class_names)

        job_success = False
        message     = ""

        if "counting" in job_lower:
            if expected_count is None:
                message = "Counting job failed: Missing expected_count parameter."
            else:
                job_success = (filtered_count == expected_count)
                message = (
                    f"{label} count verified: {filtered_count} found (Target: {expected_count})."
                    if job_success
                    else f"{label} count mismatch: {filtered_count} found, expected {expected_count}."
                )

        elif "absence" in job_lower:
            job_success = (filtered_count == 0)
            message = (
                f"{label} - Absent (as expected)."
                if job_success
                else f"Job Failed: {label} is present but should be absent."
            )

        elif "presence" in job_lower:
            job_success = (filtered_count > 0)
            message = (
                f"{label} - Present."
                if job_success
                else f"Job Failed: {label} not detected in the image."
            )

        else:
            # Unknown job type — generic detection check
            job_success = (filtered_count > 0)
            message = (
                f"{label} detected."
                if job_success
                else f"Job Failed: {label} not detected."
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
