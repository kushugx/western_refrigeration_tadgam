



import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { showToast } from "../components/Toast";

interface PartJob {
  part_name: string;
  job_type: string;
  expected_count?: number | null;
  image_url?: string | null;
}

interface Master {
  id: number;
  name: string;
  parts: PartJob[];
}

export default function EditMasterPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [masterName, setMasterName] = useState("");
  const [parts, setParts] = useState<PartJob[]>([]);

  useEffect(() => {
    const fetchMaster = async () => {
      try {
        const res = await fetch(`/masters/${id}`);
        if (!res.ok) {
          showToast("Master not found", "error");
          navigate("/manage-masters");
          return;
        }

        const data: Master = await res.json();
        setMasterName(data.name);
        setParts(data.parts);
        setLoading(false);
      } catch (error) {
        console.error(error);
        showToast("Failed to load master", "error");
        navigate("/manage-masters");
      }
    };

    fetchMaster();
  }, [id, navigate]);

  const handlePartChange = (
    index: number,
    field: keyof PartJob,
    value: string | number | null
  ) => {
    const updated = [...parts];
    updated[index] = { ...updated[index], [field]: value };
    setParts(updated);
  };

  const handleImageUpload = async (index: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        showToast("Failed to upload image", "error");
        return;
      }

      const data = await res.json();
      handlePartChange(index, "image_url", data.image_url);
    } catch (error) {
      console.error(error);
      showToast("Image upload failed", "error");
    }
  };

  const handleDeletePart = (index: number) => {
    if (parts.length <= 1) {
      showToast("A master must have at least one part.", "error");
      return;
    }
    if (!confirm(`Delete part "${parts[index].part_name}"?`)) return;
    setParts(prev => prev.filter((_, i) => i !== index));
  };

  // Enter key shortcut to save
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "Enter" && tag !== "INPUT" && tag !== "SELECT" && tag !== "TEXTAREA") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [masterName, parts]);

  const handleSave = async () => {
    try {
      const payload = {
        name: masterName,
        parts,
      };

      const res = await fetch(`/masters/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        showToast("Failed to update master", "error");
        return;
      }

      showToast("Master updated successfully!", "success");
      navigate("/manage-masters");
    } catch (error) {
      console.error(error);
      showToast("Backend connection failed", "error");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-neutral-950">
        <p className="text-lg text-gray-900 dark:text-neutral-100">Loading master...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-10">
      {/* Breadcrumb */}
      <div className="max-w-3xl mx-auto mb-4">
        <nav className="text-sm font-medium text-gray-500 dark:text-neutral-400 flex items-center gap-2">
          <span className="hover:text-western-green transition-colors cursor-pointer" onClick={() => navigate("/dashboard")}>Dashboard</span>
          <span>›</span>
          <span className="hover:text-western-green transition-colors cursor-pointer" onClick={() => navigate("/manage-masters")}>Manage Masters</span>
          <span>›</span>
          <span className="text-gray-800 dark:text-white">Edit Master</span>
        </nav>
      </div>

      <div className="max-w-3xl mx-auto bg-white dark:bg-neutral-800 rounded-xl shadow-xl p-8 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-neutral-300">
            Master Name
          </label>
          <input
            type="text"
            value={masterName}
            onChange={(e) => setMasterName(e.target.value)}
            className="w-full border border-gray-300 dark:border-neutral-600 rounded-xl px-4 py-2 bg-gray-50 dark:bg-neutral-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-western-green/50 focus:border-western-green transition-shadow"
          />
        </div>

        <div className="space-y-4">
          {parts.map((part, index) => (
            <div
              key={index}
              className="border border-gray-200 dark:border-neutral-600 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800 dark:text-neutral-200 text-lg">
                  {part.part_name}
                </h3>
                <button
                  onClick={() => handleDeletePart(index)}
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium px-3 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Delete this part"
                >
                  ✕ Remove
                </button>
              </div>

              {/* Part Image */}
              <div className="flex items-center space-x-4">
                <div className="w-32 h-32 border-2 border-dashed border-gray-300 dark:border-neutral-600 rounded-lg overflow-hidden flex items-center justify-center bg-gray-50 dark:bg-neutral-700">
                  {part.image_url ? (
                    <img
                      src={`${part.image_url}`}
                      alt={part.part_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-gray-400 text-center px-2">No image</span>
                  )}
                </div>
                <div>
                  <label className="inline-block px-4 py-2 text-sm rounded-lg border border-western-green dark:border-emerald-400 text-western-green dark:text-emerald-400 hover:bg-western-green/10 dark:hover:bg-emerald-900/30 cursor-pointer transition-colors shadow-sm font-medium">
                    {part.image_url ? "Replace Image" : "Upload Image"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(index, file);
                      }}
                    />
                  </label>
                </div>
              </div>

              <select
                value={part.job_type}
                onChange={(e) =>
                  handlePartChange(index, "job_type", e.target.value)
                }
                className="w-full border border-gray-300 dark:border-neutral-600 rounded-lg p-2 bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100"
              >
                <option value="presence">Presence / Absence</option>
                <option value="counting">Counting</option>
                <option value="alignment">Alignment</option>
              </select>

              {part.job_type === "counting" && (
                <input
                  type="number"
                  value={part.expected_count || ""}
                  onChange={(e) =>
                    handlePartChange(
                      index,
                      "expected_count",
                      Number(e.target.value)
                    )
                  }
                  className="w-full border border-gray-300 dark:border-neutral-600 rounded-lg p-2 bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100"
                  placeholder="Expected Count"
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-between pt-6">
          <button
            onClick={() => navigate("/manage-masters")}
            className="px-6 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-neutral-100"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-western-green text-white font-medium rounded-xl shadow-sm hover:bg-emerald-700 transition-colors"
          >
            Save Changes
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-neutral-500 mt-2">
          Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-neutral-700 rounded text-[10px] font-mono">Enter</kbd> to save changes
        </p>
      </div>
    </div>
  );
}