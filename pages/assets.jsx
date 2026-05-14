import { useEffect, useMemo, useState } from "react";
import { withAuthPage } from "@/lib/withAuthPage";

export const getServerSideProps = withAuthPage({ path: "/assets" });

const emptyForm = {
  asset_code: "",
  asset_name: "",
  asset_category: "Furniture",
  quantity: 1,
  purchase_date: "",
  purchase_cost: "",
  vendor_name: "",
  invoice_number: "",
  invoice_file_url: "",
  brand: "",
  model_number: "",
  serial_number: "",
  assigned_to: "",
  assigned_location: "",
  warranty_expiry_date: "",
  description: "",
};

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN");
}

function AssetModal({ open, mode, form, setForm, onClose, onSubmit, submitting }) {
  if (!open) return null;

  const isView = mode === "view";
  const title =
    mode === "add" ? "Add Asset" : mode === "edit" ? "Edit Asset" : "Asset Details";

  function input(name, label, type = "text") {
    return (
      <div>
        <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
          {label}
        </label>
        <input
          type={type}
          value={form[name] || ""}
          disabled={isView}
          onChange={(e) => setForm((prev) => ({ ...prev, [name]: e.target.value }))}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900 disabled:bg-slate-50"
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-5">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold">
            Close
          </button>
        </div>

        <div className="space-y-6 p-5">
          <section>
            <h3 className="mb-3 font-bold text-slate-900">Basic Asset Details</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {input("asset_code", "Asset Code")}
              {input("asset_name", "Asset Name")}
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                  Category
                </label>
                <select
                  value={form.asset_category || ""}
                  disabled={isView}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, asset_category: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900 disabled:bg-slate-50"
                >
                  <option>Furniture</option>
                  <option>Electronics</option>
                  <option>Vehicles</option>
                  <option>Lab Equipment</option>
                  <option>Sports</option>
                  <option>Office Equipment</option>
                  <option>Classroom Equipment</option>
                  <option>Infrastructure</option>
                </select>
              </div>
              {input("quantity", "Quantity", "number")}
              {input("brand", "Brand")}
              {input("model_number", "Model Number")}
              {input("serial_number", "Serial Number")}
            </div>
          </section>

          <section>
            <h3 className="mb-3 font-bold text-slate-900">Purchase & Invoice</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {input("purchase_date", "Purchase Date", "date")}
              {input("purchase_cost", "Purchase Cost", "number")}
              {input("vendor_name", "Vendor Name")}
              {input("invoice_number", "Invoice Number")}
              {input("invoice_file_url", "Invoice File URL")}
              {input("warranty_expiry_date", "Warranty Expiry Date", "date")}
            </div>
          </section>

          <section>
            <h3 className="mb-3 font-bold text-slate-900">Assignment</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {input("assigned_to", "Assigned To")}
              {input("assigned_location", "Location")}
            </div>
          </section>

          <section>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
              Description
            </label>
            <textarea
              value={form.description || ""}
              disabled={isView}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900 disabled:bg-slate-50"
            />
          </section>

          {isView && form.invoice_file_url && (
            <section className="rounded-2xl bg-slate-50 p-4">
              <h3 className="font-bold text-slate-900">Invoice File</h3>
              <a
                href={form.invoice_file_url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"
              >
                Open Invoice
              </a>
            </section>
          )}
        </div>

        {!isView && (
          <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-white p-5">
            <button onClick={onClose} className="rounded-xl border px-5 py-2 text-sm font-bold">
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={submitting}
              className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Asset"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AssetsPage() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedId, setSelectedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [message, setMessage] = useState("");

  async function fetchAssets() {
    try {
      setLoading(true);
      const response = await fetch("/api/assets");
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Unable to fetch assets");
      setAssets(data.assets || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAssets();
  }, []);

  const filteredAssets = useMemo(() => {
    return assets.filter((item) => {
      const text = `${item.asset_code || ""} ${item.asset_name || ""} ${
        item.vendor_name || ""
      } ${item.assigned_location || ""}`.toLowerCase();

      return (
        text.includes(search.toLowerCase()) &&
        (!categoryFilter || item.asset_category === categoryFilter)
      );
    });
  }, [assets, search, categoryFilter]);

  const totalAssets = assets.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalValue = assets.reduce((sum, item) => sum + Number(item.purchase_cost || 0), 0);
  const categories = [...new Set(assets.map((item) => item.asset_category).filter(Boolean))];

  function openAdd() {
    setSelectedId(null);
    setForm(emptyForm);
    setModalMode("add");
  }

  function openView(item) {
    setSelectedId(item.id);
    setForm({ ...emptyForm, ...item });
    setModalMode("view");
  }

  function openEdit(item) {
    setSelectedId(item.id);
    setForm({ ...emptyForm, ...item });
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setSelectedId(null);
    setForm(emptyForm);
  }

  async function saveAsset() {
    try {
      if (!form.asset_code || !form.asset_name || !form.asset_category) {
        setMessage("Asset code, name and category are required");
        return;
      }

      setSubmitting(true);

      const method = modalMode === "edit" ? "PUT" : "POST";
      const url = modalMode === "edit" ? `/api/assets?id=${selectedId}` : "/api/assets";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Failed to save asset");

      setMessage(modalMode === "edit" ? "Asset updated successfully" : "Asset added successfully");
      closeModal();
      fetchAssets();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteAsset(item) {
    const ok = window.confirm(`Delete ${item.asset_name}?`);
    if (!ok) return;

    try {
      const response = await fetch(`/api/assets?id=${item.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Failed to delete asset");

      setMessage("Asset deleted successfully");
      fetchAssets();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Assets
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                Track school assets, furniture, electronics, vehicles, invoices and locations.
              </p>
            </div>

            <button
              onClick={openAdd}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
            >
              + Add Asset
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-4 rounded-2xl bg-white p-4 text-sm font-semibold text-slate-700 shadow-sm">
            {message}
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total Asset Items</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">{totalAssets}</h2>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total Asset Value</p>
            <h2 className="mt-3 text-3xl font-bold text-green-700">
              {formatCurrency(totalValue)}
            </h2>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Categories</p>
            <h2 className="mt-3 text-3xl font-bold text-blue-700">{categories.length}</h2>
          </div>
        </div>

        <div className="mb-6 rounded-3xl bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search asset, code, vendor or location..."
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
            />

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
            >
              <option value="">All Categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-lg font-bold text-slate-900">Asset Register</h2>
            <p className="mt-1 text-sm text-slate-500">
              Click a row or View to open full asset details.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead style={{ backgroundColor: "#8B1F1F" }}>
                <tr>
                  {["Asset", "Category", "Qty", "Value", "Vendor", "Location", "Purchase Date", "Actions"].map((h) => (
                    <th
                      key={h}
                      className={`px-5 py-4 text-xs font-bold uppercase tracking-wide text-white ${
                        h === "Actions" ? "text-right" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredAssets.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => openView(item)}
                    className="cursor-pointer transition hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <div>
                        <h3 className="font-semibold text-slate-900">{item.asset_name}</h3>
                        <p className="text-sm text-slate-500">{item.asset_code}</p>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                      {item.asset_category}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-700">
                      {item.quantity}
                    </td>

                    <td className="px-5 py-4 text-sm font-bold text-slate-900">
                      {formatCurrency(item.purchase_cost)}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-700">
                      {item.vendor_name || "-"}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-700">
                      {item.assigned_location || "-"}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-700">
                      {formatDate(item.purchase_date)}
                    </td>

                    <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openView(item)} className="rounded-xl border px-3 py-2 text-xs font-semibold hover:bg-slate-100">
                          View
                        </button>
                        <button onClick={() => openEdit(item)} className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100">
                          Edit
                        </button>
                        <button onClick={() => deleteAsset(item)} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100">
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
                Loading assets...
              </div>
            )}

            {!loading && filteredAssets.length === 0 && (
              <div className="p-10 text-center">
                <h3 className="text-lg font-semibold text-slate-900">No assets found</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Add benches, computers, CCTV, vehicles and other school assets.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AssetModal
        open={!!modalMode}
        mode={modalMode}
        form={form}
        setForm={setForm}
        onClose={closeModal}
        onSubmit={saveAsset}
        submitting={submitting}
      />
    </div>
  );
}