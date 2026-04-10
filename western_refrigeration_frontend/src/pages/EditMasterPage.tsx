



import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { showToast } from "../components/Toast";
import { ALL_PARTS, FRIDGE_MODELS } from "../fridgeConfig";

interface PartJob {
  part_name: string;
  job_type: string;
  image_url?: string | null;
}

interface Master {
  id: number;
  name: string;
  model_family: string;
  sub_model: string;
  door_count: number;
  parts: PartJob[];
}

export default function EditMasterPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [masterName, setMasterName] = useState("");
  const [modelFamily, setModelFamily] = useState("");
  const [subModel, setSubModel] = useState("");
  const [doorCount, setDoorCount] = useState(2);
  const [parts, setParts] = useState<PartJob[]>([]);

  // For adding new parts
  const [showAddPart, setShowAddPart] = useState(false);

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
        setModelFamily(data.model_family);
        setSubModel(data.sub_model);
        setDoorCount(data.door_count);
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
      const updated = [...parts];
      updated[index] = { ...updated[index], image_url: data.image_url };
      setParts(updated);
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

  const handleAddPart = (partName: string) => {
    // Don't add duplicates
    if (parts.some(p => p.part_name === partName)) {
      showToast(`"${partName}" is already in the list`, "error");
      return;
    }
    setParts(prev => [...prev, { part_name: partName, job_type: "presence" }]);
    setShowAddPart(false);
  };

  // Parts not yet in the master
  const availableToAdd = ALL_PARTS.filter(p => !parts.some(pp => pp.part_name === p));

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
  }, [masterName, parts, modelFamily, subModel, doorCount]);

  const handleSave = async () => {
    try {
      const payload = {
        name: masterName,
        model_family: modelFamily,
        sub_model: subModel,
        door_count: doorCount,
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

        {/* Model Info (editable) */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-neutral-300">Model Family</label>
            <select
              value={modelFamily}
              onChange={(e) => setModelFamily(e.target.value)}
              className="w-full border border-gray-300 dark:border-neutral-600 rounded-xl px-4 py-2 bg-gray-50 dark:bg-neutral-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-western-green/50 focus:border-western-green transition-shadow appearance-none"
            >
              {FRIDGE_MODELS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-neutral-300">Sub-Model</label>
            <input
              type="text"
              value={subModel}
              onChange={(e) => setSubModel(e.target.value)}
              className="w-full border border-gray-300 dark:border-neutral-600 rounded-xl px-4 py-2 bg-gray-50 dark:bg-neutral-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-western-green/50 focus:border-western-green transition-shadow"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-neutral-300">Master Name</label>
            <input
              type="text"
              value={masterName}
              onChange={(e) => setMasterName(e.target.value)}
              className="w-full border border-gray-300 dark:border-neutral-600 rounded-xl px-4 py-2 bg-gray-50 dark:bg-neutral-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-western-green/50 focus:border-western-green transition-shadow"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-neutral-300">Door Count</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(n => (
                <button
                  key={n}
                  onClick={() => setDoorCount(n)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all border ${
                    doorCount === n
                      ? "bg-western-green text-white border-western-green"
                      : "bg-gray-50 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 border-gray-200 dark:border-neutral-600"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Parts List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-neutral-400">
              Parts ({parts.length})
            </h3>
            <button
              onClick={() => setShowAddPart(!showAddPart)}
              className="text-sm font-medium text-western-green hover:underline"
            >
              + Add Part
            </button>
          </div>

          {/* Add Part Dropdown */}
          {showAddPart && availableToAdd.length > 0 && (
            <div className="border border-western-green/20 rounded-xl p-3 bg-western-green/5 dark:bg-western-green/10 max-h-48 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-1.5">
                {availableToAdd.map(part => (
                  <button
                    key={part}
                    onClick={() => handleAddPart(part)}
                    className="text-left text-sm px-3 py-2 rounded-lg hover:bg-western-green/10 dark:hover:bg-western-green/20 text-gray-700 dark:text-neutral-300 transition-colors"
                  >
                    + {part}
                  </button>
                ))}
              </div>
            </div>
          )}

          {parts.map((part, index) => (
            <div
              key={index}
              className="border border-gray-200 dark:border-neutral-600 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800 dark:text-neutral-200 text-lg">
                  {part.part_name}
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 bg-western-green/10 text-western-green rounded-full">
                    Presence / Absence
                  </span>
                  <button
                    onClick={() => handleDeletePart(index)}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium px-3 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Delete this part"
                  >
                    ✕ Remove
                  </button>
                </div>
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