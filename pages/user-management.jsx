import { useEffect, useMemo, useState } from "react";
import { withAuthPage } from "@/lib/withAuthPage";

export const getServerSideProps = withAuthPage({ path: "/users" });

const emptyForm = {
  username: "",
  password: "",
  role: "ADMIN",
};

function normalizeRole(role) {
  return String(role || "")
    .trim()
    .toUpperCase()
    .replace("SUPERADMIN", "SUPER_ADMIN")
    .replace("SUPER ADMIN", "SUPER_ADMIN");
}

function RoleBadge({ role }) {
  const normalizedRole = normalizeRole(role);

  const styles = {
    SUPER_ADMIN: "bg-purple-100 text-purple-700",
    ADMIN: "bg-blue-100 text-blue-700",
    ACCOUNTANT: "bg-green-100 text-green-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${
        styles[normalizedRole] || "bg-slate-100 text-slate-700"
      }`}
    >
      {normalizedRole}
    </span>
  );
}

function UserModal({ open, mode, form, setForm, onClose, onSubmit, submitting }) {
  if (!open) return null;

  const isEdit = mode === "edit";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-5">
          <h2 className="text-xl font-bold text-slate-900">
            {isEdit ? "Edit User" : "Add User"}
          </h2>

          <button
            onClick={onClose}
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700"
          >
            Close
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
              Username
            </label>
            <input
              value={form.username}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, username: e.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
              placeholder="Enter username"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
              {isEdit ? "New Password Optional" : "Password"}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, password: e.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
              placeholder={
                isEdit ? "Leave blank to keep old password" : "Enter password"
              }
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
              Role
            </label>
            <select
              value={normalizeRole(form.role)}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, role: e.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
            >
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              <option value="ADMIN">ADMIN</option>
              <option value="ACCOUNTANT">ACCOUNTANT</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t p-5">
          <button
            onClick={onClose}
            className="rounded-xl border px-5 py-2 text-sm font-bold text-slate-700"
          >
            Cancel
          </button>

          <button
            onClick={onSubmit}
            disabled={submitting}
            className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save User"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [modalMode, setModalMode] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function fetchUsers() {
    try {
      setLoading(true);
      const res = await fetch("/api/users");
      const data = await res.json();

      if (!data.success) throw new Error(data.error || "Unable to fetch users");

      setUsers(data.users || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch = String(user.username || "")
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesRole =
        !roleFilter || normalizeRole(user.role) === normalizeRole(roleFilter);

      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  function openAdd() {
    setForm(emptyForm);
    setSelectedId(null);
    setModalMode("add");
  }

  function openEdit(user) {
    setForm({
      username: user.username || "",
      password: "",
      role: normalizeRole(user.role || "ADMIN"),
    });
    setSelectedId(user.id);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setSelectedId(null);
    setForm(emptyForm);
  }

  async function saveUser() {
    try {
      if (!form.username.trim()) {
        setMessage("Username is required");
        return;
      }

      if (modalMode === "add" && !form.password.trim()) {
        setMessage("Password is required");
        return;
      }

      setSubmitting(true);

      const method = modalMode === "edit" ? "PUT" : "POST";
      const url =
        modalMode === "edit" ? `/api/users?id=${selectedId}` : "/api/users";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          role: normalizeRole(form.role),
        }),
      });

      const data = await res.json();

      if (!data.success) throw new Error(data.error || "Unable to save user");

      setMessage(
        modalMode === "edit"
          ? "User updated successfully"
          : "User added successfully"
      );

      closeModal();
      fetchUsers();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteUser(user) {
    const ok = window.confirm(`Delete user ${user.username}?`);
    if (!ok) return;

    try {
      const res = await fetch(`/api/users?id=${user.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!data.success) throw new Error(data.error || "Unable to delete user");

      setMessage("User deleted successfully");
      fetchUsers();
    } catch (error) {
      setMessage(error.message);
    }
  }

  const totalUsers = users.length;

  const superAdmins = users.filter(
    (u) => normalizeRole(u.role) === "SUPER_ADMIN"
  ).length;

  const admins = users.filter(
    (u) => normalizeRole(u.role) === "ADMIN"
  ).length;

  const accountants = users.filter(
    (u) => normalizeRole(u.role) === "ACCOUNTANT"
  ).length;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                User Management
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                Manage login accounts, roles, and access for school ERP users.
              </p>
            </div>

            <button
              onClick={openAdd}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-700"
            >
              + Add User
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-4 rounded-2xl bg-white p-4 text-sm font-semibold text-slate-700 shadow-sm">
            {message}
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total Users</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">
              {totalUsers}
            </h2>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Super Admins</p>
            <h2 className="mt-3 text-3xl font-bold text-purple-700">
              {superAdmins}
            </h2>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Admins</p>
            <h2 className="mt-3 text-3xl font-bold text-blue-700">
              {admins}
            </h2>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Accountants</p>
            <h2 className="mt-3 text-3xl font-bold text-green-700">
              {accountants}
            </h2>
          </div>
        </div>

        <div className="mb-6 rounded-3xl bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search username..."
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
            />

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
            >
              <option value="">All Roles</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              <option value="ADMIN">ADMIN</option>
              <option value="ACCOUNTANT">ACCOUNTANT</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-lg font-bold text-slate-900">
              Login Accounts
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Passwords are hidden for security. Use reset password to change
              login password.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead style={{ backgroundColor: "#08516d" }}>
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-white">
                    ID
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-white">
                    Username
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-white">
                    Role
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-white">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                      #{user.id}
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {user.username}
                      </p>
                      <p className="text-xs text-slate-500">Password hidden</p>
                    </td>

                    <td className="px-5 py-4">
                      <RoleBadge role={user.role} />
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(user)}
                          className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => deleteUser(user)}
                          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {loading && (
              <div className="p-10 text-center text-sm font-semibold text-slate-500">
                Loading users...
              </div>
            )}

            {!loading && filteredUsers.length === 0 && (
              <div className="p-10 text-center">
                <h3 className="text-lg font-semibold text-slate-900">
                  No users found
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Add login accounts for admin and accountant users.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <UserModal
        open={!!modalMode}
        mode={modalMode}
        form={form}
        setForm={setForm}
        onClose={closeModal}
        onSubmit={saveUser}
        submitting={submitting}
      />
    </div>
  );
}