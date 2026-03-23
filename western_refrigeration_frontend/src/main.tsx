import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import { createBrowserRouter, RouterProvider, useNavigate, Navigate } from "react-router-dom";
import "./index.css";
import App from "./App";
import TestPage from "./pages/TestPage";
import ManageMastersPage from "./pages/ManageMasters";
import EditMasterPage from "./pages/EditMasterPage";
import InspectionPage from "./pages/InspectionPage";
import CameraSetupPage from "./pages/CameraSetupPage";
import LoginPage from "./pages/LoginPage";
import UserManagementPage from "./pages/UserManagementPage";
import ReportsPage from "./pages/ReportsPage";
import DataManagementPage from "./pages/DataManagementPage";
import GalleryPage from "./pages/GalleryPage";
import { showToast } from "./components/Toast";

function CameraWidget() {
  const [status, setStatus] = useState({
    cameraConnected: false,
    previewServerRunning: false,
    mediaSyncActive: false
  });

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const [statusRes, wifiRes] = await Promise.all([
          fetch("/gopro/status"),
          fetch("/gopro/wifi-status").catch(() => ({ ok: false, json: async () => ({ connected: false }) }))
        ]);

        if (!statusRes.ok) throw new Error("Failed to fetch camera status");

        const data = await statusRes.json();
        const wifiData = wifiRes.ok ? await wifiRes.json() : { connected: false };

        // Actual backend fields map exactly to the status state we need
        setStatus({
          cameraConnected: data.ble_connected || wifiData.connected,
          previewServerRunning: data.preview_running,
          mediaSyncActive: data.media_sync_active
        });
      } catch (err) {
        console.error("Failed to fetch camera widget status", err);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (action: string) => {
    try {
      const isCurrentlyActive =
        action === 'camera' ? status.cameraConnected :
          action === 'stream' ? status.previewServerRunning :
            status.mediaSyncActive;

      const endpoint = action === 'camera'
        ? (isCurrentlyActive ? '/gopro/ble-disconnect' : '/gopro/ble-connect')
        : action === 'stream'
          ? (isCurrentlyActive ? '/gopro/stop-preview' : '/gopro/start-preview')
          : (isCurrentlyActive ? '/gopro/stop-media-sync' : '/gopro/start-media-sync');

      const verb = isCurrentlyActive ? 'Stopping' : 'Starting';
      showToast(`${verb} ${action}...`, "info");

      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        showToast(data.message || `${action} ${isCurrentlyActive ? 'stopped' : 'started'}`, "success");
      } else {
        showToast(data.detail || `Failed to ${isCurrentlyActive ? 'stop' : 'start'} ${action}`, "error");
      }
    } catch (err) {
      showToast(`Network error toggling ${action}`, "error");
    }
  };

  return (
    <div className="flex gap-4 p-4 mt-6 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-700">
      <div
        onClick={() => handleAction('camera')}
        className="flex flex-col items-center gap-1 cursor-pointer hover:opacity-75 transition-opacity px-2"
        title="Connect Camera (BLE)"
      >
        <span className="text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider">Camera</span>
        <div className={`w-3 h-3 rounded-full ${status.cameraConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
      </div>
      <div className="w-px bg-gray-200 dark:bg-neutral-700" />
      <div
        onClick={() => handleAction('stream')}
        className="flex flex-col items-center gap-1 cursor-pointer hover:opacity-75 transition-opacity px-2"
        title="Start Preview Stream"
      >
        <span className="text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider">Stream</span>
        <div className={`w-3 h-3 rounded-full ${status.previewServerRunning ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
      </div>
      <div className="w-px bg-gray-200 dark:bg-neutral-700" />
      <div
        onClick={() => handleAction('sync')}
        className="flex flex-col items-center gap-1 cursor-pointer hover:opacity-75 transition-opacity px-2"
        title="Start Media Sync"
      >
        <span className="text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider">Sync</span>
        <div className={`w-3 h-3 rounded-full ${status.mediaSyncActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
      </div>
    </div>
  );
}

function MasterForm({
  masterName,
  setMasterName,
  selectedParts,
  togglePart,
  availableParts,
}: {
  masterName: string;
  setMasterName: (v: string) => void;
  selectedParts: string[];
  togglePart: (p: string) => void;
  availableParts: string[];
}) {
  return (
    <>
      {/* Master Name */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-neutral-300">
          Master Name
        </label>
        <input
          type="text"
          value={masterName}
          onChange={(e) => setMasterName(e.target.value)}
          className="w-full border border-gray-300 dark:border-neutral-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-western-green/50 focus:border-western-green bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 transition-shadow"
          placeholder="Enter master name"
        />
      </div>

      {/* Checkbox Parts */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-neutral-300">
          Select Parts
        </label>
        <div className="space-y-2 border border-gray-300 dark:border-neutral-600 rounded-lg p-3">
          {availableParts.map((part) => (
            <label key={part} className="flex items-center space-x-2 cursor-pointer text-gray-900 dark:text-neutral-100">
              <input
                type="checkbox"
                checked={selectedParts.includes(part)}
                onChange={() => togglePart(part)}
                className="accent-western-green"
              />
              <span>{part}</span>
            </label>
          ))}
        </div>
      </div>
    </>
  );
}


function Dashboard() {
  const [createMasterOpen, setCreateMasterOpen] = useState(false);
  const [masterStep, setMasterStep] = useState(1);
  const [masterName, setMasterName] = useState("");
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [partJobs, setPartJobs] = useState<Record<string, { jobType: string; count?: number }>>({});

  const availableParts = ["Dew Collector", "Shelf", "Tray", "Temperature Knob"];

  const togglePart = (part: string) => {
    setSelectedParts(prev =>
      prev.includes(part)
        ? prev.filter(p => p !== part)
        : [...prev, part]
    );
  };

  const navigate = useNavigate();

  const role = localStorage.getItem("role") || "operator";
  const username = localStorage.getItem("username") || "User";
  const isAdmin = role === "admin";

  // Fetch stats
  const [stats, setStats] = useState({ totalReports: 0, totalMasters: 0 });
  const [recentReports, setRecentReports] = useState<{ id: number; master_name: string; operator: string; created_at: string; parts_count: number }[]>([]);

  useEffect(() => {
    fetch(`/reports?role=${role}&username=${username}`).then(r => r.json()).then(data => {
      setStats(s => ({ ...s, totalReports: data.length }));
      setRecentReports(data.slice(0, 3));
    }).catch(() => { });
    fetch("/masters").then(r => r.json()).then(data => {
      setStats(s => ({ ...s, totalMasters: data.length }));
    }).catch(() => { });
  }, [role, username]);

  // Camera status for the Camera Setup card badge
  const [cameraStatus, setCameraStatus] = useState({ camera: false, streaming: false });
  useEffect(() => {
    const poll = async () => {
      try {
        const [statusRes, wifiRes] = await Promise.all([
          fetch("/gopro/status").catch(() => null),
          fetch("/gopro/wifi-status").catch(() => null),
        ]);
        const status = statusRes?.ok ? await statusRes.json() : null;
        const wifi   = wifiRes?.ok  ? await wifiRes.json()   : null;
        setCameraStatus({
          camera:    !!(wifi?.connected || status?.camera_connected),
          streaming: !!(status?.streaming_active || status?.preview_active),
        });
      } catch { /* ignore */ }
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">
            Welcome back
          </h2>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${isAdmin ? "bg-western-green/10 text-western-green border border-western-green/20" : "bg-emerald-100 text-emerald-700"}`}>
              {role}
            </span>
            <span className="text-gray-500 dark:text-neutral-400 text-lg">
              Quality inspection & master file management
            </span>
          </div>

          <div className="mt-2 flex items-center justify-center">
            <CameraWidget />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-5xl mb-10">
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-700 p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-full bg-western-green/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-western-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalReports}</p>
              <p className="text-xs text-gray-500 dark:text-neutral-400 uppercase tracking-wider font-semibold">Total Reports</p>
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-700 p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-full bg-western-yellow/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600 dark:text-western-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalMasters}</p>
              <p className="text-xs text-gray-500 dark:text-neutral-400 uppercase tracking-wider font-semibold">Master Files</p>
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-700 p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-neutral-700 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-600 dark:text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-800 dark:text-white truncate max-w-[120px]">{username}</p>
              <p className="text-xs text-gray-500 dark:text-neutral-400 uppercase tracking-wider font-semibold">Active User</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        {recentReports.length > 0 && (
          <div className="w-full max-w-5xl mb-8">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider mb-3">Recent Inspections</h3>
            <div className="bg-white dark:bg-neutral-800/80 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-700/50 divide-y divide-gray-100 dark:divide-neutral-700/50">
              {recentReports.map(r => {
                const ago = Math.round((Date.now() - new Date(r.created_at).getTime()) / 60000);
                const timeAgo = ago < 1 ? "just now" : ago < 60 ? `${ago}m ago` : ago < 1440 ? `${Math.round(ago / 60)}h ago` : `${Math.round(ago / 1440)}d ago`;
                return (
                  <div key={r.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer" onClick={() => navigate("/reports")}>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-western-green" />
                      <span className="text-sm font-medium text-gray-800 dark:text-white">{r.master_name}</span>
                      <span className="text-xs text-gray-400">by {r.operator}</span>
                    </div>
                    <span className="text-xs text-gray-400">{timeAgo}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">

          {/* Create Master — Admin only */}
          {isAdmin && (
            <div
              onClick={() => setCreateMasterOpen(true)}
              className="group relative bg-white dark:bg-neutral-800 rounded-3xl shadow-sm hover:shadow-xl border border-gray-100 dark:border-neutral-700 p-8 cursor-pointer transition-all duration-300 hover:-translate-y-1 overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-400 to-gray-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-gray-800 dark:group-hover:bg-white transition-all duration-300">
                <svg className="w-7 h-7 text-gray-600 dark:text-neutral-300 group-hover:text-white dark:group-hover:text-gray-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">Create Master</h3>
              <p className="text-sm text-gray-500 dark:text-neutral-400">Define a new master file with parts and inspection criteria</p>
            </div>
          )}

          {/* Start Test */}
          <div
            onClick={() => navigate("/test")}
            className="group relative bg-white dark:bg-neutral-800 rounded-3xl shadow-sm hover:shadow-xl border border-gray-100 dark:border-neutral-700 p-8 cursor-pointer transition-all duration-300 hover:-translate-y-1 overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-400 to-gray-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-gray-800 dark:group-hover:bg-white transition-all duration-300">
              <svg className="w-7 h-7 text-gray-600 dark:text-neutral-300 group-hover:text-white dark:group-hover:text-gray-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">Start Test</h3>
            <p className="text-sm text-gray-500 dark:text-neutral-400">Begin an inspection using a configured master file</p>
          </div>

          {/* User Management — Admin only */}
          {isAdmin && (
            <div onClick={() => navigate("/user-management")} className="group relative bg-white dark:bg-neutral-800 rounded-3xl shadow-sm hover:shadow-xl border border-gray-100 dark:border-neutral-700 p-8 cursor-pointer transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-400 to-gray-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-gray-800 dark:group-hover:bg-white transition-all duration-300">
                <svg className="w-7 h-7 text-gray-600 dark:text-neutral-300 group-hover:text-white dark:group-hover:text-gray-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">User Management</h3>
              <p className="text-sm text-gray-500 dark:text-neutral-400">Manage operators, roles, and permissions</p>
            </div>
          )}

          {/* Reports & Analytics */}
          <div onClick={() => navigate("/reports")} className="group relative bg-white dark:bg-neutral-800 rounded-3xl shadow-sm hover:shadow-xl border border-gray-100 dark:border-neutral-700 p-8 cursor-pointer transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-400 to-gray-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-gray-800 dark:group-hover:bg-white transition-all duration-300">
              <svg className="w-7 h-7 text-gray-600 dark:text-neutral-300 group-hover:text-white dark:group-hover:text-gray-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">Reports & Analytics</h3>
            <p className="text-sm text-gray-500 dark:text-neutral-400">View inspection history, trends, and export data</p>
          </div>

          {/* System Maintenance — Admin only */}
          {isAdmin && (
            <div onClick={() => navigate("/maintenance")} className="group relative bg-white dark:bg-neutral-800 rounded-3xl shadow-sm hover:shadow-xl border border-gray-100 dark:border-neutral-700 p-8 cursor-pointer transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-western-yellow to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-gray-800 dark:group-hover:bg-white transition-all duration-300">
                <svg className="w-7 h-7 text-gray-600 dark:text-neutral-300 group-hover:text-white dark:group-hover:text-gray-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">System Maintenance</h3>
              <p className="text-sm text-gray-500 dark:text-neutral-400">Manage data archiving, storage cleanup and system health</p>
            </div>
          )}

          {/* Camera & Gallery */}
          <div className="group relative bg-white dark:bg-neutral-800 rounded-3xl shadow-sm hover:shadow-xl border border-gray-100 dark:border-neutral-700 p-8 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-western-green to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 flex items-center justify-center group-hover:scale-110 group-hover:bg-gray-800 dark:group-hover:bg-white transition-all duration-300">
                <svg className="w-7 h-7 text-gray-600 dark:text-neutral-300 group-hover:text-white dark:group-hover:text-gray-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.847v6.306a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                </svg>
              </div>
              {/* Live status badge */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border
                ${cameraStatus.camera
                  ? cameraStatus.streaming
                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                    : "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800"
                  : "bg-gray-100 dark:bg-neutral-700 text-gray-500 dark:text-neutral-400 border-gray-200 dark:border-neutral-600"
                }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cameraStatus.camera ? cameraStatus.streaming ? "bg-emerald-500 animate-pulse" : "bg-yellow-500" : "bg-gray-400"}`} />
                {cameraStatus.camera ? cameraStatus.streaming ? "Streaming" : "Connected" : "Offline"}
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">Camera & Gallery</h3>
            <p className="text-sm text-gray-500 dark:text-neutral-400 mb-5">Configure GoPro connection or browse captured images</p>
            <div className="flex gap-3">
              <button
                onClick={() => window.open("/camera-setup", "_blank")}
                className="flex-1 py-2 text-sm font-medium rounded-xl bg-western-green text-white hover:bg-emerald-700 transition-colors"
              >
                Camera Setup
              </button>
              <button
                onClick={() => navigate("/gallery")}
                className="flex-1 py-2 text-sm font-medium rounded-xl bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-neutral-200 hover:bg-gray-200 dark:hover:bg-neutral-600 transition-colors"
              >
                Image Gallery
              </button>
            </div>
          </div>

        </div>
      </div>
      {/* Footer info area */}
      <div className="w-full mt-16 max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 px-4">
        <p className="text-sm font-medium text-gray-500 dark:text-neutral-400 text-center sm:text-left">
          © {new Date().getFullYear()} Western Refrigeration. All rights reserved.
        </p>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-neutral-500">Integration by</span>
          <img src="/ugx-logo.jpg" alt="UGX.AI" className="h-6 object-contain opacity-70 hover:opacity-100 transition-opacity mix-blend-multiply dark:mix-blend-normal dark:invert" />
        </div>
      </div>
      {createMasterOpen && createPortal(
        <div className="fixed top-0 left-0 w-screen h-screen flex items-center justify-center bg-black/50 z-[100] p-4">
          <div className="bg-white dark:bg-neutral-900 w-[600px] max-h-[90dvh] overflow-y-auto rounded-2xl shadow-2xl p-8 relative border border-gray-100 dark:border-neutral-800 flex flex-col gap-6">

            <h2 className="text-2xl font-bold text-gray-800 dark:text-white shrink-0">
              Create Master
            </h2>

            {masterStep === 1 && (
              <>
                <MasterForm
                  masterName={masterName}
                  setMasterName={setMasterName}
                  selectedParts={selectedParts}
                  togglePart={togglePart}
                  availableParts={availableParts}
                />
                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    onClick={() => {
                      setCreateMasterOpen(false);
                      setMasterStep(1);
                      setMasterName("");
                      setSelectedParts([]);
                      setPartJobs({});
                    }}
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-neutral-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-neutral-100"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={() => setMasterStep(2)}
                    disabled={!masterName || selectedParts.length === 0}
                    className="px-6 py-3 font-medium rounded-xl bg-western-green text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    Next
                  </button>
                </div>
              </>
            )}

            {masterStep === 2 && (
              <div className="flex flex-col gap-6 min-h-0">
                <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                  {selectedParts.map((part) => (
                    <div key={part} className="border border-gray-200 dark:border-neutral-600 rounded-lg p-4 space-y-3 shrink-0">
                      <h3 className="font-bold text-gray-800 dark:text-neutral-200 text-lg">{part}</h3>

                      <select
                        className="w-full border border-gray-300 dark:border-neutral-600 rounded-xl px-4 py-2.5 bg-gray-50 dark:bg-neutral-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-western-green/50 focus:border-western-green transition-shadow appearance-none"
                        value={partJobs[part]?.jobType || ""}
                        onChange={(e) =>
                          setPartJobs(prev => ({
                            ...prev,
                            [part]: { ...prev[part], jobType: e.target.value }
                          }))
                        }
                      >
                        <option value="">Select Job Type</option>
                        <option value="presence">Presence / Absence</option>
                        <option value="counting">Counting</option>
                        <option value="alignment">Alignment</option>
                      </select>

                      {partJobs[part]?.jobType === "counting" && (
                        <input
                          type="number"
                          min="1"
                          placeholder="Enter expected count"
                          className="w-full md:w-1/2 border border-gray-300 dark:border-neutral-600 rounded-xl px-4 py-2.5 bg-gray-50 dark:bg-neutral-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-western-green/50 focus:border-western-green transition-shadow"
                          onChange={(e) =>
                            setPartJobs(prev => ({
                              ...prev,
                              [part]: {
                                ...prev[part],
                                count: Number(e.target.value)
                              }
                            }))
                          }
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-neutral-800 shrink-0">
                  <button
                    onClick={() => setMasterStep(1)}
                    className="px-4 py-2 font-medium text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    Back
                  </button>

                  <button
                    onClick={async () => {
                      try {
                        const payload = {
                          name: masterName,
                          parts: selectedParts.map((part) => ({
                            part_name: part,
                            job_type: partJobs[part]?.jobType,
                            expected_count:
                              partJobs[part]?.jobType === "counting"
                                ? partJobs[part]?.count
                                : null,
                          })),
                        };

                        const response = await fetch("/masters", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify(payload),
                        });

                        if (!response.ok) {
                          const errorData = await response.json();
                          showToast(errorData.detail || "Error creating master", "error");
                          return;
                        }

                        showToast("Master created successfully!", "success");

                        setCreateMasterOpen(false);
                        setMasterStep(1);
                        setMasterName("");
                        setSelectedParts([]);
                        setPartJobs({});
                      } catch (error) {
                        console.error(error);
                        showToast("Backend connection failed", "error");
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-western-green text-white hover:bg-emerald-800 transition-colors font-medium"
                  >
                    Create Master
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <Navigate to="/login" replace />,
      },
      {
        path: "dashboard",
        element: <Dashboard />,
      },
      {
        path: "test",
        element: <TestPage />,
      },
      {
        path: "manage-masters",
        element: <ManageMastersPage />,
      },
      {
        path: "edit-master/:id",
        element: <EditMasterPage />,
      },
      {
        path: "inspection",
        element: <InspectionPage />,
      },
      {
        path: "camera-setup",
        element: <CameraSetupPage />,
      },
      {
        path: "gallery",
        element: <GalleryPage />,
      },
      {
        path: "user-management",
        element: <UserManagementPage />,
      },
      {
        path: "reports",
        element: <ReportsPage />,
      },
      {
        path: "maintenance",
        element: <DataManagementPage />,
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);