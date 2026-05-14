import { useEffect, useMemo, useState } from "react";
import { withAuthPage } from "@/lib/withAuthPage";

export const getServerSideProps = withAuthPage({ path: "/reports" });

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatCount(value) {
  return new Intl.NumberFormat("en-IN").format(Number(value) || 0);
}

function safePercent(value) {
  return Math.min(100, Math.max(0, Math.round(Number(value || 0))));
}

function KpiChartCard({ title, value, note, percent = 0, tone = "bg-blue-500", accent }) {
  const cleanPercent = safePercent(percent);

  // Prefer explicit `accent` if provided (should be a `text-...` class).
  // Otherwise derive a reasonable accent from the `tone` by replacing `bg-` with `text-`.
  const textTone = accent || tone.replace("bg-", "text-");

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <h2 className="mt-3 text-3xl font-black text-slate-900">{value}</h2>
        </div>

        <div className={`relative h-16 w-16 rounded-full ${textTone}`}>
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(currentColor ${cleanPercent}%, #e2e8f0 0)`,
            }}
          />
          <div className="absolute inset-2 rounded-full bg-white" />
          <div className={`absolute inset-0 flex items-center justify-center text-xs font-black ${textTone}`}>
            {cleanPercent}%
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-500">{note}</p>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${cleanPercent}%` }} />
      </div>
    </div>
  );
}

function BarRow({ label, value, max, type = "currency", color = "bg-gradient-to-r from-blue-400 to-blue-600" }) {
  const width = max > 0 ? Math.max(8, (Number(value || 0) / max) * 100) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="font-bold text-slate-900">
          {type === "currency" ? formatCurrency(value) : formatCount(value)}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [data, setData] = useState({
    totalStudents: 0,
    totalAdmissions: 0,
    totalFees: 0,
    totalCollected: 0,
    pendingFees: 0,
    todayCollection: 0,
    expenses: 0,
    salaries: 0,
    totalAssets: 0,
    assetValue: 0,
    netSurplus: 0,
    monthlyCollections: [],
    expenseBreakdown: [],
    classWiseFees: [],
    recentPayments: [],
    pendingStudents: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchReports() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (month) params.set("month", month);

      const res = await fetch(`/api/reports?${params.toString()}`);
      const result = await res.json();

      if (!result.success) throw new Error(result.error || "Unable to load reports");

      setData(result.data || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReports();
  }, [month]);

  const collectionPercent = data.totalFees
    ? (Number(data.totalCollected || 0) / Number(data.totalFees || 1)) * 100
    : 0;

  const pendingPercent = data.totalFees
    ? (Number(data.pendingFees || 0) / Number(data.totalFees || 1)) * 100
    : 0;

  const todayPercent = data.totalCollected
    ? (Number(data.todayCollection || 0) / Number(data.totalCollected || 1)) * 100
    : 0;

  const collectionMax = useMemo(
    () => Math.max(...(data.monthlyCollections || []).map((x) => Number(x.amount || 0)), 1),
    [data.monthlyCollections]
  );

  const expenseMax = useMemo(
    () => Math.max(...(data.expenseBreakdown || []).map((x) => Number(x.amount || 0)), 1),
    [data.expenseBreakdown]
  );

  const classFeeMax = useMemo(
    () => Math.max(...(data.classWiseFees || []).map((x) => Number(x.collected || 0)), 1),
    [data.classWiseFees]
  );

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "fees", label: "Fee Reports" },
    { key: "finance", label: "Finance" },
    { key: "operations", label: "Operations" },
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">
                Reports
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                Operational and financial reporting for admissions, fees, expenses,
                salaries, assets, and school performance.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900"
              />

              <button
                onClick={fetchReports}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-700"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="mb-4 rounded-2xl bg-white p-4 text-sm font-bold text-slate-500 shadow-sm">
            Loading reports...
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <KpiChartCard
            title="Total Fee Demand"
            value={formatCurrency(data.totalFees)}
            note="Total fees from admissions."
            percent={0}
            tone="bg-indigo-500"
            accent="text-indigo-600"
          />

          <KpiChartCard
            title="Total Collected"
            value={formatCurrency(data.totalCollected)}
            note="Payments collected from parents."
            percent={collectionPercent}
            tone="bg-green-500"
            accent="text-emerald-500"
          />

          <KpiChartCard
            title="Pending Fees"
            value={formatCurrency(data.pendingFees)}
            note="Receivables still pending."
            percent={pendingPercent}
            tone="bg-red-500"
            accent="text-rose-500"
          />

          <KpiChartCard
            title="Net Surplus"
            value={formatCurrency(data.netSurplus)}
            note="Collection minus expenses and salaries."
            percent={0}
            tone={Number(data.netSurplus || 0) >= 0 ? "bg-blue-500" : "bg-red-500"}
            accent={Number(data.netSurplus || 0) >= 0 ? "text-blue-600" : "text-rose-500"}
          />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <KpiChartCard
            title="Students"
            value={formatCount(data.totalStudents)}
            note="Active student records."
            percent={0}
            tone="bg-sky-500"
            accent="text-sky-600"
          />

          <KpiChartCard
            title="Admissions"
            value={formatCount(data.totalAdmissions)}
            note="Admissions recorded."
            percent={0}
            tone="bg-purple-500"
            accent="text-purple-600"
          />

          <KpiChartCard
            title="Asset Value"
            value={formatCurrency(data.assetValue)}
            note="Total school asset value."
            percent={0}
            tone="bg-emerald-500"
            accent="text-emerald-600"
          />

          <KpiChartCard
            title="Today Collection"
            value={formatCurrency(data.todayCollection)}
            note="Payments collected today."
            percent={todayPercent}
            tone="bg-violet-500"
            accent="text-violet-600"
          />
        </div>

        <div className="mb-6 rounded-3xl bg-white p-2 shadow-sm">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                  activeTab === tab.key
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "overview" && (
          <div className="grid gap-8 xl:grid-cols-2">
            <div className="rounded-3xl border border-slate-100 bg-gradient-to-br from-white to-blue-50 p-8 shadow-lg hover:shadow-xl transition">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl">
                  <svg xmlns='http://www.w3.org/2000/svg' className='text-white w-6 h-6' fill='currentColor' viewBox='0 0 24 24'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/></svg>
                </div>
                <h2 className="text-2xl font-black text-slate-900">Monthly Collections</h2>
              </div>
              <p className="mb-6 text-base text-slate-600">Fee collection trend by month.</p>
              <div className="space-y-4">
                {(data.monthlyCollections || []).map((item) => (
                  <BarRow key={item.month} label={item.month} value={item.amount} max={collectionMax} color="bg-gradient-to-r from-green-400 to-emerald-500" />
                ))}
                {(data.monthlyCollections || []).length === 0 && (
                  <p className="text-sm text-slate-500">No collection data.</p>
                )}
              </div>
            </div>
            
            <div className="rounded-3xl border border-slate-100 bg-gradient-to-br from-white to-orange-50 p-8 shadow-lg hover:shadow-xl transition">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl">
                  <svg xmlns='http://www.w3.org/2000/svg' className='text-white w-6 h-6' fill='currentColor' viewBox='0 0 24 24'><path d='M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2V17zm4 0h-2V7h2V17zm4 0h-2v-4h2V17z'/></svg>
                </div>
                <h2 className="text-2xl font-black text-slate-900">Expense Breakdown</h2>
              </div>
              <p className="mb-6 text-base text-slate-600">Category-wise expense outflow.</p>
              <div className="space-y-4">
                {(data.expenseBreakdown || []).map((item) => (
                  <BarRow key={item.category} label={item.category} value={item.amount} max={expenseMax} color="bg-gradient-to-r from-orange-400 to-red-500" />
                ))}
                {(data.expenseBreakdown || []).length === 0 && (
                  <p className="text-sm text-slate-500">No expense data.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "fees" && (
          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-3xl border border-slate-100 bg-gradient-to-br from-white to-indigo-50 p-8 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-br from-indigo-400 to-blue-500 rounded-2xl">
                  <svg xmlns='http://www.w3.org/2000/svg' className='text-white w-6 h-6' fill='currentColor' viewBox='0 0 24 24'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z'/></svg>
                </div>
                <h2 className="text-2xl font-black text-slate-900">Class-wise Fee Collection</h2>
              </div>

              <div className="mt-6 space-y-4">
                {(data.classWiseFees || []).map((item) => (
                  <BarRow key={item.class} label={`Class ${item.class}`} value={item.collected} max={classFeeMax} color="bg-gradient-to-r from-indigo-400 to-blue-500" />
                ))}

                {(data.classWiseFees || []).length === 0 && (
                  <p className="text-sm text-slate-500">No class-wise data.</p>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-lg">
              <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 px-8 py-6">
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 bg-gradient-to-br from-red-400 to-pink-500 rounded-xl">
                    <svg xmlns='http://www.w3.org/2000/svg' className='text-white w-5 h-5' fill='currentColor' viewBox='0 0 24 24'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z'/></svg>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900">Pending Fee Students</h2>
                </div>
                <p className="text-sm text-slate-600 ml-11">Students with outstanding balances.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead style={{ backgroundColor: "#8B1F1F" }}>
                    <tr>
                      {["Student", "Class", "Parent", "Total", "Paid", "Balance"].map((h) => (
                        <th key={h} className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-white">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {(data.pendingStudents || []).map((item) => (
                      <tr key={item.admission_id} className="hover:bg-slate-50 transition">
                        <td className="px-5 py-4 font-semibold text-slate-900">{item.student_name}</td>
                        <td className="px-5 py-4 text-sm text-slate-700">{item.class || "-"}</td>
                        <td className="px-5 py-4 text-sm text-slate-700">{item.father_name || "-"}</td>
                        <td className="px-5 py-4 text-sm font-bold">{formatCurrency(item.total_fee)}</td>
                        <td className="px-5 py-4 text-sm font-bold text-emerald-600">{formatCurrency(item.paid_amount)}</td>
                        <td className="px-5 py-4 text-sm font-bold text-red-600">{formatCurrency(item.balance_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {(data.pendingStudents || []).length === 0 && (
                  <div className="p-8 text-center text-sm text-slate-500">No pending fee students found.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "finance" && (
          <div className="grid gap-6 xl:grid-cols-3">
            <div className="rounded-3xl border border-slate-100 bg-gradient-to-br from-white to-cyan-50 p-8 shadow-lg hover:shadow-xl transition">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl">
                  <svg xmlns='http://www.w3.org/2000/svg' className='text-white w-6 h-6' fill='currentColor' viewBox='0 0 24 24'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 20c-5.52 0-10-4.48-10-10S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 10 15.5 10 14 10.67 14 11.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 10 8.5 10 7 10.67 7 11.5 7.67 13 8.5 13zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z'/></svg>
                </div>
                <h2 className="text-xl font-black text-slate-900">P&L Summary</h2>
              </div>
              <div className="mt-6 space-y-4">
                <div className="flex justify-between pb-3 border-b border-slate-200">
                  <span className="text-sm font-semibold text-slate-600">Fee Income</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(data.totalCollected)}</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-slate-200">
                  <span className="text-sm font-semibold text-slate-600">Expenses</span>
                  <span className="font-bold text-red-600">{formatCurrency(data.expenses)}</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-slate-200">
                  <span className="text-sm font-semibold text-slate-600">Salaries</span>
                  <span className="font-bold text-red-600">{formatCurrency(data.salaries)}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="font-bold text-slate-900">Net Surplus</span>
                  <span className="font-black text-lg bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">{formatCurrency(data.netSurplus)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-gradient-to-br from-white to-red-50 p-8 shadow-lg hover:shadow-xl transition">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-br from-red-400 to-pink-500 rounded-2xl">
                  <svg xmlns='http://www.w3.org/2000/svg' className='text-white w-6 h-6' fill='currentColor' viewBox='0 0 24 24'><path d='M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z'/></svg>
                </div>
                <h2 className="text-xl font-black text-slate-900">Receivables</h2>
              </div>
              <p className="mt-6 text-4xl font-black text-red-600">{formatCurrency(data.pendingFees)}</p>
              <p className="mt-4 text-sm leading-6 text-slate-600">Fees still pending from parents/students.</p>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-gradient-to-br from-white to-emerald-50 p-8 shadow-lg hover:shadow-xl transition">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl">
                  <svg xmlns='http://www.w3.org/2000/svg' className='text-white w-6 h-6' fill='currentColor' viewBox='0 0 24 24'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/></svg>
                </div>
                <h2 className="text-xl font-black text-slate-900">Assets</h2>
              </div>
              <p className="mt-6 text-4xl font-black text-emerald-600">{formatCurrency(data.assetValue)}</p>
              <p className="mt-4 text-sm leading-6 text-slate-600">Value of assets tracked in asset register.</p>
            </div>
          </div>
        )}

        {activeTab === "operations" && (
          <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-lg">
            <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 px-8 py-6">
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-xl">
                  <svg xmlns='http://www.w3.org/2000/svg' className='text-white w-5 h-5' fill='currentColor' viewBox='0 0 24 24'><path d='M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54h2.75v2.71h2.92v-2.71h2.75L13.96 9.29z'/></svg>
                </div>
                <h2 className="text-2xl font-black text-slate-900">Recent Payments</h2>
              </div>
              <p className="text-sm text-slate-600 ml-11">Latest fee collections entered by accountant.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead style={{ backgroundColor: "#8B1F1F" }}>
                  <tr>
                    {["Receipt", "Student", "Amount", "Mode", "Date", "Collected By"].map((h) => (
                      <th key={h} className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-white">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {(data.recentPayments || []).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-4 font-semibold text-slate-900">{item.receipt_no}</td>
                      <td className="px-5 py-4 text-sm text-slate-700">{item.student_name || "-"}</td>
                      <td className="px-5 py-4 text-sm font-bold text-emerald-600">{formatCurrency(item.amount_paid)}</td>
                      <td className="px-5 py-4 text-sm text-slate-700">{item.payment_mode}</td>
                      <td className="px-5 py-4 text-sm text-slate-700">{item.payment_date || "-"}</td>
                      <td className="px-5 py-4 text-sm text-slate-700">{item.collected_by || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {(data.recentPayments || []).length === 0 && (
                <div className="p-8 text-center text-sm text-slate-500">No recent payments found.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}