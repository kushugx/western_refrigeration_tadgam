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

export default function DataManagementPage() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<StorageStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [archiving, setArchiving] = useState(false);
    const [daysThreshold, setDaysThreshold] = useState(30);

    const fetchStats = async () => {
        try {
            const res = await fetch("/api/maintenance/stats");
            if (res.ok) {
                const data = await res.json();
                setStats(data);
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

        if (!confirm(`Are you sure you want to archive and PERMANENTLY delete ${count} reports older than ${daysThreshold} days? A ZIP backup will be generated.`)) {
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

    return (
        <div className="flex-1 px-6 py-8 max-w-4xl mx-auto w-full">
                <div className="mb-6">
                    <nav className="text-sm font-medium text-gray-500 dark:text-neutral-400 flex items-center gap-2">
                        <span className="hover:text-western-green transition-colors cursor-pointer" onClick={() => navigate("/dashboard")}>Dashboard</span>
                        <span>›</span>
                        <span className="text-gray-800 dark:text-white">Data Management & Archiving</span>
                    </nav>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
                            Clean up primary storage by zipping and deleting old inspection records. Files will be packaged into a downloadable ZIP archive.
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
                                    Dump & Download Archive
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Important Note */}
                <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 flex gap-4">
                    <span className="text-xl">⚠️</span>
                    <div>
                        <p className="text-amber-800 dark:text-amber-400 font-bold text-sm">Caution: Irreversible Action</p>
                        <p className="text-amber-700 dark:text-amber-500/80 text-xs mt-1">
                            The archiving process will PERMANENTLY delete the reports and their associated camera captures from this server. 
                            Ensure you download and safely store the generated ZIP file.
                        </p>
                    </div>
                </div>
        </div>
    );
}
