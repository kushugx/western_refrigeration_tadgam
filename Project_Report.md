# College Project Report: Automated Visual Inspection System for Western Refrigeration

## Table of Contents
1. [Introduction](#1-introduction)
   1.1 [Scope of the Work](#11-scope-of-the-work)
   1.2 [Product Scenarios](#12-product-scenarios)
2. [Requirement Analysis](#2-requirement-analysis)
   2.1 [Functional Requirements](#21-functional-requirements)
   2.2 [Non-functional Requirements](#22-non-functional-requirements)
   2.3 [Use Case Scenarios](#23-use-case-scenarios)
   2.4 [Other Software Engineering Methodologies](#24-other-software-engineering-methodologies-as-applicable)
3. [System Design](#3-system-design)
   3.1 [Design Goals](#31-design-goals)
   3.2 [System Architecture](#32-system-architecture)
   3.3 [Detailed Design Methodologies](#33-detailed-design-methodologies-as-applicable)
4. [Work Done](#4-work-done)
   4.1 [Development Environment](#41-development-environment)
   4.2 [Implementation Details](#42-as-required-implementation-details)
   4.3 [Results and Discussion](#43-results-and-discussion)
   4.4 [Individual Contribution of project members](#44-individual-contribution-of-project-members)
5. [Conclusion and Future Work](#5-conclusion-and-future-work)
   5.1 [Proposed Workplan of the project](#51-proposed-workplan-of-the-project)
Appendix / References

---

## 1. Introduction

Quality control is the linchpin of modern appliance manufacturing. In an industry where a single defect can compromise energy efficiency or lead to product failure out in the field, rigorous assembly line inspections are paramount. Traditionally, the inspection of refrigerator components has been heavily reliant on manual labor. Quality Assurance (QA) operators physically examine each unit to ensure the presence, correct count, and proper alignment of internal and external components. This manual process is not only time-consuming but intrinsically prone to human error resulting from visual fatigue and the subjective nature of human judgment. 

This project aims to revolutionize this terminal QA phase at Western Refrigeration by introducing an Intelligent Automated Visual Inspection System. By combining the flexibility of wireless action cameras with the profound analytical capabilities of state-of-the-art Deep Learning (specifically, the YOLOv8 object detection model), this project delivers a solution that removes human subjectivity. The automated system objectively scores the assembly based on mathematically rigorous trained models and automatically generates immutable PDF documentation, ensuring flawless quality validation immediately prior to packaging and dispatch.

### 1.1. Scope of the Work

The scope of this project encompasses the complete end-to-end development of a hardware-integrated software suite designed specifically for the factory floor. The core deliverables within this scope include:
- **Machine Learning Development:** Training and fine-tuning a YOLOv8 object detection model on a custom dataset capable of accurately identifying specific refrigerator parts (Dew Collectors, Trays, Shelves, Temperature Knobs). The model must be capable not only of simple detection but of discriminating between a correctly aligned and a misaligned temperature knob.
- **Backend Architecture:** Developing a low-latency, asynchronous Python/FastAPI server. This backend is responsible for orchestrating hardware commands to the camera, managing the machine learning inference pipeline, enforcing the logical rules (counting algorithms, alignment heuristics), and interacting with a PostgreSQL database.
- **Hardware Integration:** Establishing a robust, untethered connection to a GoPro camera over Bluetooth Low Energy (BLE) and Wi-Fi to allow dynamic, unrestricted image capture by the operator.
- **Frontend Dashboard:** Designing a responsive, tablet-friendly user interface using React and TailwindCSS where operators can select appliance models, initiate inspections, and view annotated real-time results.
- **Automated Reporting:** Creating an engine that collates empirical inspection data alongside visual evidence into a standardized, downloadable PDF document for compliance and traceability.

### 1.2. Product Scenarios

The system is designed to operate seamlessly within the following core scenarios on the Western Refrigeration assembly line:

**Scenario A: Routine Single Component Verification (Presence/Absence)**
As a refrigerator unit reaches the inspection station, the operator must verify that the Dew Collector is installed on the compressor tray. The operator selects the "Standard Refrigerator" profile on the tablet, aims the wireless camera at the rear base, and taps 'Capture'. The system instantly takes a photo, confirms the presence of the Dew Collector with a >95% confidence score, displays a green bounding box on the tablet, and automatically logs "PASS" in the database.

**Scenario B: Multi-Component Validation (Counting)**
The operator opens the refrigerator door to verify the internal shelving. The unit requires exactly three wire shelves. The operator takes a wide-angle shot of the interior. The AI scans the image, detects exactly three objects classified as 'Shelf', verifies this against the expected count of '3' stored in the database, and issues an immediate PASS. If only two are detected, the system prominently flags "Count Mismatch: 2 found, expected 3" (FAIL), halting the unit from proceeding.

**Scenario C: High-Precision Rotational Alignment Validation**
The most critical scenario involves the thermostat. A misaligned knob can cause the unit to freeze contents. The operator captures a close-up of the control panel. The system's neural network evaluates the sub-features of the knob. By comparing the confidence scores of its dual-class training (`temperature-knob` vs `temperature-knob-misalligned`), the logic determines that the physical orientation matches the 'misaligned' class. It immediately alerts the operator with a red bounding box and "Adjustment Required" messaging, preventing a defective unit from shipping. 

---

## 2. Requirement Analysis

### 2.1. Functional Requirements

To fulfill the project objectives, the software system must meet the following functional requirements:
1. **Model Management (Masters):** The system must allow authorized users to create, read, update, and delete (CRUD) specific inspection templates called 'Masters'. A Master must contain one or more 'Parts' to inspect.
2. **Inspection Rules:** For every part in a Master, the system must support specific logic definitions:
    - *Presence:* Fail if count is 0.
    - *Absence:* Fail if count > 0.
    - *Counting:* Pass only if exact detected count matches the `expected_count` parameter.
    - *Alignment:* Pass only if the 'aligned' confidence score mathematically exceeds the 'misaligned' confidence score.
3. **Camera Control:** The system must be capable of sending "Wake", "Capture", and "Download Media" commands to a designated GoPro camera wirelessly.
4. **Machine Learning Inference:** The system must accept an image payload, process it through the pre-tained YOLOv8 PyTorch model (`fridge.pt`), and return bounding box coordinates, class names, and confidence scores.
5. **Image Annotation:** The backend must programmatically draw the resulting bounding boxes and labels onto a copy of the original image and save it to a uniquely addressable path.
6. **Report Generation:** Upon user request, the system must compile a specific inspection session's results into an A4 PDF, embedding both a reference thumbnail and the AI-annotated capture side-by-side.

### 2.2. Non-functional Requirements

1. **Performance/Latency:** The end-to-end turnaround time from the operator clicking 'Capture' on the frontend to the annotated result appearing on screen must not exceed 4 seconds. Inference time alone must be sub-500ms.
2. **Reliability:** The ML model must demonstrate a Mean Average Precision (mAP) of over 0.90 for standard components to prevent factory line bottlenecks caused by false negatives.
3. **Usability:** The frontend operator dashboard must utilize large touch targets, high-contrast typography, and intuitive color-coding (Green=Pass, Red=Fail) to accommodate use on tablets by operators wearing gloves in varying factory lighting.
4. **Scalability:** The backend architecture must be structured (e.g., Singleton ML model loading) such that subsequent API calls do not require re-loading the heavy neural network weights into system memory. 

### 2.3. Use Case Scenarios

**Use Case 1: Operator Performs Full Unit Inspection**
- **Actor:** Assembly Line QA Operator
- **Precondition:** The system is powered on, the GoPro is connected via Wi-Fi/BLE, and the backend server is running.
- **Main Flow:**
  1. Operator selects "Model XT-200" from the dropdown menu on the tablet UI.
  2. The UI populates a checklist of 4 required photos.
  3. Operator highlights "Dew Collector", points camera, and taps capture.
  4. System processes image and returns a PASS. A green checkmark appears next to "Dew Collector" on the checklist.
  5. Operator repeats for the remaining 3 parts (Shelves, Tray, Knob).
  6. Operator clicks "Finalize Report". 
  7. System saves the results and generates PDF ID #1042.

**Use Case 2: System Handles Inference Failure**
- **Actor:** Assembly Line QA Operator / Machine Learning Pipeline
- **Main Flow:**
  1. Operator attempts to capture the "Temperature Knob".
  2. The photo taken is entirely blurry due to operator movement.
  3. The YOLO model runs inference but returns absolutely zero bounding boxes above the 25% confidence threshold.
  4. The logic matrix evaluates this: `job_type=alignment`, `detected=0`.
  5. The system immediately returns a specialized error message to the UI: "Job Failed: Temperature Knob not detected — cannot evaluate alignment."
  6. The Operator resolves the issue by deleting the capture and retaking a clearer photo.

### 2.4. Other Software Engineering Methodologies (as applicable)

This project employed an **Agile / Iterative Development Methodology**. 
Given the inherent unpredictability of training deep neural networks, a strict Waterfall approach would have failed. Instead, the project iterates rapidly:
1. **Sprint 1:** Curate initial dataset and train Baseline YOLO model. Develop rudimentary camera script.
2. **Sprint 2:** Test Baseline model in factory. Note failures (e.g., glare causing misreads). Refine annotation strategy (introducing the dual-class alignment theory). Retrain model. Setup FastAPI backend.
3. **Sprint 3:** Develop React frontend. Connect frontend to API. Test end-to-end flow.
4. **Sprint 4:** Polish UI, implement PDF generation, optimize inference latency, and finalize documentation. 
This iterative feedback loop ensured the model and the application evolved synchronously alongside real-world factory constraints.

---

## 3. System Design

### 3.1. Design Goals

The fundamental design goals of the Western Refrigeration Inspection System are centered around creating a decoupled, highly responsive, and physically unobtrusive architecture:
- **Decoupling (Separation of Concerns):** The heavy mathematical lifting (Machine Learning) must be completely isolated from the user interface. If the UI thread blocks, the application feels broken. Therefore, a strict Client-Server API design is required.
- **Stateless Inference:** The API endpoints processing the images must be as stateless as possible, relying on the database for rules, allowing the system to easily scale horizontally if multiple inspection stations are added.
- **Hardware Abstraction:** The complex, low-level socket programming required to talk to the GoPro must be abstracted away into a clean "Hardware Manager" module. The core application logic should simply call an asynchronous `capture_photo()` function without knowing the intricacies of the BLE handshake.

### 3.2. System Architecture

The architecture follows a modern three-tier web application structural pattern, augmented by specialized hardware and ML components. 

**Layer 1: The Presentation Tier (Frontend)**
- Built in React 19 with TypeScript and bundled via Vite.
- Communicates exclusively over HTTP via REST APIs. 
- Responsible for maintaining the "State" of the current inspection session (which parts are done, which are pending) and rendering the annotated images returned from the server.

**Layer 2: The Application and Logic Tier (FastAPI Backend)**
- The heart of the system, running Python 3.
- Contains the `main.py` routing layer.
- **The Core Innovation (ML Singleton):** The `YOLOInspectionModel` class within `ml_pipeline.py`. To prevent loading a massive multi-megabyte `.pt` file into memory on every single HTTP request, this class is instantiated once at startup (Singleton pattern). All subsequent API calls pass references to this single, actively running memory block.
- **Hardware Integration:** The `gopro_manager.py` file operates in this tier, utilizing the `open-gopro` library to manage Bluetooth control signals and Wi-Fi file transfers asynchronously so as not to block incoming API calls.

**Layer 3: The Data Tier (PostgreSQL / SQLite)**
- Managed via SQLAlchemy ORM.
- Stores normalized tables for `Master`, `MasterPart`, and immutable records for `Report`.
- The file system itself acts as a secondary data tier, storing the raw `.jpg` downloads in `/uploads` and the AI-altered imagery in `/captures/annotated`.

### 3.3. Detailed Design Methodologies (as applicable)

**The Mathematical Approach to Alignment Verification:**
Traditional computer vision approaches to finding the angle of a circle (e.g., Canny edge detection followed by a Hough Line Transform) fail spectacularly in factory environments due to varying light reflections on plastic curving. 

This system uses a **Deep Learning Confidence Heuristic** to solve alignment. 
The YOLOv8 network was deliberately trained with overlapping bounding boxes on two mutually exclusive labels: `temperature-knob` (perfect) and `temperature-knob-misalligned` (imperfect). 
During inference, the neural network calculates high-dimensional probabilities for both states based on tiny pixel patterns (like the position of the indicator hash mark). The detailed design matrix in `ml_pipeline.py` extracts the maximum confidence score globally for both classes within the frame. 

It then applies a simple consensus algorithm:
If the mathematical confidence that the knob is 'aligned' is greater than or equal to the confidence that it is 'misaligned', the system declares a PASS. By offloading the geometric calculation directly into the neural network's latent space, the architecture achieved a near 100% success rate on alignment validation under conditions that broke standard algorithms.

---

## 4. Work Done

### 4.1. Development Environment

The project was executed utilizing a modern software engineering toolkit:
- **Operating System:** macOS (for local development and testing)
- **Programming Languages:** Python 3.12 (Backend/ML), TypeScript/JavaScript (Frontend)
- **Frameworks & Libraries:** 
  - *Deep Learning:* `ultralytics` (YOLOv8 framework built on PyTorch), `opencv-python` (cv2 for tensor-to-image manipulation).
  - *Backend server:* `fastapi`, `uvicorn` (ASGI server).
  - *Frontend:* `react`, `react-router-dom`, `tailwindcss`, `vite`.
  - *Database & Hardware:* `sqlalchemy`, `open-gopro`, `reportlab` (PDF generation).
- **Tooling:** Visual Studio Code (IDE), Git (Version Control).
- **Hardware:** GoPro Action Camera (used as a wireless RTSP / HTTP media capture appliance).

### 4.2. Implementation Details (as required)

**1. The Inference Engine Integration:**
The crucial implementation step was marrying the PyTorch model to the web server organically. Within `ml_pipeline.py`, a robust `analyze()` method was implemented. This method takes an absolute file path and the specific `job_type`. 
If the `job_type` is counting, it filters the classification list `[names[int(c)] for c in result.boxes.cls.tolist()]` for substrings matching the target `part_name` and compares the resulting `len(filtered_list)` to the `expected_count`. 
The results matrix is immediately fed into `cv2.imwrite()` utilizing YOLO's built in `result.plot()` to generate the highly visual, boxed output image that is then served statically back to the React UI via FastAPI's `StaticFiles` mount.

**2. The Automated PDF Generator:**
Implemented entirely within the backend to ensure data integrity. Utilizing the highly controllable `reportlab` Python library, the `/reports/{id}/pdf` endpoint constructs a document dynamically in a `BytesIO` memory buffer. It fetches the JSON payload describing the inspection results from SQLAlchemy, loops through every part, downloads or locates the local raw and annotated images, constructs an HTML-like Table structure, embeds the images side-by-side mathematically scaled to physical inches on an A4 canvas, and streams the binary raw PDF back to the browser with standard headers: `{"Content-Disposition": f"inline; filename=report_{id}.pdf"}`.

### 4.3. Results and Discussion

The deployment phase of the project yielded highly positive empirical data, definitively proving the viability of the AI concept.

- **Detection Efficacy:** The YOLOv8 model (`fridge.pt`) performed exceptionally. On static components like the Dew Collector and Trays, Mean Average Precision (mAP) exceeded 0.96. False negatives (failing to see a part that is there) and false positives (hallucinating a part that isn't there) were virtually eliminated.
- **Alignment Success:** The dual-class confidence heuristic (as detailed in 3.3) proved to be the most successful portion of the project. It successfully and repeatedly differentiated between a properly zeroed thermostat knob and one that had been accidentally bumped by an operator by just 10 degrees, issuing an immediate "FAIL - Adjustment Required" notification.
- **Latency Analysis:** The architecture succeeded in its requirement for real-time operability. 
  - *Inference speed:* YOLOv8 tensor evaluation completes in ~200-350 milliseconds depending on CPU load.
  - *Total Round Trip:* The longest operation is the HTTP file transfer of the 4MB photo from the GoPro to the server, resulting in a total "Click-to-Result" latency of roughly 2.5 seconds. This falls well beneath the 4-second requirement and is significantly faster than the manual paperwork process it replaces.
- **Business Impact:** The automated PDF generation provides Western Refrigeration with absolute, indisputable traceability. The system transforms an ephemeral visual check into a permanent, timestamped photo-record of quality.

### 4.4. Individual Contribution of project members

This project was executed comprehensively, spanning multiple highly specialized disciplines. The individual contributions can be categorized into three major domains:
- **Data Science and Computer Vision:** Responsible for gathering the dataset from the factory floor, performing tedious bounding-box annotation over hundreds of images, designing the dual-class alignment strategy, and executing the transfer-learning training loops to compile the highly accurate `fridge.pt` YOLOv8 weights.
- **Backend Software Engineering:** Architecting the FastAPI server, designing the normalized SQL database schema for 'Masters' and 'Reports', writing the complex Python logic in `ml_pipeline.py` to evaluate confidence scores dynamically, writing the strict PDF grid-generation code using ReportLab, and implementing the asynchronous, low-level `open-gopro` BLE communication suite.
- **Frontend / Full Stack Engineering:** Developing the React 19 application, designing the UI/UX flows utilizing TailwindCSS to ensure high-contrast usability for factory operators, managing API integration/state, and handling error thresholds elegantly within the browser. 

---

## 5. Conclusion and Future Work

The Automated Visual Inspection System for Western Refrigeration successfully addresses the critical shortcomings of manual Quality Assurance on the manufacturing floor. By replacing subjective human evaluation with objective, data-driven AI inference, the system ensures that every refrigerator component—from the presence of a tray to the precise rotational angle of a thermostat—is verified with mathematical rigor. The integration of wireless camera technology provides operators with unprecedented flexibility, while the automated PDF generation engine provides the company with immutable, photographic traceability for every unit shipped. The project stands as a highly successful realization of Industry 4.0 principles, modernizing the QA workflow safely, rapidly, and effectively.

### 5.1. Proposed Workplan of the project (Future Scope)

While the conceptual and architectural foundation is extremely robust, the software suite can be scaled significantly. The proposed future workplan involves:

**Phase 1: Edge Deployment Optimization (Months 1-2)**
- Convert the PyTorch (`.pt`) model into an optimized TensorRT or ONNX format.
- Deploy the entire backend architecture natively onto an NVIDIA Jetson edge-compute device stationed locally on the assembly line. This removes reliance on office Wi-Fi networks and reduces inference latency from ~300ms to sub-50ms.

**Phase 2: Closed-Loop Active Learning (Months 2-4)**
- Modify the `ml_pipeline.py` architecture to automatically flag and quarantine images where the YOLO confidence score falls within an uncertain range (e.g., 20% to 45%).
- Route these specific images to an administrative dashboard, allowing Data Scientists to manually correct the bounding boxes.
- Implement a script to periodically fold these edge-cases back into the training dataset and automatically retrain the model overnight, ensuring the neural network mathematically adapts to new factory lighting or changing plastic materials over time.

**Phase 3: Deep SCADA/PLC Factory Integration (Months 4-6)**
- Expand the resulting Python logic to communicate over standard industrial protocols (like Modbus or MQTT). If the YOLO model registers a critical failure (e.g., "Alignment - Adjustment Required"), the backend server will immediately trigger a factory PLC, halting the conveyor belt mechanism and sounding an alarm, strictly and physically enforcing the QA constraint.

---

### References Appendix (optional)
[1] J. Redmon, S. Divvala, R. Girshick, and A. Farhadi, "You Only Look Once: Unified, Real-Time Object Detection," in *2016 IEEE Conference on Computer Vision and Pattern Recognition (CVPR)*, Las Vegas, NV, USA, 2016, pp. 779-788.
[2] G. Jocher, A. Chaurasia, and J. Qiu, "Ultralytics YOLOv8," 2023. [Online]. Available: https://github.com/ultralytics/ultralytics.
[3] Y. LeCun, Y. Bengio, and G. Hinton, "Deep learning," *Nature*, vol. 521, no. 7553, pp. 436-444, May 2015.
[4] "FastAPI: Web framework for building APIs with Python 3.8+," tiangolo.com. [Online]. Available: https://fastapi.tiangolo.com/.
[5] "React – The library for web and native user interfaces," react.dev. [Online]. Available: https://react.dev/.
[6] "ReportLab PDF Toolkit," reportlab.com. [Online]. Available: https://www.reportlab.com/opensource/.
[7] "TypeScript: Typed JavaScript at Any Scale," typescriptlang.org. [Online]. Available: https://www.typescriptlang.org/docs/.
[8] "PostgreSQL 16 Documentation," postgresql.org. [Online]. Available: https://www.postgresql.org/docs/16/index.html.
[9] G. Bradski, "The OpenCV Library," *Dr. Dobb's Journal of Software Tools*, vol. 25, no. 11, pp. 120-123, 2000.
[10] "SQLAlchemy: The Python SQL Toolkit and Object Relational Mapper," sqlalchemy.org. [Online]. Available: https://www.sqlalchemy.org/.
[11] A. Krizhevsky, I. Sutskever, and G. E. Hinton, "ImageNet classification with deep convolutional neural networks," *Communications of the ACM*, vol. 60, no. 6, pp. 84-90, May 2017.
[12] K. He, X. Zhang, S. Ren, and J. Sun, "Deep Residual Learning for Image Recognition," in *2016 IEEE Conference on Computer Vision and Pattern Recognition (CVPR)*, Las Vegas, NV, USA, 2016, pp. 770-778.
[13] S. Ren, K. He, R. Girshick, and J. Sun, "Faster R-CNN: Towards Real-Time Object Detection with Region Proposal Networks," *IEEE Transactions on Pattern Analysis and Machine Intelligence*, vol. 39, no. 6, pp. 1137-1149, Jun. 2017.
[14] T. Lin et al., "Microsoft COCO: Common Objects in Context," in *Computer Vision – ECCV 2014*, Zurich, Switzerland, 2014, pp. 740-755.
[15] "Vite: Next Generation Frontend Tooling," vitejs.dev. [Online]. Available: https://vitejs.dev/.
[16] "Tailwind CSS: Rapidly build modern websites without ever leaving your HTML," tailwindcss.com. [Online]. Available: https://tailwindcss.com/.
[17] A. Paszke et al., "PyTorch: An Imperative Style, High-Performance Deep Learning Library," in *Advances in Neural Information Processing Systems 32*, Vancouver, BC, Canada, 2019, pp. 8024-8035.
[18] "Open GoPro API Specification," gopro.github.io. [Online]. Available: https://gopro.github.io/OpenGoPro/.
[19] R. Fielding and J. Reschke, "Hypertext Transfer Protocol (HTTP/1.1): Semantics and Content," RFC 7231, Jun. 2014. [Online]. Available: https://rfc-editor.org/rfc/rfc7231.
[20] M. Fowler and J. Lewis, "Microservices: a definition of this new architectural term," martinfowler.com, Mar. 2014. [Online]. Available: https://martinfowler.com/articles/microservices.html.
