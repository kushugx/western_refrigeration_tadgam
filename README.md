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

## 📸 Usage

1. **Dashboard**: View overall inspection statistics and recent activity.
2. **Start Inspection**: select a Master file, follow the single-pane guide to capture photos of refrigeration parts.
3. **ML Verdict**: The system automatically analyzes the capture and provides a Pass/Fail verdict.
4. **Reports**: Access historical data, download PDF summaries, or perform manual overrides if necessary.

---

## 🛡️ License

Proprietary © 2026 Western Refrigeration.
Powered by **UGX.AI**.
