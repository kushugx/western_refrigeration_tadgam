import { useState, useEffect } from "react";

type Capture = {
    url: string;
    filename: string;
    created_at: number;
};

export default function GalleryPage() {
    const [captures, setCaptures] = useState<Capture[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'original' | 'annotated'>('all');
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    const loadImages = () => {
        setLoading(true);
        fetch("/api/captures")
            .then(res => res.json())
            .then(data => {
                setCaptures(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load captures", err);
                setLoading(false);
            });
    };

    useEffect(() => {
        loadImages();
    }, []);

    const filteredCaptures = captures.filter(cap => {
        if (filter === 'all') return true;
        if (filter === 'annotated') return cap.filename.includes('annotated');
        if (filter === 'original') return !cap.filename.includes('annotated');
        return true;
    });

    const toggleSelection = (e: React.MouseEvent, filename: string) => {
        if (!isSelectionMode) return;
        e.preventDefault(); // Prevent opening image when selecting
        e.stopPropagation();

        setSelectedImages(prev =>
            prev.includes(filename)
                ? prev.filter(f => f !== filename)
                : [...prev, filename]
        );
    };

    const handleDeleteSelected = async () => {
        if (selectedImages.length === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedImages.length} image(s)?`)) return;

        try {
            const res = await fetch("/api/captures", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filenames: selectedImages })
            });

            if (res.ok) {
                // Clear selection and reload
                setSelectedImages([]);
                setIsSelectionMode(false);
                loadImages();
            } else {
                alert("Failed to delete some images.");
            }
        } catch (err) {
            console.error("Delete error", err);
            alert("Network error trying to delete images.");
        }
    };

    return (
        <div className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto w-full">
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-neutral-100">
                            GoPro Captures
                        </h1>
                        <div className="text-sm text-gray-500 dark:text-neutral-400 mt-1">
                            {filteredCaptures.length} Images {filter !== 'all' ? `(${filter})` : ''}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Filter Dropdown */}
                        <div className="relative">
                            <select
                                value={filter}
                                onChange={(e) => {
                                    setFilter(e.target.value as any);
                                    setSelectedImages([]); // Clear selection on filter change
                                }}
                                className="appearance-none bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-neutral-200 py-2 pl-4 pr-10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-western-green"
                            >
                                <option value="all">All Images</option>
                                <option value="original">Original Only</option>
                                <option value="annotated">ML Annotated Only</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>

                        {/* Selection Toggle */}
                        <button
                            onClick={() => {
                                setIsSelectionMode(!isSelectionMode);
                                if (isSelectionMode) setSelectedImages([]);
                            }}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors border ${isSelectionMode
                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                                    : 'bg-white dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 border-gray-300 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700'
                                }`}
                        >
                            {isSelectionMode ? 'Cancel Selection' : 'Select'}
                        </button>

                        {/* Bulk Delete Button */}
                        {isSelectionMode && selectedImages.length > 0 && (
                            <button
                                onClick={handleDeleteSelected}
                                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-red-600 hover:bg-red-700 text-white shadow-sm flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Delete ({selectedImages.length})
                            </button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-western-green"></div>
                    </div>
                ) : captures.length === 0 ? (
                    <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 p-12 text-center text-gray-500 dark:text-neutral-400">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-lg font-medium">No images found</p>
                        <p className="mt-1">Connect the GoPro and start inspecting to capture images.</p>
                    </div>
                ) : filteredCaptures.length === 0 ? (
                    <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 p-12 text-center text-gray-500 dark:text-neutral-400">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-lg font-medium">No matching images</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredCaptures.map((cap, i) => {
                            const isSelected = selectedImages.includes(cap.filename);
                            return (
                                <a
                                    key={i}
                                    href={isSelectionMode ? "#" : `${cap.url}`}
                                    target={isSelectionMode ? "_self" : "_blank"}
                                    rel="noreferrer"
                                    onClick={(e) => toggleSelection(e, cap.filename)}
                                    className={`group block bg-white dark:bg-neutral-900 rounded-xl overflow-hidden shadow-sm border transition-all duration-200 cursor-pointer ${isSelected
                                            ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-50'
                                            : 'border-gray-100 dark:border-neutral-800 hover:shadow-md'
                                        }`}
                                >
                                    <div className="aspect-[4/3] bg-gray-100 dark:bg-neutral-800 overflow-hidden relative">
                                        <img
                                            src={`${cap.url}`}
                                            alt={cap.filename}
                                            className={`w-full h-full object-cover transition-transform duration-300 ${isSelectionMode ? '' : 'group-hover:scale-105'} ${isSelected ? 'opacity-80' : ''}`}
                                            loading="lazy"
                                        />

                                        {/* ML Scanned Badge */}
                                        {cap.filename.includes('annotated') && (
                                            <div className="absolute top-2 right-2 bg-western-green text-white text-[10px] uppercase font-bold px-2 py-1 rounded bg-opacity-90 z-10">
                                                ML Scanned
                                            </div>
                                        )}

                                        {/* Selection Checkmark Overlay */}
                                        {isSelectionMode && (
                                            <div className="absolute top-2 left-2 z-10 transition-transform">
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white/50 border-white/80 text-transparent'
                                                    }`}>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3">
                                        <p className="text-sm font-medium text-gray-800 dark:text-neutral-200 truncate" title={cap.filename}>
                                            {cap.filename}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1">
                                            {new Date(cap.created_at * 1000).toLocaleString()}
                                        </p>
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                )}
        </div>
    );
}
