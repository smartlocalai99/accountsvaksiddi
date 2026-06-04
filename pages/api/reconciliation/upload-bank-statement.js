function getDemoReconciliationRows() {
  return [
    {
      bankDate: "2026-05-22",
      utr: "UTR1029384756",
      narration: "UPI/Parent fee payment/Ramesh",
      bankAmount: 4000,
      invoiceNo: "INV-1024",
      receiptNo: "RCPT-10021",
      studentName: "Ramesh Kumar",
      matchReason: "UTR and amount matched",
      status: "Matched",
    },
    {
      bankDate: "2026-05-22",
      utr: "UTR1029384757",
      narration: "UPI/School fee/Suresh",
      bankAmount: 5000,
      invoiceNo: "INV-1025",
      receiptNo: "RCPT-10022",
      studentName: "Suresh B",
      matchReason: "UTR and amount matched",
      status: "Matched",
    },
    {
      bankDate: "2026-05-22",
      utr: "UTR1029384758",
      narration: "UPI/Unknown credit",
      bankAmount: 3000,
      receiptNo: "",
      studentName: "",
      matchReason: "No invoice or receipt found",
      status: "Unmatched",
    },
  ];
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  return res.status(200).json({
    success: true,
    rows: getDemoReconciliationRows(),
  });
}