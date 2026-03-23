import { useState, useEffect, useCallback } from "react";

interface Toast {
    id: number;
    message: string;
    type: "success" | "error" | "info";
    exiting?: boolean;
}

let addToastExternal: ((message: string, type?: "success" | "error" | "info") => void) | null = null;

export function showToast(message: string, type: "success" | "error" | "info" = "info") {
    if (addToastExternal) {
        addToastExternal(message, type);
    }
}

let nextId = 0;

export default function ToastContainer() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
        const id = nextId++;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
            setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
        }, 3000);
    }, []);

    useEffect(() => {
        addToastExternal = addToast;
        return () => { addToastExternal = null; };
    }, [addToast]);

    const iconMap = {
        success: "✓",
        error: "✕",
        info: "ℹ",
    };

    const colorMap = {
        success: "bg-emerald-600",
        error: "bg-red-600",
        info: "bg-blue-600",
    };

    return (
        <div className="fixed top-4 right-4 z-[9999] space-y-3 pointer-events-none">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={`${toast.exiting ? "toast-exit" : "toast-enter"} pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-white ${colorMap[toast.type]} backdrop-blur-lg min-w-[280px] max-w-[400px]`}
                >
                    <span className="text-lg font-bold">{iconMap[toast.type]}</span>
                    <span className="text-sm font-medium">{toast.message}</span>
                </div>
            ))}
        </div>
    );
}
