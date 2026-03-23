import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "../components/Toast";

interface Master {
  id: number;
  name: string;
}

export default function TestPage() {
  const [masters, setMasters] = useState<Master[]>([]);
  const [selectedMasterId, setSelectedMasterId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetch("/masters")
      .then(res => res.json())
      .then(data => setMasters(data))
      .catch(err => console.error(err));
  }, []);

  const handleLoadMaster = async () => {
    if (!selectedMasterId) return;

    try {
      setLoading(true);
      const res = await fetch(`/masters/${selectedMasterId}`);
      const data = await res.json();

      // Navigate to inspection page with master data
      navigate("/inspection", { state: { master: data } });
    } catch (err) {
      console.error(err);
      showToast("Failed to load master", "error");
    } finally {
      setLoading(false);
    }
  };

  // Enter key shortcut
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && selectedMasterId && !loading) {
        e.preventDefault();
        handleLoadMaster();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedMasterId, loading]);

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-800 w-full max-w-md rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-700 p-8 space-y-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-neutral-100 text-center">
          Select Master File
        </h2>

        <select
          className="w-full border border-gray-300 dark:border-neutral-600 rounded-xl px-4 py-3 bg-gray-50 dark:bg-neutral-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-western-green/50 focus:border-western-green transition-shadow appearance-none"
          value={selectedMasterId ?? ""}
          onChange={(e) => setSelectedMasterId(Number(e.target.value))}
        >
          <option value="">-- Choose a Master --</option>
          {masters.map(master => (
            <option key={master.id} value={master.id}>
              {master.name}
            </option>
          ))}
        </select>

        <button
          disabled={!selectedMasterId || loading}
          onClick={handleLoadMaster}
          className="w-full py-3.5 rounded-xl bg-western-green text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors font-medium shadow-sm"
        >
          {loading ? "Loading..." : "Load Master"}
        </button>

        <p className="text-center text-sm text-gray-500 dark:text-neutral-400 mt-4">
          Press <kbd className="px-2 py-1 bg-gray-100 dark:bg-neutral-700 rounded-md text-[11px] font-mono border border-gray-200 dark:border-neutral-600 shadow-sm">Enter</kbd> to load master
        </p>
      </div>
    </div>
  );
}