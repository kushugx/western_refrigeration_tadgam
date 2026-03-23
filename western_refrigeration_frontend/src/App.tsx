import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import ToastContainer from "./components/Toast";

type ThemeMode = "dark" | "auto" | "light";

function applyTheme(mode: ThemeMode) {
  if (mode === "dark") {
    document.documentElement.classList.add("dark");
  } else if (mode === "light") {
    document.documentElement.classList.remove("dark");
  } else {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(
    (localStorage.getItem("theme") || "auto") as ThemeMode
  );

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role") || "operator";
  const username = localStorage.getItem("username") || "User";
  const isAdmin = role === "admin";

  // Auth guard and theme initial load
  useEffect(() => {
    applyTheme(themeMode);
    
    // Redirect to login if no token and not already on login page
    if (!token && location.pathname !== "/login") {
      navigate("/login");
    }
  }, [themeMode, token, navigate, location.pathname]);

  // Listen for system changes when in auto mode
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const current = (localStorage.getItem("theme") || "auto") as ThemeMode;
      if (current === "auto") applyTheme("auto");
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    setMenuOpen(false);
    navigate("/login");
  };

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
    localStorage.setItem("theme", mode);
    applyTheme(mode);
  };

  // Hide nav on login page
  if (location.pathname === "/login") {
    return (
      <>
        <ToastContainer />
        <Outlet />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 flex flex-col font-sans">
      <ToastContainer />

      {/* Global Top Bar */}
      <div className="sticky top-0 z-40 flex justify-between h-16 bg-white dark:bg-neutral-900 shadow-sm border-b border-gray-100 dark:border-neutral-800 px-6 sm:px-8">
        <div className="flex items-center">
          <button
            className="text-2xl text-western-green hover:scale-110 transition-transform mr-4"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ☰
          </button>
          <img src="/western-logo.png" alt="Western Refrigeration" className="h-10 object-contain mr-3" />
          <div className="hidden sm:block">
            <span className="text-xl font-bold text-western-green tracking-tight">Quality Inspection</span>
            <span className="ml-2 text-xs font-semibold text-gray-500 uppercase tracking-widest relative top-[-2px]">System</span>
          </div>
        </div>
        <div className="w-8" />
      </div>

      {/* Global Sidebar (Slide Menu) */}
      {createPortal(
        <>
          {menuOpen && (
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110]"
              onClick={() => setMenuOpen(false)}
            />
          )}

          <div
            className={`fixed top-0 left-0 h-full w-72 bg-white dark:bg-neutral-900 text-gray-800 dark:text-neutral-100 shadow-[0_0_40px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_rgba(0,0,0,0.3)] border-r border-gray-100 dark:border-neutral-800 transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) z-[120] flex flex-col ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
          >
            {/* Sidebar Header */}
            <div className="p-6 border-b border-gray-50 dark:border-neutral-800 flex items-center justify-between shrink-0">
              <img src="/western-logo.png" alt="Western" className="h-8 object-contain" />
              <button 
                onClick={() => setMenuOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-gray-400"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* User Profile Section */}
            <div className="px-6 py-6 border-b border-gray-50 dark:border-neutral-800 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-western-green to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-white leading-tight">{username}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${isAdmin ? "bg-western-yellow text-amber-900" : "bg-western-green text-white"}`}>
                      {role}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Section */}
            <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
              <p className="px-3 text-[10px] font-black text-gray-400 dark:text-neutral-500 uppercase tracking-[0.2em] mb-4">Main Navigation</p>
              
              <button
                onClick={() => { navigate("/dashboard"); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-western-green/5 dark:hover:bg-western-green/10 text-gray-600 dark:text-neutral-300 hover:text-western-green transition-all group font-medium"
              >
                <svg className="w-5 h-5 opacity-60 group-hover:opacity-100 transition-opacity" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                Dashboard
              </button>

              <button
                onClick={() => { window.open("/camera-setup", "_blank"); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-western-green/5 dark:hover:bg-western-green/10 text-gray-600 dark:text-neutral-300 hover:text-western-green transition-all group font-medium"
              >
                <svg className="w-5 h-5 opacity-60 group-hover:opacity-100 transition-opacity" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                Camera Setup
              </button>

              <button
                onClick={() => { navigate("/gallery"); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-western-green/5 dark:hover:bg-western-green/10 text-gray-600 dark:text-neutral-300 hover:text-western-green transition-all group font-medium"
              >
                <svg className="w-5 h-5 opacity-60 group-hover:opacity-100 transition-opacity" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                Image Gallery
              </button>

              <button
                onClick={() => { navigate("/reports"); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-western-green/5 dark:hover:bg-western-green/10 text-gray-600 dark:text-neutral-300 hover:text-western-green transition-all group font-medium"
              >
                <svg className="w-5 h-5 opacity-60 group-hover:opacity-100 transition-opacity" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Inspection Reports
              </button>

              {isAdmin && (
                <>
                  <div className="pt-4 pb-2">
                    <p className="px-3 text-[10px] font-black text-gray-400 dark:text-neutral-500 uppercase tracking-[0.2em] mb-4">Administration</p>
                  </div>
                  
                  <button
                    onClick={() => { navigate("/manage-masters"); setMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-western-yellow/5 dark:hover:bg-western-yellow/10 text-gray-600 dark:text-neutral-300 hover:text-western-yellow transition-all group font-medium"
                  >
                    <svg className="w-5 h-5 opacity-60 group-hover:opacity-100 transition-opacity" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2H2v10h10V2z"></path><path d="M22 2h-10v10h10V2z"></path><path d="M12 12H2v10h10V12z"></path><path d="M22 12h-10v10h10V12z"></path></svg>
                    Manage Masters
                  </button>

                  <button
                    onClick={() => { navigate("/user-management"); setMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-western-yellow/5 dark:hover:bg-western-yellow/10 text-gray-600 dark:text-neutral-300 hover:text-western-yellow transition-all group font-medium"
                  >
                    <svg className="w-5 h-5 opacity-60 group-hover:opacity-100 transition-opacity" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    User Management
                  </button>

                  <button
                    onClick={() => { navigate("/maintenance"); setMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-western-yellow/5 dark:hover:bg-western-yellow/10 text-gray-600 dark:text-neutral-300 hover:text-western-yellow transition-all group font-medium"
                  >
                    <svg className="w-5 h-5 opacity-60 group-hover:opacity-100 transition-opacity" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3"></path><path d="M21 16v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3"></path><path d="M4 12H2"></path><path d="M10 12H8"></path><path d="M16 12h-2"></path><path d="M22 12h-2"></path></svg>
                    Maintenance
                  </button>
                </>
              )}

              {/* Settings Section */}
              <div className="pt-6 border-t border-gray-50 dark:border-neutral-800 mt-6">
                <button
                  onClick={() => setSettingsOpen(!settingsOpen)}
                  className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold text-gray-500 dark:text-neutral-400 group hover:text-gray-800 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 opacity-70" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                    Preferences
                  </div>
                  <span className={`text-[10px] transform transition-transform duration-300 ${settingsOpen ? "rotate-180" : ""}`}>▼</span>
                </button>

                {settingsOpen && (
                  <div className="mt-3 mx-2 p-4 bg-gray-50/50 dark:bg-neutral-800/30 rounded-2xl border border-gray-100 dark:border-neutral-800 animate-in slide-in-from-top-2 duration-300">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-neutral-500 mb-2 block">Appearance</label>
                    <div className="flex bg-white dark:bg-neutral-900 rounded-xl p-1 border border-gray-100 dark:border-neutral-800">
                      {[
                        { id: "light", label: "Light" },
                        { id: "auto", label: "Auto" },
                        { id: "dark", label: "Dark" }
                      ].map(m => (
                        <button
                          key={m.id}
                          onClick={() => handleThemeChange(m.id as ThemeMode)}
                          className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${themeMode === m.id
                            ? "bg-western-green text-white shadow-sm"
                            : "text-gray-500 dark:text-neutral-400 hover:text-gray-800 dark:hover:text-white"
                            }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Footer */}
            <div className="p-6 border-t border-gray-50 dark:border-neutral-800 shrink-0 flex flex-col gap-4">
              <button
                onClick={handleLogout}
                className="w-full h-12 flex items-center justify-center gap-3 rounded-xl bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-bold hover:bg-red-600 hover:text-white transition-all group active:scale-[0.98]"
              >
                <svg className="w-5 h-5 opacity-70" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                Sign Out
              </button>
              
              <div className="flex items-center justify-between opacity-40 hover:opacity-100 transition-opacity px-2">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Powered by</span>
                <img src="/ugx-logo.jpg" alt="UGX" className="h-4 object-contain grayscale dark:invert" />
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Main Content Area */}
      <main className="flex-1 transition-all duration-300 pt-16">
        <div className="h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default App;