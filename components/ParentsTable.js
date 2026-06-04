import React from "react";

export default function ParentsTable({ parents }) {
  return (
    <div className="overflow-x-auto w-full">
      <table className="min-w-full bg-white border border-gray-200 rounded-lg text-xs md:text-sm">
        <thead>
          <tr className="bg-[#08516d] text-white">
            <th className="py-2 px-4 text-center">ID</th>
            <th className="py-2 px-4 text-center">Father Name</th>
            <th className="py-2 px-4 text-center">Father Mobile</th>
            <th className="py-2 px-4 text-center">Mother Name</th>
            <th className="py-2 px-4 text-center">Mother Mobile</th>
            <th className="py-2 px-4 text-center">Created At</th>
          </tr>
        </thead>
        <tbody>
          {parents && parents.length > 0 ? (
            parents.map((parent) => (
              <tr key={parent.id} className="border-t">
                <td className="py-2 px-4 text-center">{parent.id}</td>
                <td className="py-2 px-4 text-center">{parent.father_name}</td>
                <td className="py-2 px-4 text-center">{parent.father_mobile}</td>
                <td className="py-2 px-4 text-center">{parent.mother_name}</td>
                <td className="py-2 px-4 text-center">{parent.mother_mobile}</td>
                <td className="py-2 px-4 text-center">{formatDateTime(parent.created_at)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" className="text-center py-4">No parent records found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
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
