import React, { useState } from "react";
import Swal from "sweetalert2";

export default function StudentsTable({ students, onDeleted }) {
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  async function deleteStudent(student) {
    const studentName = student.full_name || "this student";
    const result = await Swal.fire({
      icon: "warning",
      title: `Delete ${studentName}?`,
      text: "This will remove the student, admission, parent link, and fee records connected to this admission.",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
    });

    if (!result.isConfirmed) {
      return;
    }

    setDeletingId(student.id);
    setError("");

    try {
      const response = await fetch(`/api/students/${student.id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to delete student");
      }

      await onDeleted?.();
      await Swal.fire({
        icon: "success",
        title: "Student deleted",
        text: `${studentName} was deleted successfully.`,
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (deleteError) {
      const message = deleteError.message || "Unable to delete student";
      setError(message);
      await Swal.fire({
        icon: "error",
        title: "Delete failed",
        text: message,
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}
      <div className="overflow-x-auto w-full">
      <table className="min-w-full bg-white border border-gray-200 rounded-lg text-xs md:text-sm">
        <thead>
          <tr className="bg-primary text-white">
            <th className="py-2 px-4 text-center">ID</th>
            <th className="py-2 px-4 text-center">Full Name</th>
            <th className="py-2 px-4 text-center">Gender</th>
            <th className="py-2 px-4 text-center">Date of Birth</th>
            <th className="py-2 px-4 text-center">Age</th>
            <th className="py-2 px-4 text-center">Class</th>
            <th className="py-2 px-4 text-center">Blood Group</th>
            <th className="py-2 px-4 text-center">STS No</th>
            <th className="py-2 px-4 text-center">PEN Number</th>
            <th className="py-2 px-4 text-center">Caste</th>
            <th className="py-2 px-4 text-center">Religion</th>
            <th className="py-2 px-4 text-center">Medium</th>
            <th className="py-2 px-4 text-center">Type</th>
            <th className="py-2 px-4 text-center">Admission ID</th>
            <th className="py-2 px-4 text-center">Created At</th>
            <th className="py-2 px-4 text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          {students && students.length > 0 ? (
            students.map((student) => (
              <tr key={student.id} className="border-t">
                <td className="py-2 px-4 text-center">{student.id}</td>
                <td className="py-2 px-4 text-center">{student.full_name}</td>
                <td className="py-2 px-4 text-center">{student.gender}</td>
                <td className="py-2 px-4 text-center">{formatDate(student.date_of_birth)}</td>
                <td className="py-2 px-4 text-center">{student.age}</td>
                <td className="py-2 px-4 text-center">{student.class || '-'}</td>
                <td className="py-2 px-4 text-center">{student.blood_group || '-'}</td>
                <td className="py-2 px-4 text-center">{student.sts_no || '-'}</td>
                <td className="py-2 px-4 text-center">{student.pen_number || '-'}</td>
                <td className="py-2 px-4 text-center">{student.caste || '-'}</td>
                <td className="py-2 px-4 text-center">{student.religion || '-'}</td>
                <td className="py-2 px-4 text-center">{student.medium || '-'}</td>
                <td className="py-2 px-4 text-center">{student.student_type || '-'}</td>
                <td className="py-2 px-4 text-center">{student.admission_id || '-'}</td>
                <td className="py-2 px-4 text-center">{formatDateTime(student.created_at)}</td>
                <td className="py-2 px-4 text-center">
                  <button
                    type="button"
                    onClick={() => deleteStudent(student)}
                    disabled={deletingId === student.id}
                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingId === student.id ? "Deleting..." : "Delete"}
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="16" className="text-center py-4">No student records found.</td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d)) return dateString;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateTime(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d)) return dateString;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}
