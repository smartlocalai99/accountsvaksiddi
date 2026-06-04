import { FaBell, FaExclamationTriangle, FaCalendarAlt, FaCheckCircle } from "react-icons/fa";
import { withAuthPage } from "@/lib/withAuthPage";

export const getServerSideProps = withAuthPage({ path: "/alerts" });

const alerts = [
  {
    id: 1,
    title: "Fee follow-up pending",
    description: "Several fee records still need follow-up today.",
    time: "10 mins ago",
    tone: "bg-amber-50 text-amber-700 border-amber-200",
    icon: FaExclamationTriangle,
  },
  {
    id: 2,
    title: "Admissions review due",
    description: "New applications are waiting for verification.",
    time: "1 hour ago",
    tone: "bg-sky-50 text-sky-700 border-sky-200",
    icon: FaCalendarAlt,
  },
  {
    id: 3,
    title: "Payroll prepared",
    description: "This month’s salary sheet is ready for review.",
    time: "Today",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: FaCheckCircle,
  },
];

export default function AlertsPage() {
  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Alerts</p>
              <h1 className="mt-2 text-3xl font-black text-slate-900">Action required messages</h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                Keep track of important school notifications, reminders, and pending items from one place.
              </p>
            </div>

            <div className="rounded-3xl bg-primary-10 px-5 py-4 text-primary">
              <div className="flex items-center gap-3">
                <FaBell className="text-xl" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em]">Open alerts</p>
                  <p className="mt-1 text-2xl font-black">{alerts.length}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Summary</p>
            <h2 className="mt-2 text-xl font-black text-slate-900">What needs attention</h2>
            <div className="mt-6 space-y-4">
              {alerts.map((alert) => {
                const Icon = alert.icon;

                return (
                  <div key={alert.id} className={`rounded-3xl border p-4 ${alert.tone}`}>
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 rounded-2xl bg-white/80 p-3 shadow-sm">
                        <Icon />
                      </span>
                      <div>
                        <p className="font-bold text-slate-900">{alert.title}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{alert.description}</p>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] opacity-70">
                          {alert.time}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Notes</p>
            <h2 className="mt-2 text-xl font-black text-slate-900">Alerts dashboard</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Use this tab for critical reminders, pending approvals, and finance follow-ups that should be reviewed quickly.
            </p>
            <div className="mt-6 rounded-3xl bg-slate-50 p-5 text-sm leading-7 text-slate-600">
              Alerts can be expanded later into read/unread states, priority filters, or linked actions.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
