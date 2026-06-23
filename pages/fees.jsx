import { useEffect, useMemo, useState } from "react";
import { FaFileExcel, FaPlus } from "react-icons/fa";
import { withAuthPage } from "@/lib/withAuthPage";
import { downloadExcel } from "@/lib/exportToExcel";

export const getServerSideProps = withAuthPage({ path: "/fees" });

const SCHOOL_NAME = "Vaksiddhi Public School (R), Manvi";
const SCHOOL_ADDRESS = "Manvi, Raichur, Karnataka, India";
const SCHOOL_PHONE = "+91 9449484004";
const DEFAULT_LOGO = "/logos.png";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatAmountPlain(value) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function StatusBadge({ status }) {
  const styles = {
    Paid: "bg-green-100 text-green-700",
    Partial: "bg-yellow-100 text-yellow-700",
    Pending: "bg-red-100 text-red-700",
    "Payment Link Generated": "bg-violet-100 text-violet-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${
        styles[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {status || "Pending"}
    </span>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path d="M12.04 2C6.51 2 2.02 6.46 2.02 11.95c0 1.95.58 3.86 1.68 5.49L2 22l4.71-1.66a10.08 10.08 0 0 0 5.33 1.51h.01c5.53 0 10.02-4.46 10.02-9.95C22.07 6.46 17.57 2 12.04 2zm0 18.13a8.15 8.15 0 0 1-4.16-1.14l-.3-.17-2.8.98.94-2.73-.19-.28a8.05 8.05 0 0 1-1.25-4.3c0-4.44 3.64-8.05 8.12-8.05 4.47 0 8.11 3.61 8.11 8.05 0 4.44-3.64 8.04-8.11 8.04zm4.72-5.72c-.26-.13-1.54-.75-1.78-.84-.24-.09-.41-.13-.58.13-.17.26-.67.84-.82 1.01-.15.17-.3.19-.56.06-.26-.13-1.1-.4-2.1-1.26-.78-.69-1.3-1.53-1.46-1.79-.15-.26-.02-.41.11-.54.12-.12.26-.3.39-.45.13-.15.17-.26.26-.43.09-.17.04-.32-.02-.45-.07-.13-.58-1.4-.8-1.92-.21-.5-.43-.43-.58-.44h-.49c-.17 0-.45.06-.69.32-.24.26-.91.89-.91 2.17 0 1.27.93 2.5 1.06 2.67.13.17 1.84 2.81 4.46 3.94.62.27 1.1.43 1.48.55.62.19 1.18.16 1.63.1.5-.08 1.54-.63 1.76-1.24.22-.61.22-1.14.15-1.24-.06-.1-.24-.17-.5-.3z" />
    </svg>
  );
}

function normalizePhoneNumber(value) {
  return String(value || "").replace(/\D/g, "");
}

function getClassName(item) {
  return String(item?.class || item?.class_name || "").trim();
}

function getPaymentMode(item) {
  return String(item?.payment_mode || item?.latest_payment_mode || "").trim();
}

function getStatus(item) {
  return String(item?.payment_status || "Pending").trim();
}

function parseMonthKey(monthKey) {
  const [year, month] = String(monthKey || "").split("-").map(Number);

  if (!year || !month) {
    return null;
  }

  return new Date(year, month - 1, 1);
}

function formatMonthLabel(monthKey) {
  const date = parseMonthKey(monthKey);

  if (!date) {
    return String(monthKey || "");
  }

  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "numeric",
  }).format(date);
}

function buildMonthlySeries(monthlyRows, monthsToShow = 12) {
  const sorted = [...monthlyRows]
    .filter((item) => String(item.month_key || "").match(/^\d{4}-\d{2}$/))
    .sort((a, b) => String(a.month_key).localeCompare(String(b.month_key)));

  const endDate = new Date();
  endDate.setDate(1);
  endDate.setHours(0, 0, 0, 0);

  const startDate = new Date(endDate);
  startDate.setMonth(startDate.getMonth() - (monthsToShow - 1));

  const byMonth = new Map(
    sorted.map((item) => [
      item.month_key,
      {
        ...item,
        month_label: item.month_label || formatMonthLabel(item.month_key),
        collected: Number(item.collected || 0),
      },
    ])
  );

  const series = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    const monthKey = `${cursor.getFullYear()}-${String(
      cursor.getMonth() + 1
    ).padStart(2, "0")}`;

    const existing = byMonth.get(monthKey);

    series.push(
      existing || {
        month_key: monthKey,
        month_label: formatMonthLabel(monthKey),
        collected: 0,
      }
    );

    cursor.setMonth(cursor.getMonth() + 1);
  }

  return series;
}

function formatReceiptDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function waitForImages(documentRef) {
  const images = Array.from(documentRef.images || []);

  return Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();

      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    })
  );
}

export default function FeesPage() {
  const today = new Date().toISOString().slice(0, 10);

  const [rows, setRows] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [monthly, setMonthly] = useState([]);
  const [entries, setEntries] = useState([]);

  const [entryForm, setEntryForm] = useState({
    admission_id: "",
    student_id: "",
    date: today,
    student_name: "",
    class_name: "",
    parent_name: "",
    parent_mobile: "",
    amount_collected: "",
    payment_mode: "Cash",
    utr: "",
  });

  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });

  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [autoNotify, setAutoNotify] = useState(true);
  const [entryError, setEntryError] = useState("");
  const [savingFee, setSavingFee] = useState(false);
  const [admissionSearch, setAdmissionSearch] = useState("");
  const [showAdmissionDropdown, setShowAdmissionDropdown] = useState(false);
  const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false);
  const [activeFeeReceipt, setActiveFeeReceipt] = useState(null);
  const [feeReceiptSaved, setFeeReceiptSaved] = useState(false);
  const [schoolSettings, setSchoolSettings] = useState(null);
  const [whatsappConfig, setWhatsappConfig] = useState(null);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [redeployError, setRedeployError] = useState("");
  const [redeploySuccess, setRedeploySuccess] = useState("");

  const [showConfigEdit, setShowConfigEdit] = useState(false);
  const [configForm, setConfigForm] = useState({
    workerUrl: "",
    workerApiKey: "",
    railwayApiToken: "",
    railwayServiceId: "",
    railwayEnvironmentId: "",
  });
  const [configSaving, setConfigSaving] = useState(false);
  const [configSaveError, setConfigSaveError] = useState("");
  const [configSaveSuccess, setConfigSaveSuccess] = useState("");

  useEffect(() => {
    if (whatsappConfig) {
      setConfigForm({
        workerUrl: whatsappConfig.workerUrl || "",
        workerApiKey: whatsappConfig.workerApiKey || "",
        railwayApiToken: whatsappConfig.railwayApiToken || "",
        railwayServiceId: whatsappConfig.railwayServiceId || "",
        railwayEnvironmentId: whatsappConfig.railwayEnvironmentId || "",
      });
    }
  }, [whatsappConfig]);

  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerClass, setLedgerClass] = useState("All");
  const [ledgerStatus, setLedgerStatus] = useState("All");
  const [ledgerPaymentMode, setLedgerPaymentMode] = useState("All");
  const [ledgerDueOnly, setLedgerDueOnly] = useState(false);

  const [ledgerPage, setLedgerPage] = useState(1);
  const ledgerPageSize = 10;

  const classOptions = useMemo(() => {
    const fallbackClasses = [
      "Nursery",
      "LKG",
      "UKG",
      "1st",
      "2nd",
      "3rd",
      "4th",
      "5th",
      "6th",
      "7th",
      "8th",
      "9th",
      "10th",
    ];

    const uniqueFromRows = rows
      .map((item) => getClassName(item))
      .filter((value) => value && !/^\d+$/.test(value));

    return Array.from(new Set([...uniqueFromRows, ...fallbackClasses]));
  }, [rows]);

  const paymentModeOptions = useMemo(() => {
    const defaultModes = ["Cash", "UPI", "Bank Transfer"];
    const uniqueFromRows = rows
      .map((item) => getPaymentMode(item))
      .filter(Boolean);

    return Array.from(new Set([...defaultModes, ...uniqueFromRows]));
  }, [rows]);

  const letterhead = useMemo(
    () => ({
      logo:
        schoolSettings?.letterhead_logo ||
        schoolSettings?.school_logo ||
        DEFAULT_LOGO,
      schoolName:
        schoolSettings?.letterhead_school_name ||
        schoolSettings?.school_name ||
        SCHOOL_NAME,
      address:
        schoolSettings?.letterhead_address ||
        schoolSettings?.school_address ||
        SCHOOL_ADDRESS,
      phone: schoolSettings?.contact_number || SCHOOL_PHONE,
    }),
    [schoolSettings]
  );

  const monthlySeries = useMemo(() => buildMonthlySeries(monthly), [monthly]);

  const maxMonthly = useMemo(
    () => Math.max(...monthlySeries.map((m) => Number(m.collected || 0)), 1),
    [monthlySeries]
  );

  useEffect(() => {
    let active = true;

    async function loadSupportSettings() {
      try {
        const [settingsResponse, whatsappResponse] = await Promise.all([
          fetch("/api/school-settings"),
          fetch("/api/whatsapp/config"),
        ]);

        const settingsData = await settingsResponse.json();
        const whatsappData = await whatsappResponse.json();

        if (!active) return;

        if (settingsResponse.ok && settingsData.success) {
          setSchoolSettings(settingsData.data || null);
        }

        if (whatsappResponse.ok && whatsappData.success) {
          setWhatsappConfig(whatsappData.data || null);
        }
      } catch (error) {
        console.error("Fee support settings load error:", error);
      }
    }

    loadSupportSettings();

    return () => {
      active = false;
    };
  }, []);

  const admissionOptions = useMemo(() => {
    const seen = new Set();

    return rows.filter((item) => {
      if (!item.admission_id || seen.has(item.admission_id)) {
        return false;
      }

      seen.add(item.admission_id);
      return true;
    });
  }, [rows]);

  const filteredAdmissionOptions = useMemo(() => {
    const search = admissionSearch.trim().toLowerCase();

    if (!search) {
      return admissionOptions;
    }

    return admissionOptions.filter((item) =>
      [
        item.admission_id,
        item.student_id,
        item.student_name,
        getClassName(item),
        item.father_name,
        item.father_mobile,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [admissionOptions, admissionSearch]);

  useEffect(() => {
    let isMounted = true;

    const loadFees = async () => {
      setLoading(true);

      try {
        const params = new URLSearchParams();

        if (month) {
          params.set("month", month);
        }

        const res = await fetch(`/api/fees?${params.toString()}`);
        const data = await res.json();

        if (!isMounted || !data.success) {
          return;
        }

        setRows(data.records || []);
        setMetrics(data.metrics || {});
        setMonthly(data.monthly || []);
        setLedgerPage(1);

        if (autoNotify) {
          setSelectedIds(
            (data.records || [])
              .filter(
                (item) =>
                  Number(item.balance_amount || 0) > 0 &&
                  normalizePhoneNumber(item.father_mobile)
              )
              .map((item) => item.admission_id)
          );
        } else {
          setSelectedIds([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadFees();

    return () => {
      isMounted = false;
    };
  }, [month, autoNotify]);

  const filteredLedgerRows = useMemo(() => {
    const search = ledgerSearch.trim().toLowerCase();

    return rows.filter((item) => {
      const className = getClassName(item);
      const status = getStatus(item);
      const paymentMode = getPaymentMode(item);
      const balance = Number(item.balance_amount || 0);

      const matchesSearch =
        !search ||
        [
          item.admission_id,
          item.student_name,
          item.father_name,
          item.father_mobile,
          className,
          status,
          paymentMode,
          item.latest_receipt_no,
          item.utr,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search);

      const matchesClass =
        ledgerClass === "All" || className === ledgerClass;

      const matchesStatus =
        ledgerStatus === "All" || status === ledgerStatus;

      const matchesPaymentMode =
        ledgerPaymentMode === "All" || paymentMode === ledgerPaymentMode;

      const matchesDueOnly = !ledgerDueOnly || balance > 0;

      return (
        matchesSearch &&
        matchesClass &&
        matchesStatus &&
        matchesPaymentMode &&
        matchesDueOnly
      );
    });
  }, [
    rows,
    ledgerSearch,
    ledgerClass,
    ledgerStatus,
    ledgerPaymentMode,
    ledgerDueOnly,
  ]);

  const dueRows = useMemo(
    () =>
      filteredLedgerRows.filter(
        (item) =>
          Number(item.balance_amount || 0) > 0 &&
          normalizePhoneNumber(item.father_mobile)
      ),
    [filteredLedgerRows]
  );

  const ledgerTotalPages = Math.max(
    1,
    Math.ceil(filteredLedgerRows.length / ledgerPageSize)
  );

  const activeLedgerPage = Math.min(ledgerPage, ledgerTotalPages);

  const paginatedLedgerRows = useMemo(
    () =>
      filteredLedgerRows.slice(
        (activeLedgerPage - 1) * ledgerPageSize,
        activeLedgerPage * ledgerPageSize
      ),
    [filteredLedgerRows, activeLedgerPage]
  );

  const selectedRows = useMemo(
    () =>
      filteredLedgerRows.filter(
        (item) =>
          selectedIds.includes(item.admission_id) &&
          normalizePhoneNumber(item.father_mobile)
      ),
    [filteredLedgerRows, selectedIds]
  );

  const selectedCollectionAdmission = useMemo(
    () =>
      rows.find(
        (item) => String(item.admission_id) === String(entryForm.admission_id)
      ) || null,
    [rows, entryForm.admission_id]
  );
  const hasSelectedCollectionAdmission = Boolean(entryForm.admission_id);

  const allSelectableIds = useMemo(
    () => dueRows.map((item) => item.admission_id),
    [dueRows]
  );

  const isAllSelected =
    allSelectableIds.length > 0 &&
    allSelectableIds.every((id) => selectedIds.includes(id));

  const isIndeterminate =
    allSelectableIds.some((id) => selectedIds.includes(id)) && !isAllSelected;

  function resetLedgerFilters() {
    setLedgerSearch("");
    setLedgerClass("All");
    setLedgerStatus("All");
    setLedgerPaymentMode("All");
    setLedgerDueOnly(false);
    setLedgerPage(1);
  }

  function toggleAllSelection() {
    setSelectedIds((current) => {
      if (isAllSelected) {
        return current.filter((id) => !allSelectableIds.includes(id));
      }

      return Array.from(new Set([...current, ...allSelectableIds]));
    });
  }

  function toggleRowSelection(item) {
    if (!normalizePhoneNumber(item.father_mobile)) {
      return;
    }

    setSelectedIds((current) =>
      current.includes(item.admission_id)
        ? current.filter((id) => id !== item.admission_id)
        : [...current, item.admission_id]
    );
  }

  function buildWhatsAppMessage(item) {
    const parentName = item.father_name || "Parent";
    return `Dear ${parentName}, greetings from Vaksiddhi Public School (R), Manvi.\n\nThis is a school fee reminder for ${item.student_name || "your child"}.\nClass: ${getClassName(item) || "-"}\nTotal Fee: ${formatCurrency(item.total_fee)}\nPaid: ${formatCurrency(item.paid_amount)}\nBalance: ${formatCurrency(item.balance_amount)}\n\nPlease clear the pending balance at the earliest.\nThank you.`;
  }

  function openWhatsApp(item) {
    const phone = normalizePhoneNumber(item.father_mobile);

    if (!phone) {
      return;
    }

    const text = encodeURIComponent(buildWhatsAppMessage(item));

    window.open(
      `https://wa.me/${phone}?text=${text}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function openBulkWhatsApp() {
    selectedRows.forEach((item) => {
      openWhatsApp(item);
    });
  }

  function connectWhatsAppBackend() {
    if (!whatsappConfig?.connectUrl) {
      setEntryError(
        "WhatsApp backend is not configured. Add WHATSAPP_WORKER_URL and WHATSAPP_WORKER_API_KEY in .env."
      );
      return;
    }

    setRedeployError("");
    setRedeploySuccess("");
    setIsRestarting(false);
    setWhatsappModalOpen(true);
  }

  async function handleForceDisconnect() {
    setIsRestarting(true);
    setRedeployError("");
    setRedeploySuccess("");

    try {
      const response = await fetch("/api/whatsapp/restart-worker", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMsg = data.error || "Failed to restart WhatsApp worker";
        if (errorMsg.includes("Railway API credentials not configured")) {
          setRedeployError(
            "Railway API credentials not configured. Please add RAILWAY_API_TOKEN, RAILWAY_SERVICE_ID, and RAILWAY_ENVIRONMENT_ID in the configuration credentials settings below."
          );
        } else {
          setRedeployError(errorMsg);
        }
        setIsRestarting(false);
        return;
      }

      setRedeploySuccess(
        "Service restart triggered successfully! Please wait ~15-20 seconds for the worker to reboot, then click 'Open QR Code' to scan your new number."
      );

      // Refresh status after 15 seconds
      setTimeout(async () => {
        try {
          const configRes = await fetch("/api/whatsapp/config");
          const configData = await configRes.json();
          if (configRes.ok && configData.success) {
            setWhatsappConfig(configData.data || null);
          }
        } catch (e) {
          console.error("Failed to auto-refresh whatsapp status:", e);
        }
      }, 15000);

    } catch (error) {
      console.error("Force disconnect error:", error);
      setRedeployError(error.message || "Failed to restart worker. Please try again or restart manually on Railway.");
    } finally {
      setIsRestarting(false);
    }
  }

  async function handleSaveConfig() {
    setConfigSaving(true);
    setConfigSaveError("");
    setConfigSaveSuccess("");

    try {
      const response = await fetch("/api/whatsapp/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configForm),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setConfigSaveError(data.error || "Failed to save configuration");
        setConfigSaving(false);
        return;
      }

      setConfigSaveSuccess("Configuration saved successfully! Refreshing status...");

      // Instantly reload configuration status from server
      const configRes = await fetch("/api/whatsapp/config");
      const configData = await configRes.json();
      if (configRes.ok && configData.success) {
        setWhatsappConfig(configData.data || null);
      }

      setTimeout(() => setConfigSaveSuccess(""), 4000);
    } catch (error) {
      console.error("Save config error:", error);
      setConfigSaveError(error.message || "Failed to save configuration");
    } finally {
      setConfigSaving(false);
    }
  }

  function handleEntryChange(event) {
    const { name, value } = event.target;
    const shouldClearStudentReference = [
      "student_name",
      "class_name",
      "parent_name",
      "parent_mobile",
    ].includes(name);

    if (shouldClearStudentReference) {
      setAdmissionSearch("");
      setShowAdmissionDropdown(false);
    }
    setEntryForm((current) => ({
      ...current,
      [name]: value,
      ...(shouldClearStudentReference
        ? { admission_id: "", student_id: "" }
        : {}),
      ...(name === "payment_mode" ? (value === "UPI" ? {} : { utr: "" }) : {}),
    }));
  }

  function selectLedgerRowForCollection(item, options = {}) {
    setEntryError("");
    setAdmissionSearch(item.student_name || String(item.admission_id || ""));
    setShowAdmissionDropdown(false);
    setActiveFeeReceipt(null);
    setFeeReceiptSaved(false);
    setEntryForm((current) => ({
      ...current,
      admission_id: item.admission_id || "",
      student_id: item.student_id || "",
      student_name: item.student_name || "",
      class_name: getClassName(item) || "",
      parent_name: item.father_name || "",
      parent_mobile: item.father_mobile || "",
      amount_collected:
        Number(item.balance_amount || 0) > 0
          ? String(Number(item.balance_amount || 0))
          : current.amount_collected,
      payment_mode: current.payment_mode,
      utr: current.payment_mode === "UPI" ? current.utr : "",
    }));

    if (options.shouldScroll !== false) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  // Receipt upload handler removed for Cash payments per request

  function exportLedgerToExcel() {
    downloadExcel({
      fileName: `fee-ledger-${month || "all"}.xlsx`,
      sheetName: "Fee Ledger",
      rows: filteredLedgerRows.map((item) => ({
        AdmissionID: item.admission_id,
        Student: item.student_name,
        Class: getClassName(item) || "-",
        Parent: item.father_name || "-",
        ParentMobile: item.father_mobile || "-",
        TotalFee: Number(item.total_fee || 0),
        Paid: Number(item.paid_amount || 0),
        Balance: Number(item.balance_amount || 0),
        Status: getStatus(item),
        PaymentMode: getPaymentMode(item) || "-",
        LatestPaymentDate: item.latest_payment_date || "",
        LatestReceiptNo: item.latest_receipt_no || "",
      })),
    });
  }

  async function printFeeReceiptOnly() {
    const receiptElement = document.getElementById("fee-receipt-preview-source");

    if (!receiptElement) {
      setEntryError("Please open the fee receipt preview before printing.");
      return;
    }

    const iframe = document.createElement("iframe");

    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.opacity = "0";

    document.body.appendChild(iframe);

    const styles = Array.from(
      document.querySelectorAll('link[rel="stylesheet"], style')
    )
      .map((node) => node.outerHTML)
      .join("");

    const printDocument = iframe.contentWindow.document;

    printDocument.open();
    printDocument.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          ${styles}
          <style>
            @page { size: A4 landscape; margin: 0; }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: 297mm !important;
              height: 180mm !important;
              max-height: 180mm !important;
              overflow: hidden !important;
              background: #ffffff !important;
            }
            * {
              box-sizing: border-box !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .only-one-print-page {
              width: 287mm !important;
              height: 172mm !important;
              max-height: 172mm !important;
              margin: 5mm auto 0 auto !important;
              padding: 0 !important;
              overflow: hidden !important;
              background: white !important;
            }
            .print-receipt-sheet {
              display: grid !important;
              grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
              gap: 5mm !important;
              width: 100% !important;
              height: 165mm !important;
              max-height: 165mm !important;
              overflow: hidden !important;
              background: white !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .receipt-copy {
              width: 100% !important;
              height: 165mm !important;
              max-height: 165mm !important;
              overflow: hidden !important;
              border: 2px solid #000 !important;
              background: #fff !important;
              color: #000 !important;
              font-size: 8.8px !important;
              line-height: 1.05 !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .receipt-logo {
              display: block !important;
              height: 22mm !important;
              width: 105mm !important;
              max-width: 105mm !important;
              margin: 0 auto !important;
              object-fit: contain !important;
            }
            .receipt-main-title {
              font-size: 12px !important;
              letter-spacing: 0.16em !important;
              line-height: 1.1 !important;
            }
            .receipt-p-1 { padding: 2px 4px !important; }
            .receipt-p-2 { padding: 3px 5px !important; }
            .no-print { display: none !important; }
          </style>
        </head>
        <body>
          <main class="only-one-print-page">
            ${receiptElement.innerHTML}
          </main>
        </body>
      </html>
    `);
    printDocument.close();

    setTimeout(async () => {
      await waitForImages(printDocument);
      iframe.contentWindow.focus();
      iframe.contentWindow.print();

      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 1000);
    }, 300);
  }

  function saveFeeEntry(event) {
    event.preventDefault();
    setEntryError("");

    if (!validateFeeEntry()) {
      return;
    }

    if (entryForm.payment_mode === "UPI" && !entryForm.utr) {
      setEntryError("Please enter the UTR / transaction ID for UPI payments.");
      return;
    }

    setActiveFeeReceipt({
      ...entryForm,
      receipt_no: "PREVIEW",
      total_fee: Number(selectedCollectionAdmission?.total_fee || 0),
      paid_before: Number(selectedCollectionAdmission?.paid_amount || 0),
      balance_before: Number(selectedCollectionAdmission?.balance_amount || 0),
      balance_after: Math.max(
        Number(selectedCollectionAdmission?.balance_amount || 0) -
          Number(entryForm.amount_collected || 0),
        0
      ),
      letterhead,
    });
    setFeeReceiptSaved(false);
    setReceiptPreviewOpen(true);
  }

  async function submitFeeEntry({ shouldPrint = false } = {}) {
    setSavingFee(true);

    try {
      const response = await fetch("/api/fees/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_name: entryForm.student_name,
          admission_id: entryForm.admission_id || undefined,
          student_id: entryForm.student_id || undefined,
          class_name: entryForm.class_name,
          parent_name: entryForm.parent_name,
          parent_mobile: entryForm.parent_mobile,
          amount_paid: Number(entryForm.amount_collected),
          payment_mode: entryForm.payment_mode,
          payment_date: entryForm.date,
          utr: entryForm.utr || "",
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success || !data.paymentSaved) {
        throw new Error(data.error || "Unable to save fee collection");
      }

      const amountCollected = Number(entryForm.amount_collected || 0);
      const paidBefore = Number(selectedCollectionAdmission?.paid_amount || 0);
      const balanceBefore = Number(
        selectedCollectionAdmission?.balance_amount || 0
      );
      const savedReceipt = {
        ...entryForm,
        amount_collected: amountCollected,
        receipt_no: data.receiptNo,
        total_fee: Number(selectedCollectionAdmission?.total_fee || 0),
        paid_before: paidBefore,
        paid_after: paidBefore + amountCollected,
        balance_before: balanceBefore,
        balance_after: Math.max(balanceBefore - amountCollected, 0),
        letterhead,
      };

      setActiveFeeReceipt(savedReceipt);
      setFeeReceiptSaved(true);

      setEntries((current) => [
        {
          id: Date.now(),
          ...savedReceipt,
          receipt_no: data.receiptNo,
          status: "Paid",
        },
        ...current,
      ]);

      setEntryForm({
        admission_id: "",
        student_id: "",
        date: today,
        student_name: "",
        class_name: "",
        parent_name: "",
        parent_mobile: "",
        amount_collected: "",
        payment_mode: "Cash",
        utr: "",
      });
      setAdmissionSearch("");
      setShowAdmissionDropdown(false);

      setEntryError(
        data.whatsappSent
          ? "Fee saved and WhatsApp receipt sent."
          : "Fee saved, but WhatsApp failed."
      );

      const params = new URLSearchParams();

      if (month) {
        params.set("month", month);
      }

      const feesResponse = await fetch(`/api/fees?${params.toString()}`);
      const feesData = await feesResponse.json();

      if (feesResponse.ok && feesData.success) {
        setRows(feesData.records || []);
        setMetrics(feesData.metrics || {});
        setMonthly(feesData.monthly || []);
        setLedgerPage(1);

        if (autoNotify) {
          setSelectedIds(
            (feesData.records || [])
              .filter(
                (item) =>
                  Number(item.balance_amount || 0) > 0 &&
                  normalizePhoneNumber(item.father_mobile)
              )
              .map((item) => item.admission_id)
          );
        } else {
          setSelectedIds([]);
        }
      }

      if (shouldPrint) {
        setTimeout(() => {
          printFeeReceiptOnly();
        }, 150);
      }
    } catch (requestError) {
      setEntryError(requestError.message || "Unable to save fee collection");
    } finally {
      setSavingFee(false);
    }
  }

  function validateFeeEntry() {
    if (
      !entryForm.date ||
      !entryForm.admission_id ||
      !entryForm.student_name ||
      !entryForm.class_name ||
      !entryForm.parent_mobile ||
      !entryForm.amount_collected
    ) {
      setEntryError(
        "Please select an admission record and fill date, student name, class, parent mobile number, and amount collected."
      );
      return false;
    }

    return true;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Fees</h1>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Track total fees, collections, pending balances, and
                student-wise fee status.
              </p>
              
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={connectWhatsAppBackend}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white transition ${
                  whatsappConfig?.connected
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-slate-500 hover:bg-slate-600"
                }`}
              >
                <WhatsAppIcon />
                {whatsappConfig?.connected ? "WhatsApp Connected" : "Connect WhatsApp"}
              </button>

              <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={autoNotify}
                  onChange={(e) => setAutoNotify(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                />
                Auto notify due parents
              </label>

              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900"
              />
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total Fees</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">
              {formatCurrency(metrics.totalFees)}
            </h2>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total Collected
            </p>
            <h2 className="mt-3 text-3xl font-bold text-green-700">
              {formatCurrency(metrics.totalCollected)}
            </h2>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Pending Fees</p>
            <h2 className="mt-3 text-3xl font-bold text-red-700">
              {formatCurrency(metrics.pendingFees)}
            </h2>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Today&apos;s Collection
            </p>
            <h2 className="mt-3 text-3xl font-bold text-blue-700">
              {formatCurrency(metrics.todayCollection)}
            </h2>
          </div>
        </div>

        <section className="mb-6 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Fee Collection
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">
                Fee receipt entry
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                Search a student, auto-fill the admission details, review the
                receipt, then save the collection.
              </p>
            </div>

          </div>

          {entryError && (
            <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              {entryError}
            </p>
          )}

          <form
            onSubmit={saveFeeEntry}
            className="mt-6 grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-2 xl:grid-cols-3"
          >
            <div className="relative md:col-span-2 xl:col-span-3">
              <input
                value={admissionSearch}
                onChange={(event) => {
                  setAdmissionSearch(event.target.value);
                  setShowAdmissionDropdown(true);
                }}
                onFocus={() => setShowAdmissionDropdown(true)}
                placeholder="Search student name, admission no, class, parent, mobile..."
                aria-label="Search admission record"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
              />

              {showAdmissionDropdown && admissionSearch.trim() && (
                <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
                  {filteredAdmissionOptions.length > 0 ? (
                    filteredAdmissionOptions.slice(0, 12).map((item) => (
                      <button
                        type="button"
                        key={`${item.admission_id}-${item.student_id || "student"}`}
                        onClick={() =>
                          selectLedgerRowForCollection(item, {
                            shouldScroll: false,
                          })
                        }
                        className="block w-full border-b border-slate-100 px-4 py-3 text-left text-sm transition last:border-b-0 hover:bg-slate-50"
                      >
                        <span className="block font-black text-slate-900">
                          {item.student_name || "Student"}
                        </span>
                        <span className="mt-1 block text-xs font-semibold text-slate-500">
                          Admission #{item.admission_id} | Class{" "}
                          {getClassName(item) || "-"} | {item.father_name || "-"} |{" "}
                          {item.father_mobile || "-"} | Balance{" "}
                          {formatCurrency(item.balance_amount)}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-4 text-sm font-semibold text-slate-500">
                      No student found for this search.
                    </div>
                  )}
                </div>
              )}
            </div>

            <input
              name="date"
              type="date"
              value={entryForm.date}
              onChange={handleEntryChange}
              aria-label="Date"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
            />

            <input
              name="student_name"
              value={entryForm.student_name}
              onChange={handleEntryChange}
              placeholder="Student name"
              aria-label="Student name"
              readOnly={hasSelectedCollectionAdmission}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900 read-only:bg-slate-100 read-only:text-slate-600"
            />

            <select
              name="class_name"
              value={entryForm.class_name}
              onChange={handleEntryChange}
              aria-label="Class"
              disabled={hasSelectedCollectionAdmission}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900 disabled:bg-slate-100 disabled:text-slate-600"
            >
              <option value="">Select class</option>
              {classOptions.map((className) => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>

            <input
              name="parent_name"
              value={entryForm.parent_name}
              onChange={handleEntryChange}
              placeholder="Parent name"
              aria-label="Parent name"
              readOnly={hasSelectedCollectionAdmission}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900 read-only:bg-slate-100 read-only:text-slate-600"
            />

            <input
              name="parent_mobile"
              value={entryForm.parent_mobile}
              onChange={handleEntryChange}
              placeholder="Parent mobile number"
              aria-label="Parent mobile number"
              readOnly={hasSelectedCollectionAdmission}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900 read-only:bg-slate-100 read-only:text-slate-600"
            />

            <input
              name="amount_collected"
              type="number"
              value={entryForm.amount_collected}
              onChange={handleEntryChange}
              placeholder="Amount collected"
              aria-label="Amount collected"
              min="1"
              step="1"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900"
            />

            <select
              name="payment_mode"
              value={entryForm.payment_mode}
              onChange={handleEntryChange}
              aria-label="Payment mode"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
            >
              <option>Cash</option>
              <option>UPI</option>
              <option>Bank Transfer</option>
            </select>

            {/* Receipt upload for Cash removed */}

            {entryForm.payment_mode === "UPI" && (
              <input
                name="utr"
                value={entryForm.utr}
                onChange={handleEntryChange}
                placeholder="UTR / transaction ID"
                aria-label="UTR transaction ID"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900 md:col-span-2 xl:col-span-3"
              />
            )}

            <button
              type="submit"
              disabled={savingFee}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2 xl:col-span-3"
            >
              <FaPlus /> {savingFee ? "Saving fee..." : "Save fee collection"}
            </button>
          </form>

          {receiptPreviewOpen && (
            <div className="fixed inset-0 z-50 overflow-auto bg-black/60 p-4 backdrop-blur-sm">
              <div className="mx-auto max-w-7xl rounded-2xl bg-white shadow-2xl">
                <div className="no-print flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">
                      Fee Invoice Preview
                    </h2>
                    <p className="text-sm text-slate-500">
                      Review the fee invoice, save it, then print.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptPreviewOpen(false);
                      setActiveFeeReceipt(null);
                      setFeeReceiptSaved(false);
                    }}
                    className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700"
                  >
                    {feeReceiptSaved ? "Close" : "Edit"}
                  </button>
                  {feeReceiptSaved ? (
                    <button
                      type="button"
                      onClick={printFeeReceiptOnly}
                      className="rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
                    >
                      Print Again
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => submitFeeEntry()}
                        disabled={savingFee}
                        className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
                      >
                        {savingFee ? "Saving..." : "Save receipt"}
                      </button>
                      <button
                        type="button"
                        onClick={() => submitFeeEntry({ shouldPrint: true })}
                        disabled={savingFee}
                        className="rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
                      >
                        {savingFee ? "Saving..." : "Save & print"}
                      </button>
                    </>
                  )}
                  </div>
                </div>

                <div id="fee-receipt-preview-source" className="bg-white p-4">
                  <FeeReceiptSheet
                    data={activeFeeReceipt || { ...entryForm, letterhead }}
                    isSaved={feeReceiptSaved}
                  />
                </div>
              </div>
            </div>
          )}

          {/* WhatsApp Management Modal */}
          {whatsappModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-slate-100 bg-green-50 px-6 py-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
                    <WhatsAppIcon />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">WhatsApp Connection</h2>
                    <p className="text-xs font-medium text-slate-500">Manage your connected WhatsApp account</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWhatsappModalOpen(false)}
                    className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    ✕
                  </button>
                </div>

                {/* Status */}
                <div className="px-6 py-5">
                  <div className={`flex items-center gap-3 rounded-2xl p-4 ${whatsappConfig?.connected ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                    <span className={`h-3 w-3 rounded-full shrink-0 ${whatsappConfig?.connected ? "bg-green-500" : "bg-red-500"}`} />
                    <div>
                      <p className={`text-sm font-black ${whatsappConfig?.connected ? "text-green-800" : "text-red-800"}`}>
                        {whatsappConfig?.connected ? "Connected" : "Not Connected"}
                      </p>
                      {whatsappConfig?.connectedPhone && (
                        <p className="mt-0.5 text-xs font-semibold text-green-700">
                          +{whatsappConfig.connectedPhone}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Change WhatsApp instructions */}
                  <div className="mt-5">
                    <p className="text-sm font-black text-slate-900">To change WhatsApp number:</p>
                    <ol className="mt-3 space-y-3">
                      <li className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">1</span>
                        <span className="text-sm text-slate-700">
                          Open <strong>WhatsApp</strong> on the <strong>currently connected phone</strong> → Settings → Linked Devices → Remove this device
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">2</span>
                        <span className="text-sm text-slate-700">
                          Click <strong>&quot;Open QR Code&quot;</strong> below — wait a few seconds for the QR to appear
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">3</span>
                        <span className="text-sm text-slate-700">
                          On your <strong>new WhatsApp phone</strong> → Settings → Linked Devices → Link a Device → Scan the QR
                        </span>
                      </li>
                    </ol>
                  </div>

                  {/* Lost Access / Force Reset Section */}
                  <div className="mt-6 border-t border-slate-100 pt-5">
                    <h3 className="text-sm font-bold text-slate-900">Lost access to the old phone?</h3>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      If you cannot log out from the old phone, you must force reset the WhatsApp connection. This restarts the background worker service, which clears the session.
                    </p>

                    {redeployError && (
                      <div className="mt-3 rounded-2xl bg-rose-50 p-4 border border-rose-100 text-xs font-semibold text-rose-800 leading-relaxed">
                        {redeployError}
                      </div>
                    )}

                    {redeploySuccess && (
                      <div className="mt-3 rounded-2xl bg-emerald-50 p-4 border border-emerald-100 text-xs font-semibold text-emerald-800 leading-relaxed">
                        {redeploySuccess}
                      </div>
                    )}

                    <div className="mt-3">
                      <button
                        type="button"
                        disabled={isRestarting}
                        onClick={handleForceDisconnect}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50/50 px-4 py-3 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                      >
                        {isRestarting ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose-700 border-t-transparent" />
                            Restarting Service...
                          </>
                        ) : (
                          "Force Reset (Restart Service)"
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Collapsible API Configuration Section */}
                  <div className="mt-6 border-t border-slate-100 pt-5">
                    <button
                      type="button"
                      onClick={() => setShowConfigEdit(!showConfigEdit)}
                      className="w-full flex items-center justify-between text-sm font-bold text-slate-700 hover:text-slate-900 transition focus:outline-none"
                    >
                      <span className="flex items-center gap-2">⚙️ Configure API Credentials</span>
                      <span className="text-slate-400">{showConfigEdit ? "▲" : "▼"}</span>
                    </button>

                    {showConfigEdit && (
                      <div className="mt-4 space-y-4 rounded-2xl bg-slate-50 p-4 border border-slate-100 text-left">
                        <div>
                          <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1">
                            WhatsApp Worker URL
                          </label>
                          <input
                            type="text"
                            value={configForm.workerUrl}
                            onChange={(e) => setConfigForm({ ...configForm, workerUrl: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-green-500 focus:outline-none"
                            placeholder="https://your-worker.up.railway.app"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1">
                            API Key
                          </label>
                          <input
                            type="password"
                            value={configForm.workerApiKey}
                            onChange={(e) => setConfigForm({ ...configForm, workerApiKey: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-green-500 focus:outline-none"
                            placeholder="Enter Worker API Key"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1">
                            Railway API Token (Optional)
                          </label>
                          <input
                            type="password"
                            value={configForm.railwayApiToken}
                            onChange={(e) => setConfigForm({ ...configForm, railwayApiToken: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-green-500 focus:outline-none"
                            placeholder="Enter Railway API Token"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1">
                              Railway Service ID
                            </label>
                            <input
                              type="text"
                              value={configForm.railwayServiceId}
                              onChange={(e) => setConfigForm({ ...configForm, railwayServiceId: e.target.value })}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-green-500 focus:outline-none"
                              placeholder="Service ID"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1">
                              Railway Env ID
                            </label>
                            <input
                              type="text"
                              value={configForm.railwayEnvironmentId}
                              onChange={(e) => setConfigForm({ ...configForm, railwayEnvironmentId: e.target.value })}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-green-500 focus:outline-none"
                              placeholder="Env ID"
                            />
                          </div>
                        </div>

                        {configSaveError && (
                          <div className="rounded-xl bg-rose-50 p-3 border border-rose-100 text-xs font-semibold text-rose-800">
                            ❌ {configSaveError}
                          </div>
                        )}

                        {configSaveSuccess && (
                          <div className="rounded-xl bg-emerald-50 p-3 border border-emerald-100 text-xs font-semibold text-emerald-800">
                            {configSaveSuccess}
                          </div>
                        )}

                        <button
                          type="button"
                          disabled={configSaving}
                          onClick={handleSaveConfig}
                          className="w-full inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
                        >
                          {configSaving ? "Saving Credentials..." : "Save Credentials"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
                  <button
                    type="button"
                    onClick={() => setWhatsappModalOpen(false)}
                    className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      window.open(whatsappConfig?.connectUrl, "_blank", "noopener,noreferrer");
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-green-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-green-700"
                  >
                    <WhatsAppIcon />
                    Open QR Code
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {entries.slice(0, 3).map((entry) => (
              <div
                key={entry.id}
                className="rounded-3xl border border-slate-200 bg-white p-4"
              >
                <p className="font-bold text-slate-900">
                  {entry.student_name}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {entry.class_name} • {entry.date}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Parent: {entry.parent_mobile}
                </p>
                <p className="mt-3 text-lg font-black text-slate-900">
                  {formatCurrency(entry.amount_collected)}
                </p>
                <div className="mt-3 space-y-1 text-sm text-slate-500">
                  <p>Mode: {entry.payment_mode}</p>
                  {entry.payment_mode === "UPI" && (
                    <p>UTR: {entry.utr || "-"}</p>
                  )}
                  <p>
                    Status:{" "}
                    <span className="font-bold text-slate-700">
                      {entry.status || "Paid"}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="mb-6 rounded-[1.75rem] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Monthly Collection
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Month-by-month fee collection overview.
              </p>
            </div>

            <p className="text-sm font-semibold text-slate-600">
              Highest month: {formatCurrency(maxMonthly)}
            </p>
          </div>

          <div className="mt-6 overflow-x-auto pb-2">
            {monthlySeries.length > 0 ? (
              <div className="flex min-w-max items-end gap-4 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-6">
                {monthlySeries.map((item) => {
                  const collected = Number(item.collected || 0);
                  const height =
                    collected > 0
                      ? Math.max(24, (collected / maxMonthly) * 220)
                      : 8;

                  return (
                    <div
                      key={item.month_label}
                      className="flex w-24 flex-col items-center gap-3"
                    >
                      <div className="flex h-60 w-full items-end justify-center rounded-2xl bg-white px-3 py-4 shadow-inner">
                        <div
                          className="w-full rounded-t-2xl bg-primary transition hover:bg-primary-700"
                          style={{ height: `${height}px` }}
                          title={`${item.month_label}: ${formatCurrency(
                            collected
                          )}`}
                        />
                      </div>

                      <div className="text-center">
                        <p className="text-sm font-semibold text-slate-800">
                          {item.month_label}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatCurrency(collected)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No monthly collection data available.
              </p>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Student Fee Ledger
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Filter by class, status, payment mode, due students, or search
                  student / parent / mobile.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={exportLedgerToExcel}
                  aria-label="Download Excel"
                  title="Download Excel"
                  className="inline-flex h-12 w-16 items-center justify-center gap-1 rounded-2xl bg-[#217346] text-white shadow-sm transition hover:bg-[#1e6b40] focus:outline-none focus:ring-2 focus:ring-[#217346]/30"
                >
                  <FaFileExcel className="text-xl" />
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <input
                value={ledgerSearch}
                onChange={(e) => {
                  setLedgerSearch(e.target.value);
                  setLedgerPage(1);
                }}
                placeholder="Search student, parent, mobile..."
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 xl:col-span-2"
              />

              <select
                value={ledgerClass}
                onChange={(e) => {
                  setLedgerClass(e.target.value);
                  setLedgerPage(1);
                }}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900"
              >
                <option value="All">All Classes</option>
                {classOptions.map((className) => (
                  <option key={className} value={className}>
                    {className}
                  </option>
                ))}
              </select>

              <select
                value={ledgerStatus}
                onChange={(e) => {
                  setLedgerStatus(e.target.value);
                  setLedgerPage(1);
                }}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900"
              >
                <option value="All">All Status</option>
                <option value="Paid">Paid</option>
                <option value="Partial">Partial</option>
                <option value="Pending">Pending</option>
              </select>

              <select
                value={ledgerPaymentMode}
                onChange={(e) => {
                  setLedgerPaymentMode(e.target.value);
                  setLedgerPage(1);
                }}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900"
              >
                <option value="All">All Modes</option>
                {paymentModeOptions.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>

              <div className="flex gap-3">
                <label className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={ledgerDueOnly}
                    onChange={(e) => {
                      setLedgerDueOnly(e.target.checked);
                      setLedgerPage(1);
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-red-600"
                  />
                  Due only
                </label>

                <button
                  type="button"
                  onClick={resetLedgerFilters}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead style={{ backgroundColor: "#08516d" }}>
                <tr>
                  {[
                    "Student",
                    "Class",
                    "Parent",
                    "Total Fee",
                    "Paid",
                    "Balance",
                    "Status",
                    "Action",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-white"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {paginatedLedgerRows.map((item) => {
                  const hasPhone = Boolean(
                    normalizePhoneNumber(item.father_mobile)
                  );

                  return (
                    <tr
                      key={`${item.admission_id || "admission"}-${
                        item.student_id || "student"
                      }`}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {item.student_name}
                        </p>
                        <p className="text-sm text-slate-500">
                          Admission #{item.admission_id}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-700">
                        {getClassName(item) || "-"}
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-slate-900">
                          {item.father_name || "-"}
                        </p>
                        <p className="text-sm text-slate-500">
                          {item.father_mobile || "-"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm font-bold text-slate-900">
                        {formatCurrency(item.total_fee)}
                      </td>

                      <td className="px-5 py-4 text-sm font-bold text-green-700">
                        {formatCurrency(item.paid_amount)}
                      </td>

                      <td className="px-5 py-4 text-sm font-bold text-red-700">
                        {formatCurrency(item.balance_amount)}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={getStatus(item)} />
                      </td>

                      <td className="px-5 py-4 align-top">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => selectLedgerRowForCollection(item)}
                            className="inline-flex items-center rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
                          >
                            Collect
                          </button>
                          <button
                            type="button"
                            onClick={() => openWhatsApp(item)}
                            disabled={!hasPhone}
                            className="inline-flex items-center gap-2 rounded-2xl bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            <WhatsAppIcon />
                            WhatsApp
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <LedgerPagination
            currentPage={activeLedgerPage}
            totalPages={ledgerTotalPages}
            totalItems={filteredLedgerRows.length}
            pageSize={ledgerPageSize}
            label="fee records"
            onPageChange={setLedgerPage}
          />

          {loading && (
            <div className="p-10 text-center text-sm font-semibold text-slate-500">
              Loading fees...
            </div>
          )}

          {!loading && filteredLedgerRows.length === 0 && (
            <div className="p-10 text-center text-sm text-slate-500">
              No fee records found for the selected filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FeeReceiptSheet({ data, isSaved }) {
  return (
    <div className="print-receipt-sheet grid gap-6 md:grid-cols-2">
      <FeeReceiptCopy data={data} isSaved={isSaved} copyLabel="School Copy" />
      <FeeReceiptCopy data={data} isSaved={isSaved} copyLabel="Parent Copy" />
    </div>
  );
}

function FeeReceiptCopy({ data, isSaved, copyLabel }) {
  const letterheadData = data?.letterhead || {};
  const logo = letterheadData.logo || DEFAULT_LOGO;
  const schoolName = letterheadData.schoolName || SCHOOL_NAME;
  const schoolAddress = letterheadData.address || SCHOOL_ADDRESS;
  const schoolPhone = letterheadData.phone || SCHOOL_PHONE;
  const receiptNo = isSaved ? data?.receipt_no || "-" : "PREVIEW";
  const amountCollected = Number(data?.amount_collected || 0);
  const totalFee = Number(data?.total_fee || 0);
  const paidBefore = Number(data?.paid_before || 0);
  const paidAfter =
    data?.paid_after !== undefined
      ? Number(data.paid_after || 0)
      : paidBefore + amountCollected;
  const balanceAfter =
    data?.balance_after !== undefined
      ? Number(data.balance_after || 0)
      : Math.max(Number(data?.balance_before || 0) - amountCollected, 0);

  return (
    <div className="receipt-copy border-2 border-black bg-white text-[11px] leading-tight text-black">
      <div className="receipt-p-2 border-b-2 border-black text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt="School Logo"
          className="receipt-logo h-28 w-[420px] object-contain"
        />

        <p className="mt-1 text-sm font-black uppercase tracking-wide">
          {schoolName}
        </p>
        <p className="text-[10px] font-semibold">{schoolAddress}</p>
        <p className="text-[10px] font-semibold">Phone: {schoolPhone}</p>

        <div className="mt-2 border-y-2 border-black py-1">
          <h2 className="receipt-main-title text-xl font-black tracking-[0.15em]">
            FEES INVOICE
          </h2>
        </div>

        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.28em]">
          {copyLabel}
        </p>
      </div>

      <div className="grid grid-cols-2 border-b border-black">
        <div className="receipt-p-1 border-r border-black">
          <span className="font-black">Receipt No.</span>
          <span className="ml-2 font-bold">{receiptNo}</span>
        </div>

        <div className="receipt-p-1">
          <span className="font-black">Date :</span>
          <span className="ml-2 font-bold">{formatReceiptDate(data?.date)}</span>
        </div>
      </div>

      <FeeReceiptRow label="Student Name" value={data?.student_name || "-"} />
      <FeeReceiptRow label="Father's Name" value={data?.parent_name || "-"} />
      <FeeReceiptRow label="Class / Standard" value={data?.class_name || "-"} />
      <FeeReceiptRow label="Parent Mobile" value={data?.parent_mobile || "-"} />
      <FeeReceiptRow label="Payment Mode" value={data?.payment_mode || "-"} />
      {data?.utr ? <FeeReceiptRow label="UTR / Ref No." value={data.utr} /> : null}

      <div className="receipt-p-1 border-b border-black">
        <p className="font-black">Fee Payment Details:</p>
        <p className="mt-1 text-[10px]">
          Total Fee: Rs. {formatAmountPlain(totalFee)} | Paid Before: Rs.{" "}
          {formatAmountPlain(paidBefore)}
        </p>
        <p className="mt-1 text-[10px]">
          Amount Collected Now: Rs. {formatAmountPlain(amountCollected)} | Paid
          After: Rs. {formatAmountPlain(paidAfter)}
        </p>
        <p className="mt-1 text-[10px] font-black">
          Balance Pending: Rs. {formatAmountPlain(balanceAfter)}
        </p>
      </div>

      <div className="grid grid-cols-2 text-[10px]">
        <div className="receipt-p-1">
          <p className="font-black">Note:</p>
          <p>Thank you for your payment. Please keep this invoice for records.</p>
        </div>

        <div className="receipt-p-1 text-right">
          <div className="mt-5 border-t border-black pt-1 font-black">
            Authorized Signature
          </div>
        </div>
      </div>
    </div>
  );
}

function FeeReceiptRow({ label, value }) {
  return (
    <div className="grid grid-cols-[110px_1fr] border-b border-black">
      <div className="receipt-p-1 border-r border-black font-black">
        {label}
      </div>
      <div className="receipt-p-1 font-bold">{value}</div>
    </div>
  );
}

function LedgerPagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 10,
  label = "records",
  onPageChange,
}) {
  const safeTotalPages = Math.max(1, Number(totalPages || 1));
  const safeCurrentPage = Math.min(
    Math.max(Number(currentPage || 1), 1),
    safeTotalPages
  );

  const safeTotalItems = Number(totalItems || 0);
  const safePageSize = Number(pageSize || 10);

  const startItem =
    safeTotalItems === 0 ? 0 : (safeCurrentPage - 1) * safePageSize + 1;

  const endItem = Math.min(safeCurrentPage * safePageSize, safeTotalItems);

  const canGoPrevious = safeCurrentPage > 1;
  const canGoNext = safeCurrentPage < safeTotalPages;

  return (
    <div className="flex flex-col gap-4 border-t border-slate-200 bg-white px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-slate-500 md:text-base">
        Showing {startItem}-{endItem} of {safeTotalItems} {label}
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={!canGoPrevious}
          onClick={() => onPageChange?.(safeCurrentPage - 1)}
          className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:opacity-60"
        >
          Previous
        </button>

        <div className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700">
          Page {safeCurrentPage} of {safeTotalPages}
        </div>

        <button
          type="button"
          disabled={!canGoNext}
          onClick={() => onPageChange?.(safeCurrentPage + 1)}
          className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:opacity-60"
        >
          Next
        </button>
      </div>
    </div>
  );
}
