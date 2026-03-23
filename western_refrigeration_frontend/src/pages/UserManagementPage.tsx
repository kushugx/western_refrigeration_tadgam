import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "../components/Toast";

interface User {
    id: number;
    username: string;
    role: string;
}

const API = "";

export default function UserManagementPage() {
    const navigate = useNavigate();
    const token = localStorage.getItem("token");

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // New user form
    const [showForm, setShowForm] = useState(false);
    const [newUsername, setNewUsername] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newRole, setNewRole] = useState("operator");
    const [formError, setFormError] = useState("");
    const [formLoading, setFormLoading] = useState(false);

    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API}/auth/users`, { headers });
            if (res.status === 401 || res.status === 403) {
                navigate("/login");
                return;
            }
            const data = await res.json();
            setUsers(data);
        } catch {
            setError("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!token) { navigate("/login"); return; }
        fetchUsers();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");
        setFormLoading(true);

        try {
            const res = await fetch(`${API}/auth/register`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    username: newUsername,
                    password: newPassword,
                    role: newRole,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                setFormError(data.detail || "Failed to create user");
                return;
            }

            setNewUsername("");
            setNewPassword("");
            setNewRole("operator");
            setShowForm(false);
            fetchUsers();
        } catch {
            setFormError("Failed to create user");
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (user: User) => {
        if (!confirm(`Delete user "${user.username}"?`)) return;

        try {
            const res = await fetch(`${API}/auth/users/${user.id}`, {
                method: "DELETE",
                headers,
            });

            if (!res.ok) {
                const data = await res.json();
                showToast(data.detail || "Failed to delete user", "error");
                return;
            }

            fetchUsers();
            showToast("User deleted", "success");
        } catch {
            showToast("Failed to delete user", "error");
        }
    };

    return (
        <div className="flex-1 px-6 py-8 max-w-4xl mx-auto w-full">

                <div className="mb-6">
                    <nav className="text-sm font-medium text-gray-500 dark:text-neutral-400 flex items-center gap-2">
                        <span className="hover:text-western-green transition-colors cursor-pointer" onClick={() => navigate("/dashboard")}>Dashboard</span>
                        <span>›</span>
                        <span className="text-gray-800 dark:text-white">User Management</span>
                    </nav>
                </div>

                {/* Header + Add Button */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Users</h2>
                        <p className="text-gray-500 dark:text-neutral-400 text-sm mt-1">
                            {users.length} user{users.length !== 1 ? "s" : ""} registered
                        </p>
                    </div>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="px-5 py-2.5 bg-gradient-to-r from-western-green to-emerald-600 hover:from-emerald-700 hover:to-emerald-700 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all"
                    >
                        {showForm ? "Cancel" : "+ Add User"}
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm mb-6">
                        {error}
                    </div>
                )}

                {/* Add User Form */}
                {showForm && (
                    <div className="bg-white dark:bg-neutral-800/80 rounded-2xl shadow-md border border-gray-100 dark:border-neutral-700/50 p-6 mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Create New User</h3>

                        {formError && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm mb-4">
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Username</label>
                                <input
                                    type="text"
                                    value={newUsername}
                                    onChange={e => setNewUsername(e.target.value)}
                                    required
                                    minLength={3}
                                    placeholder="e.g. john"
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-neutral-600 bg-gray-50 dark:bg-neutral-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-western-green/50 focus:border-transparent outline-none transition-all text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    required
                                    minLength={4}
                                    placeholder="Min 4 chars"
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-neutral-600 bg-gray-50 dark:bg-neutral-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-western-green/50 focus:border-transparent outline-none transition-all text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Role</label>
                                <select
                                    value={newRole}
                                    onChange={e => setNewRole(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-neutral-600 bg-gray-50 dark:bg-neutral-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-western-green/50 focus:border-transparent outline-none transition-all text-sm appearance-none"
                                >
                                    <option value="operator">Operator</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="flex items-end">
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50 text-sm"
                                >
                                    {formLoading ? "Creating..." : "Create User"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Users Table */}
                {loading ? (
                    <div className="bg-white dark:bg-neutral-800/80 rounded-2xl shadow-md border border-gray-100 dark:border-neutral-700/50 p-6 space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="skeleton h-5 w-10 rounded" />
                                <div className="skeleton h-5 w-32" />
                                <div className="skeleton h-6 w-20 rounded-full" />
                                <div className="flex-1" />
                                <div className="skeleton h-5 w-14" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-neutral-800/80 rounded-2xl shadow-md border border-gray-100 dark:border-neutral-700/50 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-neutral-700">
                                    <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400">ID</th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400">Username</th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400">Role</th>
                                    <th className="text-right px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id} className="border-b border-gray-50 dark:border-neutral-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-neutral-400 font-mono">#{user.id}</td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-gray-800 dark:text-white">{user.username}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${user.role === "admin"
                                                ? "bg-western-green/10 text-western-green dark:bg-western-green/20 dark:text-emerald-400"
                                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {user.username !== localStorage.getItem("username") ? (
                                                <button
                                                    onClick={() => handleDelete(user)}
                                                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            ) : (
                                                <span className="text-xs text-gray-400 dark:text-neutral-500">You</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {users.length === 0 && (
                            <div className="text-center py-12 text-gray-500 dark:text-neutral-400">No users found</div>
                        )}
                    </div>
                )}
        </div>
    );
}
