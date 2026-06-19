import React, { useEffect, useMemo, useState } from "react";
import StudentsTable from "../components/StudentsTable";
import { withAuthPage } from "@/lib/withAuthPage";

export const getServerSideProps = withAuthPage({ path: "/students" });

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  async function fetchStudents() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/students");
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to load students");
      }

      setStudents(data.students || []);
    } catch (fetchError) {
      setError(fetchError.message || "Unable to load students");
    } finally {
      setLoading(false);
    }
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchStudents();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return students;
    }

    return students.filter((student) =>
      [
        student.id,
        student.full_name,
        student.gender,
        student.age,
        student.class,
        student.blood_group,
        student.religion,
        student.medium,
        student.sts_no,
        student.pen_number,
        student.caste,
        student.student_type,
        student.admission_id,
        student.student_unique_id,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [students, search]);

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="mt-1 text-sm text-slate-500">{filteredStudents.length} of {students.length} records shown</p>
        </div>
        <label className="w-full max-w-md">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search students by name, class, ID, or details"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
          />
        </label>
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : (
        <StudentsTable students={filteredStudents} onDeleted={fetchStudents} />
      )}
    </div>
  );
}
