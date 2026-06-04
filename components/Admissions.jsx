"use client";

import { useEffect, useMemo, useState } from "react";
import AdmissionModal from "./AdmissionModal";

const BADGE_STYLES = {
  NEW: "bg-amber-50 text-amber-700 ring-amber-200",
  PENDING: "bg-sky-50 text-sky-700 ring-sky-200",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  ADMITTED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-200",
};

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function getStatusStyle(status) {
  const normalized = String(status || "NEW").toUpperCase();
  return BADGE_STYLES[normalized] || "bg-slate-100 text-slate-700 ring-slate-200";
}

export default function Admissions() {
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedAdmissionId, setSelectedAdmissionId] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadAdmissions() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/admission");
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Unable to load admissions");
        }

        if (active) {
          setAdmissions(data.admissions || []);
        }
      } catch (fetchError) {
        if (active) {
          setError(fetchError.message || "Unable to load admissions");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadAdmissions();

    return () => {
      active = false;
    };
  }, []);

  const filteredAdmissions = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return admissions;
    }

    return admissions.filter((admission) => {
      return [
        admission.student_name,
        admission.class_applying_for,
        admission.program,
        admission.father_name,
        admission.mother_name,
        admission.fees,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [admissions, search]);

  const summary = useMemo(() => {
    return admissions.reduce(
      (accumulator, admission) => {
        const status = String(admission.admission_status || "NEW").toUpperCase();

        accumulator.total += 1;
        if (status === "NEW") accumulator.newCount += 1;
        if (status === "APPROVED" || status === "ADMITTED") accumulator.qualified += 1;
        if (status === "REJECTED") accumulator.rejected += 1;

        return accumulator;
      },
      { total: 0, newCount: 0, qualified: 0, rejected: 0 }
    );
  }, [admissions]);

  return (
    <div >
      <AdmissionModal admissionId={selectedAdmissionId} onClose={() => setSelectedAdmissionId(null)} />
      <div className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-6 md:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Admissions</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900 md:text-3xl">Admissions records</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
                Live data pulled from the admissions table so admin and super-admin users can review submitted applications.
              </p>
            </div>

            <label className="w-full max-w-md">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Search</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by student, class, parent, or status"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              />
            </label>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Total applications", summary.total],
              ["New applications", summary.newCount],
              ["Approved / admitted", summary.qualified],
              ["Rejected", summary.rejected],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
                <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 py-6 md:px-8">
          {loading ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
              Loading admissions from the database...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700">
              {error}
            </div>
          ) : filteredAdmissions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
              No admissions found for the current search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.2em] bg-primary text-white">
                    <th className="border-b border-slate-200 px-4 py-3">Student</th>
                    <th className="border-b border-slate-200 px-4 py-3">Class</th>
                    <th className="border-b border-slate-200 px-4 py-3">Program</th>
                    <th className="border-b border-slate-200 px-4 py-3">Parent</th>
                    <th className="border-b border-slate-200 px-4 py-3">Status</th>
<th className="border-b border-slate-200 px-4 py-3">Total Fees</th>
<th className="border-b border-slate-200 px-4 py-3">Discount</th>
<th className="border-b border-slate-200 px-4 py-3">Final Fee</th>                  </tr>
                </thead>
                <tbody>
                  {filteredAdmissions.map((admission) => (
                    <tr key={admission.id} onClick={() => setSelectedAdmissionId(admission.id)} className="align-top hover:bg-slate-50/80 cursor-pointer">
                      <td className="border-b border-slate-100 px-4 py-4">
                        <div className="font-semibold text-slate-900">{admission.student_name || "Unnamed applicant"}</div>
                        <div className="mt-1 text-sm text-slate-500">
                          {admission.gender || "-"} {admission.date_of_birth ? `• ${formatDate(admission.date_of_birth)}` : ""}
                        </div>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                        {admission.class_applying_for || "-"}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                        {admission.program || "-"}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                        <div className="font-medium text-slate-900">{admission.father_name || admission.guardian_name || "-"}</div>
                        <div className="mt-1 text-slate-500">{admission.father_mobile || admission.emergency_contact || "-"}</div>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ring-1 ${getStatusStyle(admission.admission_status)}`}>
                          {admission.admission_status || "NEW"}
                        </span>
                      </td>
                    <td className="border-b border-slate-100 px-4 py-4 text-sm font-semibold text-slate-700">
  {formatCurrency(admission.fees)}
</td>

<td className="border-b border-slate-100 px-4 py-4 text-sm font-semibold text-red-600">
  {Number(admission.discount || 0)}%
</td>

<td className="border-b border-slate-100 px-4 py-4 text-sm font-black text-emerald-700">
  {formatCurrency(admission.final_fee)}
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
  );
}
