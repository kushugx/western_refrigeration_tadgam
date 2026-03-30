# Western Refrigeration Frontend

This directory contains the React + Vite frontend for the **Western Refrigeration Quality Inspection System**.

## 🚀 Tech Stack
- **React 18**
- **Vite** (for fast development and build times)
- **Tailwind CSS** (for styling and responsive design)
- **React Router DOM** (for client-side navigation)
- **TypeScript** (for robust type safety)

## 🧠 System Logic & Workflow (Frontend)

The frontend plays a critical role in orchestrating the inspection process and providing a seamless user experience.

- **Authentication & Authorization**: Utilizes JWT tokens stored in `localStorage` to manage sessions and restrict access. The application dynamically adjusts navigation and action buttons (e.g., hiding the generic "Manage Masters" from operators).
- **Inspection Flow**: The `InspectionPage` component guides the operator through a sequential checklist of parts defined in the active "Master File". 
- **Media Sync**: The application uses media synchronization to fetch high-resolution photos captured directly from the GoPro straight into the active inspection workflow.
- **ML Integration**: Upon capturing an image, the frontend sends the HTTP POST request to the backend's `/api/analyze` endpoint. It gracefully handles the asynchronous loading state and transitions the UI to display the annotated result (bounding boxes) and the final verdict.
- **Data Management**: Provides dedicated UI sections to view historical reports, initiate PDF downloads, manually override ML verdicts (for QA supervisors), and archive older data.

## 🌟 Recent Enhancements

- **Interactive Data Management & Smart Archiving**:
  - Transitioned from static ZIP backups to a fully searchable, Base64 JSON payload system. This intelligently ingests full-resolution camera captures into a structured JSON string intended for automatic Customer Database synchronization (via a pre-configured API webhook).
  - Added a dynamic GoPro SD Card storage utilization pie chart showing true Used/Free space natively reading from the camera.
  - Implemented a 90% capacity early-warning system and a one-click "Clear SD Card" hardware-level formatting utility right from the web interface.
- **Dashboard Telemetry**:
  - Brought direct network camera telemetry to the main Dashboard via a new `CameraWidget`. It seamlessly monitors real-time active BLE connection states, Media Sync pipelines, and internal GoPro Battery levels.
  - Included context-aware low-voltage UI warnings when the camera battery slips below 30% and 15%.
- **Inspection Workflow Streamlining**:
  - Eliminated the redundant software "Capture Photo" button, completely handing off capture triggers to the native GoPro physical hardware shutter.
  - Introduced a context-aware `Skip Part` interface allowing operators to deliberately skip un-testable inspection items (e.g., physically missing trays), auto-logging the exception and allowing them to effortlessly proceed or securely trigger a "Skip & Finish."
- **Quality of Life**:
  - Added seamless `Enter` key event tracking for rapid Login flow.

## 🛠️ Available Scripts

In the project directory, you can run:

### `npm install`
Installs all necessary node module dependencies. Must be run before starting the project for the first time.

### `npm run dev`
Runs the app in development mode using Vite.
Open [http://localhost:5173](http://localhost:5173) to view it in your browser.
The page will reload when you make changes.

### `npm run build`
Builds the app for production to the `dist` folder.
It correctly bundles React in production mode and optimizes the build for the best performance.

### `npm run lint`
Runs ESLint to find and optionally fix common stylistic and syntax issues in the TypeScript/TSX code.

## 📄 Global Configuration
For the complete project architecture spanning both the frontend and backend implementations, as well as overarching setup instructions, please refer to the [Root README](../README.md).
