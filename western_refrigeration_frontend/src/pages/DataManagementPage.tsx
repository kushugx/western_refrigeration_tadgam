import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "../components/Toast";

interface StorageStats {
    total_reports: number;
    total_captured_images: number;
    older_than_30: number;
    older_than_60: number;
    older_than_90: number;
}

interface GoProStorage {
    connected: boolean;
    total_bytes: number;
    used_bytes: number;
    remaining_bytes: number;
}

export default function DataManagementPage() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<StorageStats | null>(null);
    const [goproStorage, setGoproStorage] = useState<GoProStorage | null>(null);
    const [loading, setLoading] = useState(true);
    const [archiving, setArchiving] = useState(false);
    const [formatting, setFormatting] = useState(false);
    const [daysThreshold, setDaysThreshold] = useState(30);

    const fetchStats = async () => {
        try {
            const [resStats, resGopro] = await Promise.all([
                fetch("/api/maintenance/stats").catch(() => null),
                fetch("/gopro/storage").catch(() => null)
            ]);
            
            if (resStats?.ok) {
                const data = await resStats.json();
                setStats(data);
            }
            
            if (resGopro?.ok) {
                const gpData = await resGopro.json();
                setGoproStorage(gpData);
            }
        } catch (err) {
            console.error("Failed to fetch stats", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const handleArchive = async () => {
        const count = daysThreshold === 30 ? stats?.older_than_30 : 
                      daysThreshold === 60 ? stats?.older_than_60 : 
                      stats?.older_than_90;

        if (count === 0) {
            showToast("No data matches the selected threshold", "info");
            return;
        }

        if (!confirm(`Are you sure you want to archive and PERMANENTLY delete ${count} reports older than ${daysThreshold} days? A searchable JSON archive will be generated.`)) {
            return;
        }

        setArchiving(true);
        try {
            const res = await fetch("/api/maintenance/archive", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ days: daysThreshold })
            });

            if (res.ok) {
                const data = await res.json();
                showToast(data.message, "success");
                
                // Trigger download
                if (data.archive_file) {
                    window.open(`/api/maintenance/download/${data.archive_file}`, "_blank");
                }
                
                // Refresh stats
                fetchStats();
            } else {
                showToast("Archiving failed", "error");
            }
        } catch (err) {
            showToast("Connection error during archiving", "error");
        } finally {
            setArchiving(false);
        }
    };

    const handleFormatSD = async () => {
        if (!window.confirm("WARNING: This will permanently delete ALL videos and photos on the GoPro SD Card. This action cannot be undone.\n\nAre you absolutely sure you want to clear the SD card?")) {
            return;
        }

        setFormatting(true);
        try {
            const res = await fetch("/gopro/format-sd", { method: "POST" });
            const data = await res.json();
            if (data.success) {
                showToast(data.message || "SD Card successfully cleared", "success");
                await fetchStats();
            } else {
                showToast(data.detail || "Failed to clear SD card", "error");
            }
        } catch (err) {
            showToast("Network error while trying to clear SD card", "error");
        } finally {
            setFormatting(false);
        }
    };

    return (
        <div className="flex-1 px-6 py-8 max-w-6xl mx-auto w-full">
                <div className="mb-6">
                    <nav className="text-sm font-medium text-gray-500 dark:text-neutral-400 flex items-center gap-2">
                        <span className="hover:text-western-green transition-colors cursor-pointer" onClick={() => navigate("/dashboard")}>Dashboard</span>
                        <span>›</span>
                        <span className="text-gray-800 dark:text-white">Data Management & Archiving</span>
                    </nav>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Storage Stats Card */}
                    <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                            <span className="text-western-green">📊</span> Storage Overview
                        </h3>
                        {loading ? (
                            <div className="animate-pulse space-y-3">
                                <div className="h-4 bg-gray-100 dark:bg-neutral-800 rounded w-3/4" />
                                <div className="h-4 bg-gray-100 dark:bg-neutral-800 rounded w-1/2" />
                                <div className="h-4 bg-gray-100 dark:bg-neutral-800 rounded w-2/3" />
                            </div>
                        ) : stats ? (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center pb-2 border-b border-gray-50 dark:border-neutral-800">
                                    <span className="text-gray-500 dark:text-neutral-400">Total Reports</span>
                                    <span className="font-bold text-gray-800 dark:text-white">{stats.total_reports}</span>
                                </div>
                                <div className="flex justify-between items-center pb-2 border-b border-gray-50 dark:border-neutral-800">
                                    <span className="text-gray-500 dark:text-neutral-400">Total Images</span>
                                    <span className="font-bold text-gray-800 dark:text-white">{stats.total_captured_images}</span>
                                </div>
                                <div className="pt-2">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Age Distribution</p>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500 font-medium">Over 30 days</span>
                                            <span className="text-red-500 font-bold">{stats.older_than_30} reports</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500 font-medium">Over 60 days</span>
                                            <span className="text-red-600 font-bold">{stats.older_than_60} reports</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500 font-medium">Over 90 days</span>
                                            <span className="text-red-700 font-bold">{stats.older_than_90} reports</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-red-500">Failed to load stats.</p>
                        )}
                    </div>

                    {/* Archiving Actions Card */}
                    <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                            <span className="text-western-yellow">📦</span> Data Cleanup & Archive
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-neutral-400 mb-6">
                            Clean up primary storage by aggregating and deleting old records. Files and Base64 images will be packaged into a searchable JSON archive.
                        </p>

                        <div className="mb-6">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Retention Period</label>
                            <div className="flex gap-2">
                                {[30, 60, 90].map(d => (
                                    <button
                                        key={d}
                                        onClick={() => setDaysThreshold(d)}
                                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${
                                            daysThreshold === d 
                                            ? "bg-western-green text-white shadow-md shadow-emerald-900/10 scale-[1.02]" 
                                            : "bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400 hover:bg-gray-200 dark:hover:bg-neutral-700"
                                        }`}
                                    >
                                        {d} Days
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleArchive}
                            disabled={archiving || loading}
                            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                                archiving 
                                ? "bg-gray-200 cursor-not-allowed text-gray-400" 
                                : "bg-gradient-to-r from-western-green to-emerald-600 text-white hover:shadow-lg hover:shadow-emerald-900/20 active:scale-[0.98]"
                            }`}
                        >
                            {archiving ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Processing Archive...
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                    Dump JSON Archive & Download
                                </>
                            )}
                        </button>
                    </div>

                    {/* GoPro Storage Pie Chart Card */}
                    <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 flex flex-col items-center justify-center text-center">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2 w-full justify-start">
                            <span className="text-blue-500">📷</span> GoPro SD Card
                        </h3>
                        {loading ? (
                            <div className="animate-pulse w-32 h-32 bg-gray-100 dark:bg-neutral-800 rounded-full mt-4" />
                        ) : goproStorage?.connected && goproStorage.total_bytes > 0 ? (
                            <div className="flex flex-col items-center mt-4">
                                {/* Pie Chart UI */}
                                <div 
                                    className="w-36 h-36 rounded-full shadow-inner mb-6 relative flex items-center justify-center"
                                    style={{
                                        background: `conic-gradient(
                                            #10b981 0% ${(goproStorage.used_bytes / goproStorage.total_bytes) * 100}%, 
                                            #f3f4f6 ${(goproStorage.used_bytes / goproStorage.total_bytes) * 100}% 100%
                                        )`
                                    }}
                                >
                                    <div className="w-24 h-24 bg-white dark:bg-neutral-900 rounded-full absolute"></div>
                                    <span className="relative z-10 font-bold text-xl text-emerald-600 dark:text-emerald-400">
                                        {Math.round((goproStorage.used_bytes / goproStorage.total_bytes) * 100)}%
                                    </span>
                                </div>
                                <div className="flex gap-4 w-full justify-between text-sm px-2">
                                    <div className="flex flex-col items-center">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                                            <span className="text-gray-500 dark:text-neutral-400 font-medium text-xs uppercase tracking-wider">Used</span>
                                        </div>
                                        <span className="font-bold text-gray-800 dark:text-white">
                                            {(goproStorage.used_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <span className="w-3 h-3 rounded-full bg-gray-100 dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600"></span>
                                            <span className="text-gray-500 dark:text-neutral-400 font-medium text-xs uppercase tracking-wider">Free</span>
                                        </div>
                                        <span className="font-bold text-gray-800 dark:text-white">
                                            {(goproStorage.remaining_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB
                                        </span>
                                    </div>
                                </div>
                                {/* Warning and Clear Button */}
                                {((goproStorage.used_bytes / goproStorage.total_bytes) > 0.90) && (
                                    <div className="w-full mt-5 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg text-xs font-semibold text-center flex flex-col gap-1 items-center justify-center">
                                        <span>⚠️ SD Card Nearly Full</span>
                                        <span className="font-normal opacity-90">Please clear it to avoid capture issues.</span>
                                    </div>
                                )}
                                <button
                                    onClick={handleFormatSD}
                                    disabled={formatting}
                                    className="w-full mt-5 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 border border-red-200 dark:border-red-800/50 disabled:opacity-50"
                                >
                                    {formatting ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            Clearing SD...
                                        </span>
                                    ) : (
                                        "Clear SD Card"
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center py-6">
                                <span className="text-4xl mb-3 grayscale opacity-30">📷</span>
                                <p className="text-sm font-medium text-gray-400 dark:text-neutral-500">GoPro Offline</p>
                                <p className="text-xs text-gray-400 dark:text-neutral-500 mt-1 max-w-[200px]">Connect GoPro to view storage details.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Important Note */}
                <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 flex gap-4">
                    <span className="text-xl">⚠️</span>
                    <div>
                        <p className="text-amber-800 dark:text-amber-400 font-bold text-sm">Caution: Irreversible Action</p>
                        <p className="text-amber-700 dark:text-amber-500/80 text-xs mt-1">
                            The archiving process will PERMANENTLY delete the reports and their associated camera captures from this server. 
                            Ensure you download and safely store the generated JSON file.
                        </p>
                    </div>
                </div>
        </div>
    );
}
