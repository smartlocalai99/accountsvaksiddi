import React from "react";

export default function StudentsTable({ students }) {
  return (
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
            <th className="py-2 px-4 text-center">Nationality</th>
            <th className="py-2 px-4 text-center">Religion</th>
            <th className="py-2 px-4 text-center">Medium</th>
            <th className="py-2 px-4 text-center">Admission ID</th>
            <th className="py-2 px-4 text-center">Created At</th>
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
                <td className="py-2 px-4 text-center">{student.nationality || '-'}</td>
                <td className="py-2 px-4 text-center">{student.religion || '-'}</td>
                <td className="py-2 px-4 text-center">{student.medium || '-'}</td>
                <td className="py-2 px-4 text-center">{student.admission_id || '-'}</td>
                <td className="py-2 px-4 text-center">{formatDateTime(student.created_at)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="13" className="text-center py-4">No student records found.</td>
            </tr>
          )}
        </tbody>
      </table>
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
