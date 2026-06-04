import { useEffect, useMemo, useState } from "react";
import { withAuthPage } from "@/lib/withAuthPage";

export const getServerSideProps = withAuthPage({ path: "/payroll" });

const emptyForm = {
  staff_id: "",
payroll_month: new Date().toLocaleString("en-US", {
  month: "short",
}).toUpperCase(),  payroll_year: new Date().getFullYear(),
  working_days: 26,
  leave_days: 0,
  lop_days: 0,
  carry_forward_leaves: 0,
  basic_salary: 0,
  increment_amount: 0,
  bonus_amount: 0,
  deduction_amount: 2500,
  payment_status: "PENDING",
  payment_date: "",
  payment_mode: "Bank Transfer",
  reference_no: "",
  remarks: "",
  created_by: "Admin",
};

function money(v) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(v) || 0);
}

function StatusBadge({ status }) {
  const styles = {
    PAID: "bg-green-100 text-green-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    PARTIAL: "bg-blue-100 text-blue-700",
    HOLD: "bg-red-100 text-red-700",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${styles[status] || "bg-slate-100 text-slate-700"}`}>
      {status}
    </span>
  );
}

function PayrollModal({ open, form, setForm, staff, onClose, onSubmit, submitting }) {
  if (!open) return null;

  const netSalary =
    Number(form.basic_salary || 0) +
    Number(form.increment_amount || 0) +
    Number(form.bonus_amount || 0) -
    Number(form.deduction_amount || 0);

  function input(name, label, type = "text") {
    return (
      <div>
        <label className="mb-1 block text-xs font-bold uppercase text-slate-500">{label}</label>
        <input
          type={type}
          value={form[name] || ""}
          onChange={(e) => setForm((p) => ({ ...p, [name]: e.target.value }))}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b bg-white p-5">
          <h2 className="text-xl font-bold text-slate-900">Add / Edit Payroll</h2>
          <button onClick={onClose} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold">
            Close
          </button>
        </div>

        <div className="space-y-6 p-5">
          <section>
            <h3 className="mb-3 font-bold text-slate-900">Staff & Month</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Staff</label>
                <select
                  value={form.staff_id}
                  onChange={(e) => {
                    const selected = staff.find((s) => String(s.id) === e.target.value);
                    setForm((p) => ({
                      ...p,
                      staff_id: e.target.value,
                      basic_salary: selected?.monthly_salary || 0,
                    }));
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
                >
                  <option value="">Select Staff</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} - {s.designation || s.staff_type}
                    </option>
                  ))}
                </select>
              </div>

            <div>
  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
    Month
  </label>

  <select
    value={form.payroll_month}
    onChange={(e) =>
      setForm((p) => ({
        ...p,
        payroll_month: e.target.value,
      }))
    }
    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
  >
    {[
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC",
    ].map((m) => (
      <option key={m} value={m}>
        {m}
      </option>
    ))}
  </select>
</div>

{input("payroll_year", "Year", "number")}
            </div>
          </section>

          <section>
            <h3 className="mb-3 font-bold text-slate-900">Leaves</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {input("working_days", "Working Days", "number")}
              {input("leave_days", "Leave Days", "number")}
              {input("lop_days", "LOP Days", "number")}
              {input("carry_forward_leaves", "Carry Forward Leaves", "number")}
            </div>
          </section>

          <section>
            <h3 className="mb-3 font-bold text-slate-900">Salary</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {input("basic_salary", "Basic Salary", "number")}
              {input("increment_amount", "Increment", "number")}
              {input("bonus_amount", "Bonus", "number")}
              {input("deduction_amount", "Deduction", "number")}
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Net Salary</p>
              <h3 className="mt-1 text-3xl font-black text-green-700">{money(netSalary)}</h3>
            </div>
          </section>

          <section>
            <h3 className="mb-3 font-bold text-slate-900">Payment</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Status</label>
                <select
                  value={form.payment_status}
                  onChange={(e) => setForm((p) => ({ ...p, payment_status: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
                >
                  <option>PENDING</option>
                  <option>PAID</option>
                  <option>PARTIAL</option>
                  <option>HOLD</option>
                </select>
              </div>

              {input("payment_date", "Payment Date", "date")}

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Payment Mode</label>
                <select
                  value={form.payment_mode}
                  onChange={(e) => setForm((p) => ({ ...p, payment_mode: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
                >
                  <option>Cash</option>
                  <option>Bank Transfer</option>
                  <option>UPI</option>
                  <option>Cheque</option>
                </select>
              </div>

              {input("reference_no", "Reference No")}
              {input("created_by", "Created By")}
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Remarks</label>
              <textarea
                value={form.remarks || ""}
                onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
              />
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-white p-5">
          <button onClick={onClose} className="rounded-xl border px-5 py-2 text-sm font-bold">
            Cancel
          </button>
          <button
            onClick={() => onSubmit(netSalary)}
            disabled={submitting}
            className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save Payroll"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PayrollPage() {
  const [payroll, setPayroll] = useState([]);
  const [staff, setStaff] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [form, setForm] = useState(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [filterMonthYear, setFilterMonthYear] = useState(`${emptyForm.payroll_month} ${emptyForm.payroll_year}`);

  async function fetchData() {
    const res = await fetch("/api/payroll");
    const data = await res.json();

    if (data.success) {
      setPayroll(data.payroll || []);
      setStaff(data.staff || []);
      setMetrics(data.metrics || {});
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function openAdd() {
    setSelectedId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(row) {
    setSelectedId(row.id);
    setForm({
      staff_id: row.staff_id,
      payroll_month: row.payroll_month,
      payroll_year: row.payroll_year,
      working_days: row.working_days,
      leave_days: row.leave_days,
      lop_days: row.lop_days,
      carry_forward_leaves: row.carry_forward_leaves,
      basic_salary: row.basic_salary,
      increment_amount: row.increment_amount,
      bonus_amount: row.bonus_amount,
      deduction_amount: row.deduction_amount,
      payment_status: row.payment_status,
      payment_date: row.payment_date ? String(row.payment_date).split("T")[0] : "",
      payment_mode: row.payment_mode || "Bank Transfer",
      reference_no: row.reference_no || "",
      remarks: row.remarks || "",
      created_by: row.created_by || "Admin",
    });
    setModalOpen(true);
  }

  async function savePayroll(netSalary) {
    try {
      if (!form.staff_id) {
        setMessage("Please select staff");
        return;
      }

      setSubmitting(true);

      const method = selectedId ? "PUT" : "POST";
      const url = selectedId ? `/api/payroll?id=${selectedId}` : "/api/payroll";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, net_salary: netSalary }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to save payroll");

      setMessage("Payroll saved successfully");
      setModalOpen(false);
      fetchData();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function markPaid(row) {
    const ok = window.confirm(`Mark salary paid for ${row.full_name}?`);
    if (!ok) return;

    const res = await fetch(`/api/payroll?id=${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payment_status: "PAID",
        payment_date: new Date().toISOString().slice(0, 10),
        payment_mode: row.payment_mode || "Bank Transfer",
      }),
    });

    const data = await res.json();
    if (data.success) fetchData();
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
       

        {message && <div className="mb-4 rounded-2xl bg-white p-4 text-sm font-bold shadow-sm">{message}</div>}

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total Payout</p>
            <h2 className="mt-3 text-3xl font-black">₹30,500</h2>
          </div>
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Paid</p>
            <h2 className="mt-3 text-3xl font-black text-green-700">{money(metrics.paidPayroll)}</h2>
          </div>
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Pending</p>
            <h2 className="mt-3 text-3xl font-black text-red-700">{money(metrics.pendingPayroll)}</h2>
          </div>
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Deductions</p>
            <h2 className="mt-3 text-3xl font-black text-orange-600">₹2,500</h2>
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Payroll Register</h2>
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-slate-600">Month:</label>
              <select
                value={filterMonthYear}
                onChange={(e) => {
                  const [month, year] = e.target.value.split(" ");
                  setFilterMonthYear(e.target.value);
                  setForm((p) => ({ ...p, payroll_month: month, payroll_year: Number(year) }));
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold outline-none focus:border-slate-900 min-w-[150px]"
              >
                {[2024, 2025, 2026].flatMap((year) =>
                  ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"].map((month) => (
                    <option key={`${month}-${year}`} value={`${month} ${year}`}>
                      {month} {year}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-primary">
                <tr>
                  {["Staff", "Month", "Salary", "Leaves", "Deductions", "Net Salary", "Status", "Mode", "Actions"].map((h) => (
                    <th key={h} className="px-5 py-4 text-left text-xs font-bold uppercase text-white">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {payroll.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-900">{row.full_name}</p>
                      <p className="text-sm text-slate-500">{row.designation || row.staff_type}</p>
                    </td>
                    <td className="px-5 py-4 text-sm">
{row.payroll_month} {row.payroll_year}                    </td>
                    <td className="px-5 py-4 text-sm">{money(row.basic_salary)}</td>
                    <td className="px-5 py-4 text-sm">
                      Leave: {row.leave_days || 0}, LOP: {row.lop_days || 0}
                    </td>
                    <td className="px-5 py-4 text-sm text-red-600 font-bold">{money(row.deduction_amount)}</td>
                    <td className="px-5 py-4 text-sm font-black text-slate-900">{money(row.net_salary)}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={row.payment_status} />
                    </td>
                    <td className="px-5 py-4 text-sm">{row.payment_mode || "-"}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(row)} className="rounded-xl border px-3 py-2 text-xs font-bold">
                          Edit
                        </button>
                        {row.payment_status !== "PAID" && (
                          <button
                            onClick={() => markPaid(row)}
                            className="rounded-xl bg-green-600 px-3 py-2 text-xs font-bold text-white"
                          >
                            Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {payroll.length === 0 && (
              <div className="p-10 text-center text-sm text-slate-500">
                No payroll records found.
              </div>
            )}
          </div>
        </div>
      </div>

      <PayrollModal
        open={modalOpen}
        form={form}
        setForm={setForm}
        staff={staff}
        onClose={() => setModalOpen(false)}
        onSubmit={savePayroll}
        submitting={submitting}
      />
    </div>
  );
}