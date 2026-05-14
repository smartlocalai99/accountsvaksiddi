import { useEffect, useMemo, useState } from "react";
import { withAuthPage } from "@/lib/withAuthPage";

export const getServerSideProps = withAuthPage({ path: "/fees" });

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function StatusBadge({ status }) {
  const styles = {
    Paid: "bg-green-100 text-green-700",
    Partial: "bg-yellow-100 text-yellow-700",
    Pending: "bg-red-100 text-red-700",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${styles[status] || "bg-slate-100 text-slate-700"}`}>
      {status}
    </span>
  );
}

export default function FeesPage() {
  const [rows, setRows] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [monthly, setMonthly] = useState([]);
const [month, setMonth] = useState(() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
});  const [loading, setLoading] = useState(false);

  async function fetchFees() {
    setLoading(true);
    const params = new URLSearchParams();
    if (month) params.set("month", month);

    const res = await fetch(`/api/fees?${params.toString()}`);
    const data = await res.json();

    if (data.success) {
      setRows(data.records || []);
      setMetrics(data.metrics || {});
      setMonthly(data.monthly || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchFees();
  }, [month]);

  const maxMonthly = useMemo(
    () => Math.max(...monthly.map((m) => Number(m.collected || 0)), 1),
    [monthly]
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Fees</h1>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Track total fees, collections, pending balances, and student-wise fee status.
              </p>
            </div>

            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900"
            />
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total Fees</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">{formatCurrency(metrics.totalFees)}</h2>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total Collected</p>
            <h2 className="mt-3 text-3xl font-bold text-green-700">{formatCurrency(metrics.totalCollected)}</h2>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Pending Fees</p>
            <h2 className="mt-3 text-3xl font-bold text-red-700">{formatCurrency(metrics.pendingFees)}</h2>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Today's Collection</p>
            <h2 className="mt-3 text-3xl font-bold text-blue-700">{formatCurrency(metrics.todayCollection)}</h2>
          </div>
        </div>

        <div className="mb-6 rounded-[1.75rem] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Monthly Collection</h2>

          <div className="mt-6 space-y-4">
            {monthly.map((item) => (
              <div key={item.month_label}>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-semibold text-slate-700">{item.month_label}</span>
                  <span className="font-bold text-slate-900">{formatCurrency(item.collected)}</span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-green-500"
                    style={{ width: `${Math.max(8, (Number(item.collected || 0) / maxMonthly) * 100)}%` }}
                  />
                </div>
              </div>
            ))}

            {monthly.length === 0 && (
              <p className="text-sm text-slate-500">No monthly collection data available.</p>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-lg font-bold text-slate-900">Student Fee Ledger</h2>
            <p className="mt-1 text-sm text-slate-500">
              Fee amount comes from admissions table and paid amount comes from fee_payments.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead style={{ backgroundColor: "#8B1F1F" }}>
                <tr>
                  {["Student", "Class", "Parent", "Total Fee", "Paid", "Balance", "Status"].map((h) => (
                    <th key={h} className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-white">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {rows.map((item) => (
                  <tr key={item.admission_id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{item.student_name}</p>
                      <p className="text-sm text-slate-500">Admission #{item.admission_id}</p>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-700">{item.class || "-"}</td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-slate-900">{item.father_name || "-"}</p>
                      <p className="text-sm text-slate-500">{item.father_mobile || "-"}</p>
                    </td>

                    <td className="px-5 py-4 text-sm font-bold text-slate-900">{formatCurrency(item.total_fee)}</td>
                    <td className="px-5 py-4 text-sm font-bold text-green-700">{formatCurrency(item.paid_amount)}</td>
                    <td className="px-5 py-4 text-sm font-bold text-red-700">{formatCurrency(item.balance_amount)}</td>

                    <td className="px-5 py-4">
                      <StatusBadge status={item.payment_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {loading && (
              <div className="p-10 text-center text-sm font-semibold text-slate-500">
                Loading fees...
              </div>
            )}

            {!loading && rows.length === 0 && (
              <div className="p-10 text-center text-sm text-slate-500">
                No fee records found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}