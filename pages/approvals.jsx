import { useEffect, useState } from "react";
import { withAuthPage } from "@/lib/withAuthPage";

export const getServerSideProps = withAuthPage({
  path: "/approvals",
  allowedRoles: ["ADMIN", "SUPER_ADMIN"],
});

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

export default function ApprovalsPage() {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadRequests(selectedStatus = status) {
    setLoading(true);
    const response = await fetch(`/api/change-requests?status=${selectedStatus}`);
    const data = await response.json();
    setRequests(response.ok && data.success ? data.requests || [] : []);
    setMessage(response.ok ? "" : data.error || "Unable to load approvals");
    setLoading(false);
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadRequests(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function reviewRequest(request, action) {
    const reviewNote =
      window.prompt(
        action === "APPROVE"
          ? "Optional approval note"
          : "Reason for rejecting this request"
      ) || "";

    const response = await fetch(`/api/change-requests/${request.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, review_note: reviewNote }),
    });
    const data = await response.json();

    if (!response.ok || !data.success) {
      setMessage(data.error || "Unable to review request");
      return;
    }

    setMessage(action === "APPROVE" ? "Change approved and applied." : "Change rejected.");
    await loadRequests(status);
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[1.75rem] bg-white p-6 shadow-sm md:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">
            Admin control
          </p>
          <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-900">Ledger approvals</h1>
              <p className="mt-2 text-sm text-slate-600">
                Review accountant requests before fee or expense ledger values change.
              </p>
            </div>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold"
            >
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="ALL">All requests</option>
            </select>
          </div>
        </section>

        {message ? (
          <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
            {message}
          </div>
        ) : null}

        <section className="space-y-4">
          {requests.map((request) => (
            <article key={request.id} className="rounded-[1.5rem] bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#08516d]">
                    {request.ledger_type} ledger · Record #{request.record_id}
                  </p>
                  <h2 className="mt-2 text-lg font-black text-slate-900">
                    Requested by {request.requested_by_name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {new Date(request.requested_at).toLocaleString("en-IN")}
                  </p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                  {request.status}
                </span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <DataCard title="Current values" data={request.original_data} />
                <DataCard title="Requested values" data={request.proposed_data} />
              </div>

              <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                <b>Reason:</b> {request.reason}
              </p>

              {request.status === "PENDING" ? (
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => reviewRequest(request, "APPROVE")}
                    className="rounded-2xl bg-green-600 px-5 py-3 text-sm font-bold text-white"
                  >
                    Approve & apply
                  </button>
                  <button
                    onClick={() => reviewRequest(request, "REJECT")}
                    className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white"
                  >
                    Reject
                  </button>
                </div>
              ) : null}
            </article>
          ))}

          {!loading && requests.length === 0 ? (
            <div className="rounded-[1.5rem] bg-white p-8 text-center text-slate-500 shadow-sm">
              No {status.toLowerCase()} approval requests.
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function DataCard({ title, data }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <h3 className="font-black text-slate-900">{title}</h3>
      <dl className="mt-3 space-y-2 text-sm">
        {Object.entries(data || {}).map(([key, value]) => (
          <div key={key} className="flex justify-between gap-4 border-b border-slate-100 pb-2">
            <dt className="font-semibold capitalize text-slate-500">{key.replaceAll("_", " ")}</dt>
            <dd className="text-right font-bold text-slate-800">{formatValue(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
