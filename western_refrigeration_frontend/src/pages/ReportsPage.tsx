import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "../components/Toast";

interface ReportSummary {
    id: number;
    master_name: string;
    operator: string;
    created_at: string;
    parts_count: number;
    status: "PASS" | "FAIL" | "PARTIAL";
}

interface ReportDetail {
    id: number;
    master_name: string;
    operator: string;
    created_at: string;
    parts: {
        part_name: string;
        job_type: string;
        captured_image?: string | null;
        reference_image?: string | null;
        ml_status: string;
        ml_message?: string;
        is_overridden?: boolean;
        original_ml_status?: string;
        original_ml_message?: string;
    }[];
}

const API = "";

export default function ReportsPage() {
    const navigate = useNavigate();
    const [reports, setReports] = useState<ReportSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [detail, setDetail] = useState<ReportDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const role = localStorage.getItem("role") || "operator";
    const username = localStorage.getItem("username") || "User";

    const fetchReports = async () => {
        try {
            const res = await fetch(`${API}/reports?role=${role}&username=${username}`);
            const data = await res.json();
            setReports(data);
        } catch {
            console.error("Failed to load reports");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReports(); }, []);

    const handleExpand = async (id: number) => {
        if (expandedId === id) {
            setExpandedId(null);
            setDetail(null);
            return;
        }
        setExpandedId(id);
        setDetailLoading(true);
        try {
            const res = await fetch(`${API}/reports/${id}`);
            const data = await res.json();
            setDetail(data);
        } catch {
            console.error("Failed to load report detail");
        } finally {
            setDetailLoading(false);
        }
    };

    const handleDownloadPdf = (id: number) => {
        window.open(`${API}/reports/${id}/pdf`, "_blank");
    };

    const handleManualOverride = async (reportId: number, partIndex: number, currentStatus: string) => {
        const newStatus = currentStatus === "success" ? "fail" : "success";
        const operator = localStorage.getItem("username") || "unknown";

        try {
            const res = await fetch(`${API}/reports/${reportId}/override`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    part_index: partIndex,
                    new_status: newStatus,
                    operator: operator
                })
            });

            if (res.ok) {
                const data = await res.json();
                setDetail(prev => prev ? { ...prev, parts: data.parts } : null);
                showToast("Verdict updated successfully", "success");
                // Refresh list to update top-level status badges if they exist
                fetchReports();
            } else {
                showToast("Failed to update verdict", "error");
            }
        } catch {
            showToast("Connection error", "error");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Delete this report?")) return;
        try {
            await fetch(`${API}/reports/${id}`, { method: "DELETE" });
            setReports(prev => prev.filter(r => r.id !== id));
            if (expandedId === id) { setExpandedId(null); setDetail(null); }
        } catch {
            showToast("Failed to delete report", "error");
        }
    };

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString("en-IN", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit",
        });
    };

    return (
        <div className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full">

                <div className="mb-6">
                    <nav className="text-sm font-medium text-gray-500 dark:text-neutral-400 flex items-center gap-2">
                        <span className="hover:text-western-green transition-colors cursor-pointer" onClick={() => navigate("/dashboard")}>Dashboard</span>
                        <span>›</span>
                        <span className="text-gray-800 dark:text-white">Reports & Analytics</span>
                    </nav>
                </div>

                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Inspection Reports</h2>
                        <p className="text-gray-500 dark:text-neutral-400 text-sm mt-1">
                            {reports.length} report{reports.length !== 1 ? "s" : ""} generated
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white dark:bg-neutral-800/80 rounded-2xl shadow-md border border-gray-100 dark:border-neutral-700/50 p-6">
                                <div className="flex items-center gap-4">
                                    <div className="skeleton w-10 h-10 rounded-xl" />
                                    <div className="flex-1">
                                        <div className="skeleton h-4 w-48 mb-2" />
                                        <div className="skeleton h-3 w-32" />
                                    </div>
                                    <div className="skeleton h-8 w-20 rounded-lg" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : reports.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="text-5xl mb-4">📋</div>
                        <p className="text-gray-500 dark:text-neutral-400 text-lg">No reports yet</p>
                        <p className="text-gray-400 dark:text-neutral-500 text-sm mt-1">Complete an inspection to generate your first report</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {reports.map(report => (
                            <div key={report.id} className="bg-white dark:bg-neutral-800/80 rounded-2xl shadow-md border border-gray-100 dark:border-neutral-700/50 overflow-hidden">

                                {/* Report Header Row */}
                                <div
                                    onClick={() => handleExpand(report.id)}
                                    className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                                            <svg className="w-5 h-5 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-800 dark:text-white">{report.master_name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-xs text-gray-500 dark:text-neutral-400">
                                                    by {report.operator} · {formatDate(report.created_at)} · {report.parts_count} part{report.parts_count !== 1 ? "s" : ""}
                                                </p>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight
                                                    ${report.status === "PASS" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : 
                                                      report.status === "FAIL" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : 
                                                      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-western-yellow"}`}>
                                                    {report.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={e => { e.stopPropagation(); handleDownloadPdf(report.id); }}
                                            className="px-4 py-2 text-sm font-medium text-western-green dark:text-emerald-400 bg-western-green/10 dark:bg-emerald-900/20 rounded-lg hover:bg-western-green/20 dark:hover:bg-emerald-900/40 transition-colors"
                                        >
                                            📥 PDF
                                        </button>
                                        <button
                                            onClick={e => { e.stopPropagation(); handleDelete(report.id); }}
                                            className="px-3 py-2 text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                        >
                                            🗑
                                        </button>
                                        <span className={`text-gray-400 transition-transform ${expandedId === report.id ? "rotate-180" : ""}`}>▼</span>
                                    </div>
                                </div>

                                {/* Expanded Detail */}
                                {expandedId === report.id && (
                                    <div className="border-t border-gray-100 dark:border-neutral-700 px-6 py-4">
                                        {detailLoading ? (
                                            <div className="text-center py-6 text-gray-500">Loading details...</div>
                                        ) : detail ? (
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="border-b border-gray-100 dark:border-neutral-700">
                                                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400">#</th>
                                                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400">Part</th>
                                                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400">Job Type</th>
                                                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400">Photo</th>
                                                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400">Verdict</th>
                                                        <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {detail.parts.map((part, i) => (
                                                        <tr key={i} className="border-b border-gray-50 dark:border-neutral-700/50">
                                                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-neutral-400">{i + 1}</td>
                                                            <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-white">{part.part_name}</td>
                                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-neutral-300 capitalize">{part.job_type}</td>
                                                            <td className="px-4 py-3">
                                                                {part.captured_image ? (
                                                                    <span className="inline-block px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase rounded-full">✓ Captured</span>
                                                                ) : (
                                                                    <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-neutral-700 text-gray-500 dark:text-neutral-400 text-[10px] font-bold uppercase rounded-full">— None</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex flex-col gap-1">
                                                                    <span className={`inline-flex items-center gap-1 font-bold text-xs ${part.ml_status === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                                                                        {part.ml_status === "success" ? "PASS" : "FAIL"}
                                                                    </span>
                                                                    {part.is_overridden && (
                                                                        <span className="text-[9px] text-yellow-600 dark:text-western-yellow font-medium uppercase leading-none">
                                                                            (Manual Override)
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                <button
                                                                    onClick={() => handleManualOverride(detail.id, i, part.ml_status)}
                                                                    className="p-1.5 text-gray-400 hover:text-western-yellow hover:bg-western-yellow/10 rounded transition-colors"
                                                                    title="Manual Override"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
    );
}
