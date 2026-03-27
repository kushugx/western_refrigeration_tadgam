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
- **Real-Time Video Streaming**: The `CameraWidget` and `InspectionPage` connect to the backend's local GoPro server (`http://localhost:8001`) to receive and display an MJPEG stream without any noticeable lag.
- **ML Integration**: Upon capturing an image, the frontend sends the HTTP POST request to the backend's `/api/analyze` endpoint. It gracefully handles the asynchronous loading state and transitions the UI to display the annotated result (bounding boxes) and the final verdict.
- **Data Management**: Provides dedicated UI sections to view historical reports, initiate PDF downloads, manually override ML verdicts (for QA supervisors), and archive older data.

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
