import * as XLSX from "xlsx";

export function downloadExcel({ fileName, sheetName, rows }) {
  const worksheet = XLSX.utils.json_to_sheet(rows || []);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || "Sheet1");
  XLSX.writeFile(workbook, fileName || "export.xlsx");
}