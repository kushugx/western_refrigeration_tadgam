import { useState, useEffect } from "react";

export default function CameraSetupPage() {
    const [bleStatus, setBleStatus] = useState<"disconnected" | "connecting" | "connected" | "error">("disconnected");
    const [bleMessage, setBleMessage] = useState("");
    const [wifiConnected, setWifiConnected] = useState(false);
    const [mediaSyncActive, setMediaSyncActive] = useState(false);
    const [mediaSyncLoading, setMediaSyncLoading] = useState(false);

    // Poll status every 3 seconds
    useEffect(() => {
        let active = true;

        const poll = async () => {
            try {
                const [statusRes, wifiRes] = await Promise.all([
                    fetch("/gopro/status"),
                    fetch("/gopro/wifi-status"),
                ]);
                const statusData = await statusRes.json();
                const wifiData = await wifiRes.json();

                if (active) {
                    if (statusData.ble_connected && bleStatus !== "connecting") {
                        setBleStatus("connected");
                    } else if (!statusData.ble_connected && bleStatus !== "connecting") {
                        setBleStatus("disconnected");
                    }
                    setMediaSyncActive(statusData.media_sync_active);
                    setWifiConnected(wifiData.connected);
                }
            } catch { /* backend offline */ }
        };

        poll();
        const interval = setInterval(poll, 3000);
        return () => { active = false; clearInterval(interval); };
    }, [bleStatus]);

    const handleBleConnect = async () => {
        if (bleStatus === "connected") {
            setBleStatus("disconnected");
            setBleMessage("");
            try {
                await fetch("/gopro/ble-disconnect", { method: "POST" });
            } catch { /* ignore */ }
            return;
        }

        setBleStatus("connecting");
        setBleMessage("Scanning for GoPro via BLE...");

        try {
            const res = await fetch("/gopro/ble-connect", { method: "POST" });
            const data = await res.json();

            if (data.status === "already_running") {
                setBleStatus("connected");
                setBleMessage("BLE already connected");
            } else if (data.status === "started") {
                setBleMessage("BLE script started — scanning for GoPro...");
                let attempts = 0;
                const checkInterval = setInterval(async () => {
                    attempts++;
                    try {
                        const statusRes = await fetch("/gopro/status");
                        const statusData = await statusRes.json();
                        if (statusData.ble_connected) {
                            setBleStatus("connected");
                            setBleMessage("BLE connected! Now connect your Mac to the GoPro WiFi AP.");
                            clearInterval(checkInterval);
                        } else if (attempts > 20) {
                            setBleStatus("error");
                            setBleMessage("BLE connection timed out. Try again.");
                            clearInterval(checkInterval);
                        }
                    } catch {
                        clearInterval(checkInterval);
                    }
                }, 2000);
            } else {
                setBleStatus("error");
                setBleMessage(data.message || "BLE connection failed");
            }
        } catch {
            setBleStatus("error");
            setBleMessage("Backend unreachable");
        }
    };

    const handleMediaSyncToggle = async () => {
        setMediaSyncLoading(true);
        try {
            const endpoint = mediaSyncActive ? "stop-media-sync" : "start-media-sync";
            await fetch(`/gopro/${endpoint}`, { method: "POST" });

            setTimeout(async () => {
                try {
                    const res = await fetch("/gopro/status");
                    const data = await res.json();
                    setMediaSyncActive(data.media_sync_active);
                } catch { /* ignore */ }
                setMediaSyncLoading(false);
            }, 1000);
        } catch {
            setMediaSyncLoading(false);
            alert("Failed to reach backend");
        }
    };

    const statusColor = (ok: boolean) => ok ? "bg-green-500" : "bg-red-500";
    const statusText = (ok: boolean) => ok ? "Connected" : "Disconnected";

    return (
        <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-lg space-y-6">

                    {/* Step 1: BLE Connect */}
                    <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-700 p-8 space-y-4 text-center">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                                Step 1: Connect via BLE
                            </h2>
                            <div className="flex items-center space-x-2">
                                <span className={`w-3 h-3 rounded-full ${bleStatus === "connected" ? "bg-green-500" :
                                    bleStatus === "connecting" ? "bg-yellow-500 animate-pulse" :
                                        bleStatus === "error" ? "bg-red-500" : "bg-gray-400"
                                    }`} />
                                <span className="text-sm text-gray-500 dark:text-neutral-400">
                                    {bleStatus === "connected" ? "Connected" :
                                        bleStatus === "connecting" ? "Connecting..." :
                                            bleStatus === "error" ? "Error" : "Disconnected"}
                                </span>
                            </div>
                        </div>

                        <p className="text-sm text-gray-500 dark:text-neutral-400">
                            This will scan for your GoPro via Bluetooth and enable its WiFi Access Point.
                        </p>

                        {bleMessage && (
                            <div className={`text-sm p-3 rounded-lg ${bleStatus === "connected" ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300" :
                                bleStatus === "error" ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300" :
                                    "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                                }`}>
                                {bleMessage}
                            </div>
                        )}

                        <button
                            onClick={handleBleConnect}
                            disabled={bleStatus === "connecting"}
                            className={`w-full py-3 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${bleStatus === "connected"
                                ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30 dark:hover:bg-red-900/40"
                                : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                                }`}
                        >
                            {bleStatus === "connecting" ? "Connecting..." :
                                bleStatus === "connected" ? "Disconnect BLE" :
                                    "Connect BLE"}
                        </button>
                    </div>

                    {/* Step 2: WiFi AP Status */}
                    <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-700 p-8 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                                Step 2: GoPro WiFi AP
                            </h2>
                            <div className="flex items-center space-x-2">
                                <span className={`w-3 h-3 rounded-full shadow-sm ${statusColor(wifiConnected)}`} />
                                <span className="text-sm font-medium text-gray-600 dark:text-neutral-300">
                                    {statusText(wifiConnected)}
                                </span>
                            </div>
                        </div>

                        <p className="text-sm text-gray-500 dark:text-neutral-400">
                            After BLE connects, go to <strong>Mac WiFi Settings</strong> and connect to the GoPro WiFi network.
                            This indicator updates automatically.
                        </p>

                        <div className={`flex items-center space-x-4 p-4 rounded-xl border ${wifiConnected
                            ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-900/20"
                            : "bg-gray-50 border-gray-200 dark:bg-neutral-900/50 dark:border-neutral-700"
                            }`}>
                            <span className="text-2xl">{wifiConnected ? "📶" : "📡"}</span>
                            <div>
                                <div className={`font-semibold ${wifiConnected ? "text-emerald-600 dark:text-emerald-400" : "text-gray-600 dark:text-neutral-400"}`}>
                                    {wifiConnected ? "Connected to GoPro (10.5.5.9)" : "Not connected to GoPro WiFi"}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                    Auto-detects by reaching GoPro on port 8080
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 3: Media Sync */}
                    <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-700 p-8 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                                Step 3: Media Sync
                            </h2>
                            <div className="flex items-center space-x-2">
                                <span className={`w-3 h-3 rounded-full shadow-sm ${statusColor(mediaSyncActive)}`} />
                                <span className="text-sm font-medium text-gray-600 dark:text-neutral-300">
                                    {mediaSyncActive ? "Active" : "Inactive"}
                                </span>
                            </div>
                        </div>

                        <p className="text-sm text-gray-500 dark:text-neutral-400">
                            When enabled, photos taken on the GoPro itself are automatically downloaded and shown on the inspection page.
                        </p>

                        <div className="flex items-center justify-between mt-4">
                            <span className="font-semibold text-gray-700 dark:text-neutral-300">
                                {mediaSyncActive ? "Media Sync is ON" : "Media Sync is OFF"}
                            </span>
                            <button
                                onClick={handleMediaSyncToggle}
                                disabled={mediaSyncLoading}
                                className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${mediaSyncActive ? "bg-emerald-600" : "bg-gray-200 dark:bg-neutral-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                                    } ${mediaSyncLoading ? "opacity-50" : "cursor-pointer"}`}
                            >
                                <span
                                    className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-300 ${mediaSyncActive ? "translate-x-7" : "translate-x-0"
                                        }`}
                                />
                            </button>
                        </div>

                        {mediaSyncActive && (
                            <div className="text-xs text-center text-gray-400 dark:text-neutral-500 mt-2">
                                Polling GoPro for new photos every 5 seconds
                            </div>
                        )}
                </div>
            </div>
        </div>
    );
}
