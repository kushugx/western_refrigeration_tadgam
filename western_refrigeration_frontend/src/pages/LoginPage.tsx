import { useState } from "react";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.detail || "Login failed");
                return;
            }

            const data = await res.json();
            localStorage.setItem("token", data.access_token);
            localStorage.setItem("role", data.role);
            localStorage.setItem("username", data.username);
            window.location.href = "/dashboard";
        } catch {
            setError("Cannot connect to server");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 px-4">

            <div className="w-full max-w-md">
                {/* Logo / Brand */}
                <div className="text-center mb-8 flex flex-col items-center">
                    <div className="flex items-center justify-center gap-6 mb-6">
                        <img src="/western-logo.png" alt="Western Refrigeration" className="h-16 object-contain" />
                    </div>

                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">
                        Quality Inspection
                    </h1>
                    <p className="text-gray-500 dark:text-neutral-400 mt-1">
                        Sign in to continue
                    </p>
                </div>

                {/* Login Card */}
                <div className="bg-white dark:bg-neutral-800/80 rounded-2xl shadow-xl border border-gray-100 dark:border-neutral-700/50 p-8">
                    <form onSubmit={handleLogin} className="space-y-5">

                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1.5">
                                Username
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder="Enter your username"
                                required
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-600 bg-gray-50 dark:bg-neutral-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-western-green focus:border-transparent outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1.5">
                                Password
                            </label>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-600 bg-gray-50 dark:bg-neutral-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-western-green focus:border-transparent outline-none transition-all"
                            />
                            <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={showPassword}
                                    onChange={e => setShowPassword(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 dark:border-neutral-600 text-western-green focus:ring-western-green cursor-pointer"
                                />
                                <span className="text-sm text-gray-500 dark:text-neutral-400">Show password</span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                    Signing in...
                                </span>
                            ) : "Sign In"}
                        </button>

                    </form>
                </div>

                <div className="mt-8 flex items-center justify-center gap-3">
                    <span className="text-xs text-gray-400 dark:text-neutral-500 font-medium">Powered by</span>
                    <img src="/ugx-logo.jpg" alt="UGX.AI" className="h-5 object-contain opacity-80 mix-blend-multiply dark:mix-blend-normal dark:invert" />
                </div>
            </div>
        </div>
    );
}
