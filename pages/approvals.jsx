import { useEffect, useState } from "react";
import { withAuthPage } from "@/lib/withAuthPage";
import Swal from "sweetalert2";

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

  async function loadRequests(selectedStatus = status) {
    setLoading(true);
    const response = await fetch(`/api/change-requests?status=${selectedStatus}`);
    const data = await response.json();
    setRequests(response.ok && data.success ? data.requests || [] : []);
    if (!response.ok) {
      await Swal.fire("Unable to load approvals", data.error || "Please try again.", "error");
    }
    setLoading(false);
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadRequests(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function reviewRequest(request, action) {
    const isApproval = action === "APPROVE";
    const result = await Swal.fire({
      title: isApproval ? "Approve this change?" : "Reject this change?",
      text: isApproval
        ? "The approved values will be applied to the ledger immediately."
        : "The ledger will remain unchanged.",
      icon: isApproval ? "question" : "warning",
      input: "textarea",
      inputLabel: isApproval ? "Approval note (optional)" : "Rejection reason",
      showCancelButton: true,
      confirmButtonText: isApproval ? "Approve & apply" : "Reject request",
      confirmButtonColor: isApproval ? "#16a34a" : "#dc2626",
      inputValidator: (value) =>
        !isApproval && !value?.trim() ? "Rejection reason is required" : undefined,
    });

    if (!result.isConfirmed) return;

    const response = await fetch(`/api/change-requests/${request.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, review_note: result.value || "" }),
    });
    const data = await response.json();

    if (!response.ok || !data.success) {
      await Swal.fire("Action failed", data.error || "Unable to review request", "error");
      return;
    }

    await Swal.fire(
      isApproval ? "Approved" : "Rejected",
      isApproval ? "The ledger change has been applied." : "The request was rejected.",
      "success"
    );
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

              <RecordDetails request={request} />

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

function RecordDetails({ request }) {
  const details = request.record_details || {};

  if (request.ledger_type === "FEE") {
    return (
      <div className="mt-5 grid gap-3 rounded-2xl bg-blue-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Detail label="Student" value={details.student_name} />
        <Detail label="Class" value={details.class_name} />
        <Detail label="Admission No." value={details.admission_id} />
        <Detail label="Receipt No." value={details.receipt_no} />
        <Detail label="Parent" value={details.parent_name} />
        <Detail label="Parent Mobile" value={details.parent_mobile} />
        <Detail label="Payment Date" value={details.payment_date} />
        <Detail label="Payment Mode" value={details.payment_mode} />
      </div>
    );
  }

  return (
    <div className="mt-5 grid gap-3 rounded-2xl bg-orange-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <Detail label="Expense" value={details.expense_title} />
      <Detail label="Category" value={details.category} />
      <Detail label="Expense Date" value={details.expense_date} />
      <Detail label="Notes" value={details.notes} />
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-black text-slate-900">{formatValue(value)}</p>
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
