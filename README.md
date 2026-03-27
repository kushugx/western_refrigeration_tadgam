# Western Refrigeration - Quality Inspection System

A modern, high-performance quality inspection platform built for **Western Refrigeration**. This system integrates live **GoPro** camera feeds with **YOLOv8** machine learning models to automate part presence verification and counting during the manufacturing process.

---

## 🚀 Features

- **Automated ML Inspection**: Real-time part detection and counting using YOLOv8.
- **GoPro Integration**: Custom stream server for high-resolution image capture and synchronization.
- **Global Navigation**: Sleek, retractable sidebar and centralized layout for seamless multi-page workflow.
- **User-Specific Scoping**: Secure report visibility where operators only see their own inspections while admins maintain global oversight.
- **Data Management**: Advanced archiving and maintenance tools to manage historical inspection data.
- **Premium UI/UX**: Corporate-branded design with support for both Light and Dark modes.

---

## 🛠️ Project Structure

```text
western_refirgeration/
├── western_refrigeration_backend/   # FastAPI Server + ML Models + GoPro Client
└── western_refrigeration_frontend/  # React + Vite + Tailwind CSS Web App
```

---

## ⚙️ Setup & Installation

### Backend

1. **Prerequisites**: Python 3.10+
2. **Installation**:
   ```bash
   cd western_refrigeration_backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. **Configuration**:
   - Ensure a `.env` file exists with your `DATABASE_URL` and `SECRET_KEY`.
4. **Run Server**:
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend

1. **Prerequisites**: Node.js 18+
2. **Installation**:
   ```bash
   cd western_refrigeration_frontend
   npm install
   ```
3. **Run Dev Server**:
   ```bash
   npm run dev
   ```

---

---

## 🧠 System Logic & Workflow

The system is designed to streamline the quality assurance process on the manufacturing floor.

### User Workflow
1. **Master File Creation (Admin)**: An administrator creates a "Master File" for a specific refrigerator model, detailing the sequence of parts to be checked (e.g., Dew Collector, Shelf, Tray), their expected quantities, and uploading reference images.
2. **Camera Setup (Operator)**: The operator pairs the system with a GoPro camera, establishing a local network connection for live video streaming.
3. **Inspection Process (Operator)**:
   - The operator selects a Master File to begin a new inspection.
   - For each part in the sequence, the operator views the live GoPro feed alongside the ideal reference image.
   - The operator captures a high-resolution photo.
4. **Automated Analysis**: The captured photo is instantly sent to the backend. The YOLOv8 model analyzes the image to detect the specific part and count instances.
5. **Verdict & Override**: The system returns an automated **Pass** or **Fail** (with an annotated image showing bounding boxes). Supervisors can manually **Override** the result if necessary.
6. **Reporting**: Upon completing all parts for a unit, the system generates a permanent record and a downloadable PDF report.

### Technical Architecture
- **Frontend (React + Vite)**: A responsive, corporate-styled SPA. It orchestrates the inspection state machine, streams MJPEG video directly from the GoPro server, and handles user authentication and report rendering.
- **Backend (FastAPI)**: Serves as the core API framework. Manages the SQLite database operations (via SQLAlchemy) for Users, Masters, and Reports. Provides secure JWT authentication.
- **Machine Learning (Ultralytics YOLOv8)**: Reides in `ml_pipeline.py`. It loads a custom-trained `.pt` model file. Given an image and expected parameters, it performs inference, filters confidence thresholds, draws bounding boxes, and executes business logic (e.g., presence check vs. exact counting).
- **GoPro Stream Server**: A standalone script that receives the raw UDP video stream from the GoPro, decodes it, and rebroadcasts it as a low-latency HTTP MJPEG stream for the frontend UI.

---

## 📸 Usage

1. **Dashboard**: View overall inspection statistics and recent activity.
2. **Start Inspection**: Select a Master file, follow the single-pane guide to capture photos of refrigeration parts.
3. **ML Verdict**: The system automatically analyzes the capture and provides a Pass/Fail verdict.
4. **Reports**: Access historical data, download PDF summaries, or perform manual overrides if necessary.

---

## 🛡️ License

Proprietary © 2026 Western Refrigeration.
Powered by **UGX.AI**.
