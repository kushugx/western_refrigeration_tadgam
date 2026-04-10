import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Master {
  id: number;
  name: string;
  model_family: string;
  sub_model: string;
  door_count: number;
}

export default function ManageMastersPage() {
  const [masters, setMasters] = useState<Master[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/masters")
      .then(res => res.json())
      .then(data => setMasters(data))
      .catch(err => console.error(err));
  }, []);

  const handleDelete = async (id: number) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this master file?"
    );

    if (!confirmDelete) return;

    try {
      await fetch(`/masters/${id}`, {
        method: "DELETE",
      });

      // Remove deleted master from state
      setMasters(prev => prev.filter(master => master.id !== id));

    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  return (
    <div className="flex-1 px-6 py-8 max-w-4xl mx-auto w-full">
      {/* Breadcrumb */}
      <div className="mb-6">
        <nav className="text-sm font-medium text-gray-500 dark:text-neutral-400 flex items-center gap-2">
          <span className="hover:text-western-green transition-colors cursor-pointer" onClick={() => navigate("/dashboard")}>Dashboard</span>
          <span>›</span>
          <span className="text-gray-800 dark:text-white">Manage Masters</span>
        </nav>
      </div>

      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-700 p-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
          Existing Masters
        </h2>

        {masters.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-neutral-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-neutral-700">
            <p className="text-gray-500 dark:text-neutral-400 font-medium">No master files found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {masters.map(master => (
              <div
                key={master.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-gray-100 dark:border-neutral-700 rounded-xl p-5 hover:border-western-green/30 hover:bg-western-green/5 dark:hover:bg-gray-700/50 transition-colors group"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-800 dark:text-white text-lg">
                      {master.name}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 bg-western-green/10 text-western-green rounded">
                      {master.model_family}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 dark:text-neutral-400">
                    <span>Sub-model: <strong className="text-gray-700 dark:text-neutral-300">{master.sub_model}</strong></span>
                    <span className="text-gray-300 dark:text-neutral-600">•</span>
                    <span>{master.door_count} door{master.door_count > 1 ? "s" : ""}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate(`/edit-master/${master.id}`)}
                    className="px-5 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-western-green hover:text-white dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-western-green transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(master.id)}
                    className="px-5 py-2 text-sm font-medium rounded-lg text-red-600 bg-red-50 hover:bg-red-600 hover:text-white dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-600 dark:hover:text-white transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}