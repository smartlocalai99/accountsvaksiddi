import Link from "next/link";
import {
  FaUsers,
  FaClipboardList,
  FaRupeeSign,
  FaWallet,
  FaCalendarDay,
  FaReceipt,
  FaBoxes,
  FaUserPlus,
  FaFileInvoiceDollar,
  FaRegCalendarCheck,
  FaChartLine,
  FaMoneyBillWave,
  FaGraduationCap,
  FaArrowRight,
  FaUserShield,
  FaClock,
} from "react-icons/fa";
import { getRoleLabel } from "@/lib/permissions";

export async function getServerSideProps(context) {
  const [{ withAuthPage }, { getDashboardProps }] = await Promise.all([
    import("@/lib/withAuthPage"),
    import("@/lib/dashboardData"),
  ]);

  const handler = withAuthPage({
    path: "/dashboard",
    getProps: getDashboardProps,
  });

  return handler(context);
}

const metricCards = [
  {
    label: "Total students",
    key: "totalStudents",
    href: "/students",
    icon: FaUsers,
    tone: "from-sky-50 to-cyan-50 text-sky-700",
    type: "count",
  },
  {
    label: "Total fees",
    key: "totalFees",
    href: "/fees",
    icon: FaRupeeSign,
    tone: "from-emerald-50 to-teal-50 text-emerald-700",
    type: "currency",
  },
  {
    label: "Pending fees",
    key: "pendingFees",
    href: "/fees",
    icon: FaWallet,
    tone: "from-amber-50 to-orange-50 text-amber-700",
    type: "currency",
  },
  {
    label: "Today's collection",
    key: "todaysCollection",
    href: "/fees",
    icon: FaCalendarDay,
    tone: "from-violet-50 to-fuchsia-50 text-violet-700",
    type: "currency",
  },
  {
    label: "Expenses",
    key: "expenses",
    href: "/expenses",
    icon: FaReceipt,
    tone: "from-rose-50 to-pink-50 text-rose-700",
    type: "currency",
  },
  {
    label: "Salaries",
    key: "salaries",
    href: "/payroll",
    icon: FaMoneyBillWave,
    tone: "from-blue-50 to-blue-100 text-blue-700",
    type: "currency",
  },
  {
    label: "Total assets",
    key: "totalAssets",
    href: "/assets",
    icon: FaBoxes,
    tone: "from-green-50 to-green-100 text-green-700",
    type: "count",
  },
];

const financeShortcuts = [
  {
    label: "Admission Form",
    href: "/admissions",
    icon: FaUserPlus,
    description: "Open admission entries.",
  },
  {
    label: "Fees Collection",
    href: "/fees",
    icon: FaFileInvoiceDollar,
    description: "Collect and review fees.",
  },
  {
    label: "Expenses Entry",
    href: "/expenses",
    icon: FaRegCalendarCheck,
    description: "Add daily expenses.",
  },
  {
    label: "Payroll",
    href: "/payroll",
    icon: FaMoneyBillWave,
    description: "Manage salary records.",
  },
  {
    label: "Reports",
    href: "/reports",
    icon: FaChartLine,
    description: "View finance reports.",
  },
];

const dashboardShortcuts = [
  {
    label: "Admissions",
    href: "/admissions",
    icon: FaUserPlus,
    description: "Track new applications.",
  },
  {
    label: "Students",
    href: "/students",
    icon: FaGraduationCap,
    description: "Manage student records.",
  },
  {
    label: "Fees",
    href: "/fees",
    icon: FaFileInvoiceDollar,
    description: "Check fee collections.",
  },
  {
    label: "Assets",
    href: "/assets",
    icon: FaBoxes,
    description: "Review school assets.",
  },
  {
    label: "Reports",
    href: "/reports",
    icon: FaChartLine,
    description: "Open dashboard reports.",
  },
];

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

function getMetricValue(item, metrics) {
  const rawValue = metrics[item.key];

  if (item.type === "count") {
    return formatCount(rawValue);
  }

  return formatCurrency(rawValue);
}

function formatChartValue(item) {
  return item.type === "currency"
    ? formatCurrency(item.value)
    : formatCount(item.value);
}

function getPercentageShare(value, max) {
  if (!max || !Number.isFinite(max) || max <= 0) {
    return 0;
  }

  return Math.max(8, Math.round((Number(value || 0) / max) * 100));
}

function getMetricMax(metrics, type) {
  const values = metrics
    .filter((item) => item.type === type)
    .map((item) => Number(item.value || 0));

  return Math.max(...values, 1);
}

export default function DashboardPage({
  user,
  totalStudents,
  totalAdmissions,
  totalFees,
  pendingFees,
  todaysCollection,
  expenses,
  salaries,
  totalAssets,
  alerts = 21,
}) {
  const role = getRoleLabel(user?.role);
  const rawRole = String(user?.role || "").toUpperCase();
  const roleLabel = role || user?.role || "User";
  const isAccountant =
    rawRole === "ACCOUNTANT" || String(roleLabel).toUpperCase() === "ACCOUNTANT";

  const todayDate = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());

  const metrics = {
    totalStudents,
    totalAdmissions,
    totalFees,
    pendingFees,
    todaysCollection,
    expenses,
    salaries,
    totalAssets,
    alerts,
  };

  const visibleMetricCards = isAccountant
    ? metricCards.filter((item) =>
        ["totalFees", "pendingFees", "todaysCollection", "expenses", "salaries"].includes(
          item.key
        )
      )
    : metricCards;

  const shortcuts = isAccountant ? financeShortcuts : dashboardShortcuts;

  const comparisonMetrics = isAccountant
    ? [
        {
          label: "Fees collected",
          value: Number(totalFees || 0),
          color: "bg-emerald-500",
          type: "currency",
        },
        {
          label: "Pending fees",
          value: Number(pendingFees || 0),
          color: "bg-amber-500",
          type: "currency",
        },
        {
          label: "Today's collection",
          value: Number(todaysCollection || 0),
          color: "bg-violet-500",
          type: "currency",
        },
        {
          label: "Expenses",
          value: Number(expenses || 0),
          color: "bg-rose-500",
          type: "currency",
        },
        {
          label: "Salaries",
          value: Number(salaries || 0),
          color: "bg-blue-500",
          type: "currency",
        },
      ]
    : [
        {
          label: "Students",
          value: Number(totalStudents || 0),
          color: "bg-sky-500",
          type: "count",
        },
        {
          label: "Admissions",
          value: Number(totalAdmissions || 0),
          color: "bg-emerald-500",
          type: "count",
        },
        {
          label: "Assets",
          value: Number(totalAssets || 0),
          color: "bg-green-500",
          type: "count",
        },
        {
          label: "Fees collected",
          value: Number(totalFees || 0),
          color: "bg-violet-500",
          type: "currency",
        },
        {
          label: "Pending fees",
          value: Number(pendingFees || 0),
          color: "bg-amber-500",
          type: "currency",
        },
        {
          label: "Today's collection",
          value: Number(todaysCollection || 0),
          color: "bg-indigo-500",
          type: "currency",
        },
        {
          label: "Expenses",
          value: Number(expenses || 0),
          color: "bg-rose-500",
          type: "currency",
        },
        {
          label: "Salaries",
          value: Number(salaries || 0),
          color: "bg-blue-500",
          type: "currency",
        },
      ];

  const countMetricMax = getMetricMax(comparisonMetrics, "count");
  const currencyMetricMax = getMetricMax(comparisonMetrics, "currency");

  const operationsSnapshot = isAccountant
    ? [
        [
          "Fees collected",
          formatCurrency(totalFees),
          "Collections posted from the fee ledger.",
        ],
        [
          "Pending fees",
          formatCurrency(pendingFees),
          "Outstanding balances that need follow-up.",
        ],
        [
          "Today's cash in",
          formatCurrency(todaysCollection),
          "Payments collected for the current day.",
        ],
        [
          "Expense outflow",
          formatCurrency(expenses),
          "Operational expenses recorded in the ledger.",
        ],
      ]
    : [
        [
          "Students",
          formatCount(totalStudents),
          "Live student records available for tracking.",
        ],
        [
          "Admissions",
          formatCount(totalAdmissions),
          "Applications recorded in the admissions table.",
        ],
        [
          "Today's cash in",
          formatCurrency(todaysCollection),
          "Collections posted for the current day.",
        ],
        [
          "Assets",
          formatCount(totalAssets),
          "Assets currently tracked across operations.",
        ],
      ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 md:p-6">
        <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-sm md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">
                SmartBooks AI
              </p>

              <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
                Dashboard
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                Welcome back
                {user?.name ? `, ${user.name}` : ""}. Monitor admissions, fees,
                expenses, payroll, assets, and daily school operations from one
                clean view.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15">
                    <FaUserShield />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
                      Role
                    </p>
                    <p className="mt-1 font-bold text-white">{roleLabel}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15">
                    <FaClock />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
                      Today
                    </p>
                    <p className="mt-1 font-bold text-white">{todayDate}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {visibleMetricCards.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                href={item.href}
                className="group flex min-h-[190px] flex-col justify-between rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                      {item.label}
                    </p>

                    <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                      {getMetricValue(item, metrics)}
                    </p>
                  </div>

                  <span
                    className={`grid h-13 w-13 place-items-center rounded-2xl bg-gradient-to-br ${item.tone}`}
                  >
                    <Icon className="text-xl" />
                  </span>
                </div>

                <p className="mt-5 text-sm leading-6 text-slate-500">
                  {item.key === "totalStudents" &&
                    `${formatCount(totalAdmissions)} admissions recorded in the system.`}

                  {item.key === "totalFees" &&
                    "Gross fee volume captured from the fee ledger."}

                  {item.key === "pendingFees" &&
                    "Outstanding balances that still need to be collected."}

                  {item.key === "todaysCollection" &&
                    "Payments collected today across available fee records."}

                  {item.key === "expenses" &&
                    "Expense outflow captured from the finance ledger."}

                  {item.key === "salaries" &&
                    "Total salary payments recorded in payroll."}

                  {item.key === "totalAssets" &&
                    "Assets currently tracked across school operations."}
                </p>
              </Link>
            );
          })}
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
                Quick access
              </p>
              <h2 className="mt-2 text-xl font-black text-slate-950">
                {isAccountant ? "Finance entry points" : "Common actions"}
              </h2>
            </div>

            <span className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              <FaClipboardList />
              Shortcuts
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {shortcuts.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="group rounded-3xl border border-slate-200 bg-slate-50 p-4 transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:bg-white hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-slate-700 shadow-sm transition group-hover:bg-slate-950 group-hover:text-white">
                      <Icon />
                    </span>

                    <FaArrowRight className="mt-3 text-xs text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-700" />
                  </div>

                  <h3 className="mt-4 text-sm font-black text-slate-950">
                    {item.label}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {item.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
                  Chart view
                </p>

                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Metric comparisons
                </h2>
              </div>

              <span className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Live snapshot
              </span>
            </div>

            <div className="mt-6 space-y-5">
              {comparisonMetrics.map((item) => {
                const max =
                  item.type === "currency" ? currencyMetricMax : countMetricMax;

                return (
                  <div key={item.label} className="space-y-2">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="font-bold text-slate-700">
                        {item.label}
                      </span>

                      <span className="font-mono text-xs font-bold text-slate-500 sm:text-sm">
                        {formatChartValue(item)}
                      </span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${item.color} transition-all duration-500`}
                        style={{
                          width: `${getPercentageShare(item.value, max)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
                Overview
              </p>

              <h2 className="mt-2 text-xl font-black text-slate-950">
                Operations snapshot
              </h2>
            </div>

            <div className="mt-5 grid gap-4">
              {operationsSnapshot.map(([title, value, description]) => (
                <div
                  key={title}
                  className="rounded-3xl border border-slate-100 bg-slate-50 p-4"
                >
                  <p className="text-sm font-bold text-slate-700">{title}</p>

                  <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                    {value}
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

     
      </div>
    </div>
  );
}
