import React, { useEffect, useMemo, useState } from "react";
import ParentsTable from "../components/ParentsTable";
import { withAuthPage } from "@/lib/withAuthPage";

export const getServerSideProps = withAuthPage({ path: "/parents" });

export default function ParentsPage() {
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/parents")
      .then((res) => res.json())
      .then((data) => {
        setParents(data.parents || []);
        setLoading(false);
      });
  }, []);

  const filteredParents = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return parents;
    }

    return parents.filter((parent) =>
      [
        parent.id,
        parent.father_name,
        parent.father_mobile,
        parent.mother_name,
        parent.mother_mobile,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [parents, search]);

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Parents</h1>
          <p className="mt-1 text-sm text-slate-500">{filteredParents.length} of {parents.length} records shown</p>
        </div>
        <label className="w-full max-w-md">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search parents by name, mobile, or ID"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
          />
        </label>
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <ParentsTable parents={filteredParents} />
      )}
    </div>
  );
}
