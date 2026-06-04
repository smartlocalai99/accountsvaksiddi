import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/reportDataUtils";
import { withAuthPage } from "@/lib/withAuthPage";

export const getServerSideProps = withAuthPage({ path: "/bank-cash" });

const COLORS = {
  cash: "#16a34a",
  bank: "#2563eb",
  total: "#9333ea",
  opening: "#2563eb",
  collection: "#16a34a",
  payment: "#dc2626",
  closing: "#9333ea",
  slate: "#475569",
};

function toNumber(value) {
  return Number(value || 0);
}

function formatAxisCurrency(value) {
  const absValue = Math.abs(Number(value || 0));
  const prefix = Number(value) < 0 ? "−" : "";

  if (absValue >= 100000) {
    return `${prefix}₹${Math.round(absValue / 100000)}L`;
  }

  if (absValue >= 1000) {
    return `${prefix}₹${Math.round(absValue / 1000)}k`;
  }

  return `${prefix}₹${absValue}`;
}

function formatTooltipCurrency(value) {
  const numberValue = Number(value || 0);
  const prefix = numberValue < 0 ? "−" : "";
  return `${prefix}${formatCurrency(Math.abs(numberValue))}`;
}

function CashBankDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("today");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/cash-bank");
        const json = await res.json();

        if (json.data) {
          setData(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch cash/bank data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center bg-gray-50">
        <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-red-500">
        Failed to load data
      </div>
    );
  }

  const {
    summary = {},
    today = {},
    collectionsBreakdown = {},
    monthlyTrend = [],
  } = data;

  const cashInHand = toNumber(summary.cashInHand);
  const bankBalance = toNumber(summary.bankBalance);
  const totalBalance = toNumber(summary.totalLiquid) || cashInHand + bankBalance;

  const todaysCollection =
    toNumber(summary.todaysCollection) ||
    toNumber(today.feeCollections) + toNumber(today.otherIncome);

  const todayOpening = toNumber(today.openingBalance);
  const todayPayments = toNumber(today.expenses) + toNumber(today.salaryPaid);
  const closingBalance = toNumber(today.closingBalance);

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <style jsx global>{`
        .cash-bank-charts .recharts-wrapper,
        .cash-bank-charts .recharts-wrapper *,
        .cash-bank-charts .recharts-surface,
        .cash-bank-charts .recharts-layer,
        .cash-bank-charts svg,
        .cash-bank-charts svg * {
          outline: none !important;
        }

        .cash-bank-charts .recharts-wrapper:focus,
        .cash-bank-charts .recharts-wrapper *:focus,
        .cash-bank-charts .recharts-surface:focus,
        .cash-bank-charts svg:focus,
        .cash-bank-charts svg *:focus {
          outline: none !important;
        }
      `}</style>

      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
            Cash & Bank Dashboard
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Daily cash position, collections breakdown & monthly trends
          </p>
        </div>

        {/* Graph Overview */}
        <CashBankGraphOverview
          cashInHand={cashInHand}
          bankBalance={bankBalance}
          totalBalance={totalBalance}
          todayOpening={todayOpening}
          todaysCollection={todaysCollection}
          todayPayments={todayPayments}
          closingBalance={closingBalance}
          monthlyTrend={monthlyTrend}
        />

        {/* Tab Navigation */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex overflow-x-auto border-b border-slate-200">
            {[
              { id: "today", label: "📅 Today" },
              { id: "collections", label: "💳 Collections" },
              { id: "monthly", label: "📈 Monthly" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-4 py-3 text-center text-sm font-medium transition-all outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 active:outline-none ${
                  activeTab === tab.id
                    ? "border-b-2 border-slate-900 bg-slate-50 font-bold text-slate-900"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-4 md:p-6">
            {activeTab === "today" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <MiniCard
                    title="Opening"
                    value={formatCurrency(today.openingBalance)}
                    cardClass="border-blue-200 bg-blue-50"
                    valueClass="text-blue-900"
                  />

                  <MiniCard
                    title="Receipts"
                    value={formatCurrency(
                      toNumber(today.feeCollections) + toNumber(today.otherIncome)
                    )}
                    cardClass="border-green-200 bg-green-50"
                    valueClass="text-green-900"
                  />

                  <MiniCard
                    title="Payments"
                    value={formatCurrency(
                      toNumber(today.expenses) + toNumber(today.salaryPaid)
                    )}
                    cardClass="border-red-200 bg-red-50"
                    valueClass="text-red-900"
                  />

                  <MiniCard
                    title="Closing"
                    value={formatCurrency(today.closingBalance)}
                    cardClass="border-purple-200 bg-purple-50"
                    valueClass="text-purple-900"
                  />
                </div>

                {/* Detailed Cashbook */}
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                  <table className="w-full min-w-[650px] text-sm">
                    <tbody className="divide-y divide-slate-200">
                      <tr className="bg-slate-50 hover:bg-slate-100">
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          Opening Balance
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-blue-700">
                          {formatCurrency(today.openingBalance)}
                        </td>
                      </tr>

                      <tr className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-700">
                          Fee Collections
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-green-700">
                          +{formatCurrency(today.feeCollections)}
                        </td>
                      </tr>

                      <tr className="bg-slate-50 hover:bg-slate-100">
                        <td className="px-4 py-3 text-slate-700">
                          Other Income
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-green-700">
                          +{formatCurrency(today.otherIncome)}
                        </td>
                      </tr>

                      <tr className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-700">Expenses</td>
                        <td className="px-4 py-3 text-right font-semibold text-red-700">
                          −{formatCurrency(today.expenses)}
                        </td>
                      </tr>

                      <tr className="bg-slate-50 hover:bg-slate-100">
                        <td className="px-4 py-3 text-slate-700">
                          Salary Paid
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-red-700">
                          −{formatCurrency(today.salaryPaid)}
                        </td>
                      </tr>

                      <tr className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-700">
                          Bank Deposit
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-700">
                          −{formatCurrency(today.cashDeposit)}
                        </td>
                      </tr>

                      <tr className="bg-slate-50 hover:bg-slate-100">
                        <td className="px-4 py-3 text-slate-700">
                          Bank Withdrawal
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-700">
                          +{formatCurrency(today.cashWithdrawal)}
                        </td>
                      </tr>

                      <tr className="border-t-2 border-purple-200 bg-purple-50">
                        <td className="px-4 py-3 font-bold text-purple-900">
                          Closing Balance
                        </td>
                        <td className="px-4 py-3 text-right text-lg font-bold text-purple-900">
                          {formatCurrency(today.closingBalance)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "collections" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-5">
                  <p className="text-sm font-bold uppercase text-slate-700">
                    Cash Receipts
                  </p>
                  <p className="mt-3 text-2xl font-black text-green-700">
                    {collectionsBreakdown.cash}
                  </p>
                  <p className="mt-2 text-xs text-slate-600">
                    Transactions
                  </p>
                </div>

                <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-5">
                  <p className="text-sm font-bold uppercase text-slate-700">
                    Online / UPI
                  </p>
                  <p className="mt-3 text-2xl font-black text-blue-700">
                    {collectionsBreakdown.upi}
                  </p>
                  <p className="mt-2 text-xs text-slate-600">
                    Transactions
                  </p>
                </div>
              </div>
            )}

            {activeTab === "monthly" && (
              <div className="overflow-x-auto rounded-2xl border-2 border-slate-200 bg-white">
                <table className="w-full min-w-[700px] text-sm">
                  <thead>
                    <tr className="border-b-2 border-slate-200 bg-slate-50">
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.2em] text-slate-700">
                        Month
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.2em] text-slate-700">
                        Opening
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.2em] text-slate-700">
                        Deposits
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.2em] text-slate-700">
                        Withdrawals
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.2em] text-slate-700">
                        Closing
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {monthlyTrend.map((month, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {month.month}
                        </td>

                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          {formatCurrency(month.opening)}
                        </td>

                        <td className="px-4 py-3 text-right font-bold text-green-700">
                          +{formatCurrency(month.deposits)}
                        </td>

                        <td className="px-4 py-3 text-right font-bold text-red-700">
                          −{formatCurrency(month.withdrawals)}
                        </td>

                        <td className="px-4 py-3 text-right font-black text-purple-700">
                          {formatCurrency(month.closing)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CashBankGraphOverview({
  cashInHand,
  bankBalance,
  totalBalance,
  todayOpening,
  todaysCollection,
  todayPayments,
  closingBalance,
  monthlyTrend,
}) {
  const [graphView, setGraphView] = useState("today");

  const balanceData = [
    { name: "Cash", value: cashInHand },
    { name: "Bank", value: bankBalance },
  ];

  const todayMovementData = [
    {
      name: "Opening",
      amount: todayOpening,
      type: "opening",
    },
    {
      name: "Collection",
      amount: todaysCollection,
      type: "collection",
    },
    {
      name: "Expenses",
      amount: -Math.abs(todayPayments),
      type: "payment",
    },
    {
      name: "Closing",
      amount: closingBalance,
      type: "closing",
    },
  ];

  const monthlyMovementData = Array.isArray(monthlyTrend)
    ? monthlyTrend.map((month) => ({
        month: month.month,
        opening: toNumber(month.opening),
        deposits: toNumber(month.deposits),
        withdrawals: -Math.abs(toNumber(month.withdrawals)),
        closing: toNumber(month.closing),
      }))
    : [];

  return (
    <div className="cash-bank-charts mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
      {/* Donut Chart */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              Balance Split
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Cash in hand vs available bank balance
            </p>
          </div>

          <div className="rounded-full bg-purple-50 px-4 py-2 text-sm font-black text-purple-700">
            {formatCurrency(totalBalance)}
          </div>
        </div>

        <div className="mt-4 h-[270px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={balanceData}
                dataKey="value"
                nameKey="name"
                innerRadius={68}
                outerRadius={98}
                paddingAngle={4}
              >
                <Cell fill={COLORS.cash} />
                <Cell fill={COLORS.bank} />
              </Pie>

              <Tooltip
                formatter={(value) => formatCurrency(value)}
                contentStyle={{
                  borderRadius: "14px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 10px 25px rgba(15, 23, 42, 0.08)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <GraphLegendCard
            title="Cash"
            value={formatCurrency(cashInHand)}
            dotClass="bg-green-600"
          />

          <GraphLegendCard
            title="Bank"
            value={formatCurrency(bankBalance)}
            dotClass="bg-blue-600"
          />
        </div>
      </div>

      {/* Movement Chart */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              Money Movement
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Opening, income, expense and closing view
            </p>
          </div>

          <div className="flex w-fit rounded-full bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setGraphView("today")}
              className={`rounded-full px-4 py-2 text-xs font-black transition-all outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 active:outline-none ${
                graphView === "today"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Today
            </button>

            <button
              type="button"
              onClick={() => setGraphView("monthly")}
              className={`rounded-full px-4 py-2 text-xs font-black transition-all outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 active:outline-none ${
                graphView === "monthly"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        <div className="mt-4 h-[310px] outline-none">
          <ResponsiveContainer width="100%" height="100%">
            {graphView === "today" ? (
              <BarChart
                data={todayMovementData}
                barSize={48}
                margin={{ top: 18, right: 10, left: 0, bottom: 6 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <ReferenceLine y={0} stroke="#0f172a" strokeWidth={1.5} />

                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "#64748b", fontWeight: 700 }}
                />

                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  tickFormatter={formatAxisCurrency}
                />

                <Tooltip
                  formatter={(value) => [formatTooltipCurrency(value), "Amount"]}
                  labelStyle={{ fontWeight: 800, color: "#0f172a" }}
                  contentStyle={{
                    borderRadius: "14px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 10px 25px rgba(15, 23, 42, 0.08)",
                  }}
                />

                <Bar dataKey="amount" radius={[0, 0, 0, 0]} activeBar={false}>
                  {todayMovementData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={
                        entry.type === "opening"
                          ? COLORS.opening
                          : entry.type === "collection"
                          ? COLORS.collection
                          : entry.type === "payment"
                          ? COLORS.payment
                          : COLORS.closing
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <BarChart
                data={monthlyMovementData}
                margin={{ top: 18, right: 10, left: 0, bottom: 6 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <ReferenceLine y={0} stroke="#0f172a" strokeWidth={1.5} />

                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "#64748b", fontWeight: 700 }}
                />

                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  tickFormatter={formatAxisCurrency}
                />

                <Tooltip
                  formatter={(value) => [formatTooltipCurrency(value), "Amount"]}
                  labelStyle={{ fontWeight: 800, color: "#0f172a" }}
                  contentStyle={{
                    borderRadius: "14px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 10px 25px rgba(15, 23, 42, 0.08)",
                  }}
                />

                <Legend
                  wrapperStyle={{
                    paddingTop: "12px",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                />

                <Bar
                  dataKey="opening"
                  name="Opening"
                  fill={COLORS.opening}
                  radius={[0, 0, 0, 0]}
                  activeBar={false}
                />

                <Bar
                  dataKey="deposits"
                  name="Deposits"
                  fill={COLORS.collection}
                  radius={[0, 0, 0, 0]}
                  activeBar={false}
                />

                <Bar
                  dataKey="withdrawals"
                  name="Withdrawals"
                  fill={COLORS.payment}
                  radius={[0, 0, 0, 0]}
                  activeBar={false}
                />

                <Bar
                  dataKey="closing"
                  name="Closing"
                  fill={COLORS.closing}
                  radius={[0, 0, 0, 0]}
                  activeBar={false}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {graphView === "today" ? (
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <GraphLegendCard
              title="Opening"
              value={formatCurrency(todayOpening)}
              dotClass="bg-blue-600"
            />

            <GraphLegendCard
              title="Collection"
              value={`+${formatCurrency(todaysCollection)}`}
              dotClass="bg-green-600"
            />

            <GraphLegendCard
              title="Expenses"
              value={`−${formatCurrency(todayPayments)}`}
              dotClass="bg-red-600"
            />

            <GraphLegendCard
              title="Closing"
              value={formatCurrency(closingBalance)}
              dotClass="bg-purple-600"
            />
          </div>
        ) : (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Monthly view note
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-700">
              Deposits show upward. Withdrawals / expenses show downward, so you
              can clearly understand money in vs money out.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ title, value, subtitle, cardClass, valueClass }) {
  return (
    <div
      className={`rounded-2xl border-2 p-5 shadow-sm transition-shadow hover:shadow-md ${cardClass}`}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
        {title}
      </p>

      <p className={`mt-2 whitespace-nowrap text-2xl font-black ${valueClass}`}>
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-600">{subtitle}</p>
    </div>
  );
}

function MiniCard({ title, value, cardClass, valueClass }) {
  return (
    <div className={`rounded-2xl border-2 p-4 ${cardClass}`}>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-600">
        {title}
      </p>

      <p className={`mt-2 text-xl font-black ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

function GraphLegendCard({ title, value, dotClass }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="flex items-center gap-2">
        <span className={`h-3 w-3 rounded-full ${dotClass}`}></span>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          {title}
        </p>
      </div>

      <p className="mt-2 text-lg font-black text-slate-900">{value}</p>
    </div>
  );
}

export default CashBankDashboard;