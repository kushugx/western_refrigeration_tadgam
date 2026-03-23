import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { showToast } from "../components/Toast";

interface MasterPart {
  id: number;
  part_name: string;
  job_type: string;
  expected_count?: number | null;
  image_url?: string | null;
}

interface Master {
  id: number;
  name: string;
  parts: MasterPart[];
}

export default function InspectionPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const master: Master | undefined = location.state?.master;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const lastSeenCaptureRef = useRef<string | null>(null);
  const [partCaptures, setPartCaptures] = useState<Record<number, string>>({});
  const [partMlResults, setPartMlResults] = useState<Record<number, { status: string, message?: string, is_overridden?: boolean, original_status?: string, original_message?: string }>>({});
  const [generatingReport, setGeneratingReport] = useState(false);
  const [mlResult, setMlResult] = useState<{ status: 'idle' | 'analyzing' | 'success' | 'fail', annotatedUrl?: string, message?: string, isOverridden?: boolean, originalStatus?: string, originalMessage?: string }>({ status: 'idle' });

  // Run ML Analysis when a new image is captured
  useEffect(() => {
    if (!capturedImage) {
      setMlResult({ status: 'idle' });
      return;
    }

    const runAnalysis = async () => {
      setMlResult({ status: 'analyzing', message: 'Running YOLOv8...' });
      try {
        const payload = {
          image_url: capturedImage.split('?')[0], // strip timestamp
          job_type: master?.parts[currentIndex].job_type || 'presence',
          expected_count: master?.parts[currentIndex].expected_count,
          part_name: master?.parts[currentIndex].part_name  // enables part-specific detection filtering
        };

        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const data = await res.json();
          setMlResult({
            status: data.success ? 'success' : 'fail',
            annotatedUrl: data.annotated_url ? `${data.annotated_url}?t=${Date.now()}` : undefined,
            message: data.message
          });
        } else {
          setMlResult({ status: 'fail', message: 'ML Analysis connection failed' });
        }
      } catch (err) {
        setMlResult({ status: 'fail', message: 'Analysis server unreachable' });
      }
    };

    runAnalysis();
  }, [capturedImage, currentIndex, master]);



  // Poll for GoPro shutter-button captures (media sync)
  useEffect(() => {
    if (capturedImage) return;

    let active = true;

    const pollCapture = async () => {
      if (!active) return;
      try {
        const res = await fetch("/gopro/latest-capture");
        if (!res.ok) throw new Error("No photo found");
        const data = await res.json();
        if (data.image_url && data.image_url !== lastSeenCaptureRef.current) {
          lastSeenCaptureRef.current = data.image_url;
          setCapturedImage(`${data.image_url}?t=${Date.now()}`);
        }
      } catch { /* ignore */ }
    };

    const interval = setInterval(pollCapture, 2000);
    pollCapture();

    return () => { active = false; clearInterval(interval); };
  }, [capturedImage, currentIndex]);

  if (!master) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="bg-white dark:bg-neutral-800 p-8 rounded-xl shadow-lg border border-gray-100 dark:border-neutral-800 text-center">
            <p className="text-xl text-gray-800 dark:text-neutral-200 mb-6 font-medium">No master loaded. Please go back.</p>
            <button
              onClick={() => navigate("/test")}
              className="px-6 py-3 bg-western-green text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
            >
              Go to Start Quality Test
            </button>
          </div>
        </div>
      );
  }

  const currentPart = master.parts[currentIndex];

  const handleCapture = async () => {
    try {
      setCapturing(true);
      const res = await fetch("http://localhost:8001/capture_photo", {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        showToast(data.detail || "Failed to capture photo", "error");
        return;
      }

      const data = await res.json();
      setCapturedImage(`http://localhost:8001${data.image_url}`);
    } catch (error) {
      console.error(error);
      showToast("Failed to capture photo. Is the GoPro stream server running?", "error");
    } finally {
      setCapturing(false);
    }
  };

  const handleOverride = () => {
    if (mlResult.status === 'idle' || mlResult.status === 'analyzing') return;

    const newStatus = mlResult.status === 'success' ? 'fail' : 'success';
    setMlResult(prev => ({
      ...prev,
      isOverridden: true,
      originalStatus: prev.originalStatus || prev.status,
      originalMessage: prev.originalMessage || prev.message,
      status: newStatus,
      message: `Manual Override: Marked as ${newStatus.toUpperCase()}`
    }));
    showToast(`Verdict overridden to ${newStatus.toUpperCase()}`, "info");
  };

  const handleNext = () => {
    // Save capture for current part
    if (capturedImage) {
      setPartCaptures(prev => ({ ...prev, [currentIndex]: mlResult.annotatedUrl || capturedImage }));
      setPartMlResults(prev => ({
        ...prev,
        [currentIndex]: {
          status: mlResult.status,
          message: mlResult.message,
          is_overridden: mlResult.isOverridden,
          original_status: mlResult.originalStatus,
          original_message: mlResult.originalMessage
        }
      }));
    }
    setCapturedImage(null);
    setMlResult({ status: 'idle' });
    if (currentIndex < master.parts.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleGenerateReport = async () => {
    // Save last part capture
    const allCaptures = { ...partCaptures };
    const allMlResults = { ...partMlResults };

    if (capturedImage) {
      allCaptures[currentIndex] = mlResult.annotatedUrl || capturedImage;
      allMlResults[currentIndex] = { status: mlResult.status, message: mlResult.message };
    }

    const partsData = master.parts.map((part, idx) => ({
      part_name: part.part_name,
      job_type: part.job_type,
      expected_count: part.expected_count || null,
      captured_image: allCaptures[idx] || null,
      reference_image: part.image_url || null,
      ml_status: allMlResults[idx]?.status || 'idle',
      ml_message: allMlResults[idx]?.message || 'No ML analysis performed',
      is_overridden: allMlResults[idx]?.is_overridden || false,
      original_ml_status: allMlResults[idx]?.original_status,
      original_ml_message: allMlResults[idx]?.original_message
    }));

    setGeneratingReport(true);
    try {
      const res = await fetch("/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          master_name: master.name,
          operator: localStorage.getItem("username") || "unknown",
          parts: partsData,
        }),
      });
      if (res.ok) {
        navigate("/reports");
      } else {
        showToast("Failed to generate report", "error");
      }
    } catch {
      showToast("Failed to connect to server", "error");
    } finally {
      setGeneratingReport(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (capturedImage) {
          if (currentIndex < master.parts.length - 1) handleNext();
        } else if (!capturing) {
          handleCapture();
        }
      }
      if (e.key === "Escape" && capturedImage) {
        setCapturedImage(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [capturedImage, capturing, currentIndex, master.parts.length]);

  return (
    <div className="flex-1 flex flex-col">
      {/* Top Info Bar (Simplified) */}
      <div className="flex justify-end p-4 bg-white dark:bg-neutral-900 shadow-sm border-b border-gray-100 dark:border-neutral-800">
        <span className="text-sm font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full dark:bg-neutral-800 dark:text-neutral-400">
          Part {currentIndex + 1} of {master.parts.length}
        </span>
      </div>

      {/* Current Part Details Header */}
      <div className="bg-white dark:bg-neutral-900 py-3 shadow-sm text-center border-b border-gray-100 dark:border-neutral-800 z-10">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">
          {currentPart.part_name} <span className="text-gray-400 font-normal ml-2">| {currentPart.job_type}</span>
          {currentPart.job_type === "counting" && currentPart.expected_count
            ? <span className="text-western-green dark:text-emerald-400 ml-2">(Target: {currentPart.expected_count})</span>
            : ""}
        </h2>
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-3 bg-white dark:bg-neutral-900 border-b border-gray-100 dark:border-neutral-800">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <div className="flex gap-1.5">
            {master.parts.map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${i < currentIndex ? "bg-western-green scale-100" :
                  i === currentIndex ? "bg-western-yellow scale-110 progress-active" :
                    "bg-gray-300 dark:bg-neutral-700 scale-90"
                  }`}
              />
            ))}
          </div>
          <div className="flex-1 h-2 bg-gray-200 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-western-green rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((currentIndex + (capturedImage ? 1 : 0)) / master.parts.length) * 100}%` }}
            />
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-neutral-400 min-w-[3rem] text-right">
            {Math.round(((currentIndex + (capturedImage ? 1 : 0)) / master.parts.length) * 100)}%
          </span>
        </div>
        <p className="text-center text-xs text-gray-400 dark:text-neutral-500 mt-1.5">
          Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-neutral-700 rounded text-[10px] font-mono">Enter</kbd> to capture/next · <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-neutral-700 rounded text-[10px] font-mono">Esc</kbd> to retake
        </p>
      </div>

      {/* Central View Area */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center transition-all duration-300">
          {capturedImage ? (
            <>
              <div className="mb-6 font-medium flex items-center justify-center space-x-2 text-lg">
                {mlResult.status === 'analyzing' && (
                  <span className="text-yellow-600 dark:text-yellow-400">
                    <svg className="animate-spin h-6 w-6 inline mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    {mlResult.message}
                  </span>
                )}
                {mlResult.status === 'success' && (
                  <span className="text-green-600 dark:text-green-400 font-bold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                    PASS: {mlResult.message}
                  </span>
                )}
                {mlResult.status === 'fail' && (
                  <span className="text-red-600 dark:text-red-400 font-bold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                    FAIL: {mlResult.message}
                  </span>
                )}
                {mlResult.status === 'idle' && (
                  <span className="text-gray-500">Image Captured</span>
                )}
                {mlResult.isOverridden && (
                  <span className="ml-3 px-2.5 py-1 bg-western-yellow/20 text-yellow-700 dark:text-western-yellow text-[11px] font-bold uppercase tracking-wider rounded border border-western-yellow/30">
                    Overridden
                  </span>
                )}
              </div>
              <img
                src={mlResult.annotatedUrl || capturedImage}
                alt="Captured"
                className={`w-[720px] h-[480px] bg-gray-100 dark:bg-neutral-800 rounded-xl object-contain border-4 transition-colors duration-300 shadow-sm ${mlResult.status === 'analyzing' ? 'border-yellow-400 animate-pulse outline outline-4 outline-yellow-400/30' :
                  mlResult.status === 'success' ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]' :
                    mlResult.status === 'fail' ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]' :
                      'border-gray-200 dark:border-neutral-700'
                  }`}
              />
            </>
          ) : (
            <>
              <div className="text-gray-500 dark:text-neutral-400 mb-6 font-semibold text-lg uppercase tracking-wider">
                Ideal Reference Image
              </div>
              {currentPart.image_url ? (
                <img
                  src={currentPart.image_url}
                  alt={currentPart.part_name}
                  className="w-[720px] h-[480px] bg-gray-50 dark:bg-neutral-800 rounded-xl object-contain shadow-sm border border-gray-200 dark:border-neutral-700"
                />
              ) : (
                <div className="w-[720px] h-[480px] bg-gray-50 dark:bg-neutral-800/50 border-2 border-dashed border-gray-300 dark:border-neutral-700 rounded-xl flex items-center justify-center text-gray-500 dark:text-neutral-500 text-lg">
                  <div className="flex flex-col items-center space-y-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-40"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    <span className="font-medium">No reference image provided</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="p-4 flex justify-center space-x-4">
        {capturedImage ? (
          <>
            <button
              onClick={() => setCapturedImage(null)}
              className="px-6 py-3 rounded-lg border-2 border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
            >
              ↻ Retake
            </button>
            {(mlResult.status === 'success' || mlResult.status === 'fail') && (
              <button
                onClick={handleOverride}
                className="px-6 py-3 rounded-lg border-2 border-western-yellow text-yellow-700 dark:text-western-yellow hover:bg-western-yellow/10 transition-colors font-medium flex items-center gap-2"
                title={mlResult.status === 'success' ? "Force Fail" : "Force Pass"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                Override
              </button>
            )}
            {currentIndex < master.parts.length - 1 ? (
              <button
                onClick={handleNext}
                className="px-8 py-3 bg-western-green text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
              >
                Next Part →
              </button>
            ) : (
              <button
                onClick={handleGenerateReport}
                disabled={generatingReport}
                className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
              >
                {generatingReport ? "Generating..." : "Generate Report 📄"}
              </button>
            )}
          </>
        ) : (
          <button
            onClick={handleCapture}
            disabled={capturing}
            className="px-8 py-3 bg-western-green text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors font-medium flex items-center space-x-2 shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
            <span>{capturing ? "Capturing..." : "Capture Photo"}</span>
          </button>
        )}
      </div>
    </div>
  );
}