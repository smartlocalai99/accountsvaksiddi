"use client";

import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

const SCHOOL_NAME = "Vaksiddhi Public School (R), Manvi ";
const SCHOOL_ADDRESS = "Manvi, Raichur, Karnataka, India";
const SCHOOL_PHONE = "+91 9449484004";
const DEFAULT_LOGO = "/logos.png";

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return "";

  const [year, month, day] = String(dateOfBirth).split("-").map(Number);
  const today = new Date();

  if (!year || !month || !day) return "";

  let age = today.getFullYear() - year;
  const birthdayHasPassed =
    today.getMonth() + 1 > month ||
    (today.getMonth() + 1 === month && today.getDate() >= day);

  if (!birthdayHasPassed) age -= 1;

  return age >= 0 ? String(age) : "";
}

export default function AdmissionForm({ embedded = false }) {
  const [form, setForm] = useState({});
  const [feeRows, setFeeRows] = useState([]);
  const [schoolSettings, setSchoolSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [savedAdmission, setSavedAdmission] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

  const toNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : 0;
  };

  const selectedFeeRow = useMemo(
    () => feeRows.find((row) => row.class_name === form.class_applying) || null,
    [feeRows, form.class_applying]
  );

  const defaultSchoolFee = selectedFeeRow ? toNumber(selectedFeeRow.school_fee) : 0;
  const defaultHostelFee = selectedFeeRow
    ? toNumber(selectedFeeRow.hostel_first_term_fee) +
    toNumber(selectedFeeRow.hostel_second_term_fee)
    : 0;
  const feesAmount = toNumber(form.fees || defaultSchoolFee);
  const hostelFeeAmount =
    form.student_type === "Hosteller"
      ? toNumber(form.hostel_fee || defaultHostelFee)
      : 0;
  const discountPercent = toNumber(form.discount);
  const discountAmount = Math.round((feesAmount * discountPercent) / 100);
  const netSchoolFeeAmount = Math.max(feesAmount - discountAmount, 0);
  const finalFeeAmount = netSchoolFeeAmount + hostelFeeAmount;
  const isDiscountInvalid = discountPercent > 100;

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

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);
  };

  const formatAmountPlain = (value) => {
    return new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);
  };

  const formatDate = (value) => {
    const date = value ? new Date(value) : new Date();

    if (Number.isNaN(date.getTime())) {
      return new Date().toLocaleDateString("en-IN");
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  useEffect(() => {
    async function loadAdmissionSettings() {
      try {
        const [settingsResponse, feesResponse] = await Promise.all([
          fetch("/api/school-settings"),
          fetch("/api/fee-structure"),
        ]);
        const settingsData = await settingsResponse.json();
        const feesData = await feesResponse.json();

        if (settingsResponse.ok && settingsData.success) {
          setSchoolSettings(settingsData.data || null);
        }

        if (feesResponse.ok && feesData.success) {
          setFeeRows(feesData.rows || []);
        }
      } catch (error) {
        console.error("Admission settings load error:", error);
      }
    }

    loadAdmissionSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "dob" ? { age: calculateAge(value) } : {}),
      ...(name === "class_applying"
        ? getFeeDefaults(value, previous.student_type)
        : {}),
      ...(name === "student_type"
        ? getFeeDefaults(previous.class_applying, value)
        : {}),
    }));
  };

  const getFeeDefaults = (className, studentType) => {
    const row = feeRows.find((item) => item.class_name === className);

    if (!row) {
      return studentType === "Hosteller" ? {} : { hostel_fee: "0" };
    }

    const hostelTotal =
      toNumber(row.hostel_first_term_fee) + toNumber(row.hostel_second_term_fee);

    return {
      fees: String(row.school_fee || 0),
      hostel_fee: studentType === "Hosteller" ? String(hostelTotal) : "0",
    };
  };

  const handleOnlyDigits = (name, value, maxLength) => {
    setForm((previous) => ({
      ...previous,
      [name]: value.replace(/\D/g, "").slice(0, maxLength),
    }));
  };

  const validateForm = () => {
    if (!form.student_name || !form.father_mobile) {
      Swal.fire({
        icon: "warning",
        title: "Missing Fields",
        text: "Please fill student name and father mobile number.",
      });
      return false;
    }

    if (!form.class_applying) {
      Swal.fire({
        icon: "warning",
        title: "Missing Class",
        text: "Please enter class applying for.",
      });
      return false;
    }

    if (form.aadhar && !/^\d{12}$/.test(form.aadhar)) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Aadhaar Number",
        text: "Aadhaar number must contain exactly 12 digits.",
      });
      return false;
    }

    if (!feesAmount || feesAmount <= 0) {
      Swal.fire({
        icon: "warning",
        title: "Missing Fees",
        text: "Please enter total school fees.",
      });
      return false;
    }

    if (isDiscountInvalid) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Discount",
        text: "Discount percentage cannot be more than 100%.",
      });
      return false;
    }

    return true;
  };

  const openReceiptPreview = () => {
    if (!validateForm()) return;

    setSavedAdmission(null);
    setIsSaved(false);
    setReceiptOpen(true);
  };

  const closeReceiptPreview = () => {
    if (isSaved) {
      setForm({});
    }

    setReceiptOpen(false);
    setSavedAdmission(null);
    setIsSaved(false);
  };

  const waitForImages = (doc) => {
    const images = Array.from(doc.images || []);

    return Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();

        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    );
  };

  const printReceiptOnly = async () => {
    const receiptElement = document.getElementById("receipt-preview-source");

    if (!receiptElement) {
      Swal.fire({
        icon: "error",
        title: "Receipt Not Found",
        text: "Please open the receipt preview before printing.",
      });
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
            @page {
              size: A4 landscape;
              margin: 0;
            }

            html,
            body {
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

            body {
              display: block !important;
            }

            .only-one-print-page {
              width: 287mm !important;
              height: 172mm !important;
              max-height: 172mm !important;
              margin: 5mm auto 0 auto !important;
              padding: 0 !important;
              overflow: hidden !important;
              background: white !important;
              page-break-after: avoid !important;
              break-after: avoid-page !important;
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

            .receipt-school-name {
              font-size: 13px !important;
              line-height: 1.05 !important;
            }

            .receipt-main-title {
              font-size: 12px !important;
              letter-spacing: 0.16em !important;
              line-height: 1.1 !important;
            }

            .receipt-p-1 {
              padding: 2px 4px !important;
            }

            .receipt-p-2 {
              padding: 3px 5px !important;
            }

            .receipt-row-label {
              width: 100% !important;
            }

            .no-print,
            .swal2-container {
              display: none !important;
            }
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
        if (iframe && iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 1000);
    }, 400);
  };

  const handleSaveAndPrint = async () => {
    if (!validateForm()) return;

    setLoading(true);

    const payload = {
      ...form,
      fees: feesAmount,
      hostel_fee: hostelFeeAmount,
      discount: discountPercent,
      final_fee: finalFeeAmount,
    };

    try {
      const res = await fetch("/api/admission", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        const savedData = {
          ...payload,
          hostel_first_term_fee: selectedFeeRow?.hostel_first_term_fee || 0,
          hostel_second_term_fee: selectedFeeRow?.hostel_second_term_fee || 0,
          letterhead,
          ...(data.data || {}),
        };

        setSavedAdmission(savedData);
        setIsSaved(true);

        Swal.fire({
          icon: "success",
          title: "Admission Saved!",
          text: data.whatsappSent
            ? "Receipt is ready. WhatsApp message sent!"
            : data.whatsappError
              ? `Receipt is ready. WhatsApp failed: ${data.whatsappError}`
              : "Receipt is ready for printing.",
          timer: 2000,
          showConfirmButton: false,
        });

        setTimeout(() => {
          Swal.close();
          printReceiptOnly();
        }, 2200);
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.error || "Something went wrong",
        });
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  };

  const printAgain = () => {
    setTimeout(() => {
      printReceiptOnly();
    }, 200);
  };

  const receiptData = savedAdmission || {
    ...form,
    fees: feesAmount,
    hostel_fee: hostelFeeAmount,
    hostel_first_term_fee: selectedFeeRow?.hostel_first_term_fee || 0,
    hostel_second_term_fee: selectedFeeRow?.hostel_second_term_fee || 0,
    discount: discountPercent,
    final_fee: finalFeeAmount,
    letterhead,
    created_at: new Date().toISOString(),
  };

  return (
    <>
      <div
        className={`admission-form-screen ${embedded ? "w-full" : "min-h-screen"}`}
      >
        <div
          className={
            embedded
              ? "w-full space-y-8"
              : "mx-auto w-full space-y-8 bg-white p-6"
          }
        >
          <h1 className="text-center text-2xl font-bold">
            Vaksiddhi Admission Form 2026 - 2027
          </h1>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Student Information">
              <Input
                label="Full Name"
                name="student_name"
                onChange={handleChange}
                value={form.student_name || ""}
              />

              <Select
                label="Gender"
                name="gender"
                onChange={handleChange}
                value={form.gender || ""}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </Select>

              <Input
                label="Date of Birth"
                type="date"
                name="dob"
                onChange={handleChange}
                value={form.dob || ""}
              />

              <Input
                label="Age"
                name="age"
                readOnly
                value={form.age || ""}
              />

              <Select
                label="Blood Group"
                name="blood_group"
                onChange={handleChange}
                value={form.blood_group || ""}
              >
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </Select>

              <Input
                label="Aadhaar Number"
                name="aadhar"
                type="text"
                inputMode="numeric"
                maxLength={12}
                pattern="\d{12}"
                placeholder="Enter 12-digit Aadhaar number"
                onChange={(e) => handleOnlyDigits("aadhar", e.target.value, 12)}
                value={form.aadhar || ""}
              />

              <Input
                label="STS No"
                name="sts_no"
                onChange={handleChange}
                value={form.sts_no || ""}
              />

              <Input
                label="PEN Number"
                name="pen_number"
                onChange={handleChange}
                value={form.pen_number || ""}
              />

              <Input
                label="Religion"
                name="religion"
                onChange={handleChange}
                value={form.religion || ""}
              />

              <Input
                label="Caste"
                name="caste"
                onChange={handleChange}
                value={form.caste || ""}
              />

            </Section>

            <Section title="Academic Details">
              <Select
                label="Class Applying For"
                name="class_applying"
                onChange={handleChange}
                value={form.class_applying || ""}
              >
                <option value="">Select Class</option>
                {feeRows.map((row) => (
                  <option key={row.class_name} value={row.class_name}>
                    {row.class_name}
                  </option>
                ))}
              </Select>

              <Select
                label="Student Type"
                name="student_type"
                onChange={handleChange}
                value={form.student_type || "Day Scholar"}
              >
                <option value="Day Scholar">Day Scholar</option>
                <option value="Hosteller">Hosteller</option>
              </Select>

              <Input
                label="Previous School"
                name="previous_school"
                onChange={handleChange}
                value={form.previous_school || ""}
              />

              <Input
                label="Previous Class"
                name="previous_class"
                onChange={handleChange}
                value={form.previous_class || ""}
              />

              <Select
                label="Transfer Certificate"
                name="tc"
                onChange={handleChange}
                value={form.tc || ""}
              >
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </Select>

              <Select
                label="Medium"
                name="medium"
                onChange={handleChange}
                value={form.medium || ""}
              >
                <option value="">Select</option>
                <option value="English">English</option>
                <option value="Kannada">Kannada</option>
              </Select>
            </Section>
          </div>

          <Section title="Fee Details">
            <Input
              label="Total School Fees"
              type="number"
              name="fees"
              min="0"
              inputMode="numeric"
              onChange={handleChange}
              value={feesAmount || ""}
              placeholder="Auto-filled from selected class"
            />

            {form.student_type === "Hosteller" ? (
              <Input
                label="Hostel Fees"
                type="number"
                name="hostel_fee"
                min="0"
                inputMode="numeric"
                onChange={handleChange}
                value={hostelFeeAmount || ""}
                placeholder="Auto-filled for hosteller"
              />
            ) : null}

            <Input
              label="Discount (%)"
              type="number"
              name="discount"
              min="0"
              max="100"
              inputMode="numeric"
              onChange={handleChange}
              value={form.discount || ""}
              placeholder="Enter discount percentage"
            />

            <div>
              {isDiscountInvalid && (
                <p className="mt-2 text-xs font-medium text-red-600">
                  Discount percentage cannot be more than 100%.
                </p>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 md:col-span-2 lg:col-span-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Fee Summary
              </p>

              <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                <div className="rounded-lg bg-white p-3">
                  <p className="text-slate-500">Total School Fees</p>
                  <p className="mt-1 font-bold text-slate-900">
                    {formatCurrency(feesAmount)}
                  </p>
                </div>

                <div className="rounded-lg bg-emerald-50 p-3">
                  <p className="text-emerald-700">Net School Fee</p>
                  <p className="mt-1 font-black text-emerald-800">
                    {formatCurrency(netSchoolFeeAmount)}
                  </p>
                </div>

                {form.student_type === "Hosteller" ? (
                  <div className="rounded-lg bg-sky-50 p-3">
                    <p className="text-sky-700">Hostel Fee</p>
                    <p className="mt-1 font-black text-sky-800">
                      {formatCurrency(hostelFeeAmount)}
                    </p>
                  </div>
                ) : null}

                <div className="rounded-lg bg-slate-900 p-3 text-white">
                  <p>Total Payable</p>
                  <p className="mt-1 font-black">
                    {formatCurrency(finalFeeAmount)}
                  </p>
                </div>
              </div>

              {form.student_type === "Hosteller" && selectedFeeRow ? (
                <p className="mt-3 rounded-lg bg-sky-50 p-3 text-sm font-semibold text-sky-800">
                  Hostel fee: 1st Term ₹
                  {formatAmountPlain(selectedFeeRow.hostel_first_term_fee)} + 2nd
                  Term ₹{formatAmountPlain(selectedFeeRow.hostel_second_term_fee)}
                </p>
              ) : null}

            </div>
          </Section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Parent Details">
              <Input
                label="Father Name"
                name="father_name"
                onChange={handleChange}
                value={form.father_name || ""}
              />

              <Input
                label="Father Mobile"
                name="father_mobile"
                onChange={handleChange}
                value={form.father_mobile || ""}
              />

              <Input
                label="Father Occupation"
                name="father_occupation"
                onChange={handleChange}
                value={form.father_occupation || ""}
              />

              <Input
                label="Mother Name"
                name="mother_name"
                onChange={handleChange}
                value={form.mother_name || ""}
              />

              <Input
                label="Mother Mobile"
                name="mother_mobile"
                onChange={handleChange}
                value={form.mother_mobile || ""}
              />

              <Input
                label="Mother Occupation"
                name="mother_occupation"
                onChange={handleChange}
                value={form.mother_occupation || ""}
              />

              <Input
                label="Guardian Name"
                name="guardian_name"
                onChange={handleChange}
                value={form.guardian_name || ""}
              />
            </Section>

            <Section title="Bank Details">
              <Input
                label="Mother Aadhar (Last 4)"
                name="mother_aadhar"
                type="text"
                inputMode="numeric"
                maxLength={4}
                onChange={(e) =>
                  handleOnlyDigits("mother_aadhar", e.target.value, 4)
                }
                value={form.mother_aadhar || ""}
              />

              <Input
                label="Bank Account Number"
                name="bank_account"
                onChange={handleChange}
                value={form.bank_account || ""}
              />

              <Input
                label="Bank Name"
                name="bank_name"
                onChange={handleChange}
                value={form.bank_name || ""}
              />

              <Input
                label="Branch"
                name="branch"
                onChange={handleChange}
                value={form.branch || ""}
              />

              <Input
                label="IFSC Code"
                name="ifsc"
                onChange={handleChange}
                value={form.ifsc || ""}
              />
            </Section>
          </div>

          <Section title="Address Details">
            <Input
              label="Address"
              name="address"
              onChange={handleChange}
              value={form.address || ""}
            />

            <Input
              label="Door No"
              name="door_no"
              onChange={handleChange}
              value={form.door_no || ""}
            />

            <Input
              label="Street"
              name="street"
              onChange={handleChange}
              value={form.street || ""}
            />

            <Input
              label="City"
              name="city"
              onChange={handleChange}
              value={form.city || ""}
            />

            <Input
              label="Village/Ward"
              name="village"
              onChange={handleChange}
              value={form.village || ""}
            />

            <Input
              label="Pin Code"
              name="pin_code"
              onChange={handleChange}
              value={form.pin_code || ""}
            />

            <Input
              label="Emergency Contact"
              name="emergency"
              onChange={handleChange}
              value={form.emergency || ""}
            />
          </Section>

          <button
            type="button"
            onClick={openReceiptPreview}
            disabled={loading || isDiscountInvalid}
            className="w-full rounded-xl bg-black py-3 text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Preview Receipt
          </button>
        </div>
      </div>

      {receiptOpen && (
        <ReceiptPreviewModal
          data={receiptData}
          isSaved={isSaved}
          loading={loading}
          onClose={closeReceiptPreview}
          onSaveAndPrint={handleSaveAndPrint}
          onPrintAgain={printAgain}
          formatAmountPlain={formatAmountPlain}
          formatDate={formatDate}
        />
      )}
    </>
  );
}

function ReceiptPreviewModal({
  data,
  isSaved,
  loading,
  onClose,
  onSaveAndPrint,
  onPrintAgain,
  formatAmountPlain,
  formatDate,
}) {
  return (
    <div className="receipt-modal-shell fixed inset-0 z-50 overflow-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="receipt-modal-card mx-auto max-w-7xl rounded-2xl bg-white shadow-2xl">
        <div className="no-print flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Receipt Preview
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Check details first. Data will save only after clicking Submit &
              Print.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {isSaved ? "Close & New Admission" : "Edit Details"}
            </button>

            {isSaved && (
              <button
                type="button"
                onClick={onPrintAgain}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
              >
                Print Again
              </button>
            )}

            {!isSaved && (
              <button
                type="button"
                onClick={onSaveAndPrint}
                disabled={loading}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Saving..." : "Submit & Print"}
              </button>
            )}
          </div>
        </div>

        <div id="receipt-preview-source" className="receipt-print-area bg-white p-4">
          <ReceiptSheet
            data={data}
            isSaved={isSaved}
            formatAmountPlain={formatAmountPlain}
            formatDate={formatDate}
          />
        </div>
      </div>
    </div>
  );
}

function ReceiptSheet({
  data,
  isSaved,
  formatAmountPlain,
  formatDate,
}) {
  return (
    <div className="print-receipt-sheet grid gap-6 md:grid-cols-2">
      <ReceiptCopy
        data={data}
        isSaved={isSaved}
        formatAmountPlain={formatAmountPlain}
        formatDate={formatDate}
        copyLabel="School Copy"
      />

      <ReceiptCopy
        data={data}
        isSaved={isSaved}
        formatAmountPlain={formatAmountPlain}
        formatDate={formatDate}
        copyLabel="Parent Copy"
      />
    </div>
  );
}

function ReceiptCopy({
  data,
  isSaved,
  formatAmountPlain,
  formatDate,
  copyLabel,
}) {
  const receiptNo =
    isSaved && data?.id ? String(data.id).padStart(5, "0") : "PREVIEW";

  const registrationNo =
    isSaved && data?.id
      ? `VPS-${String(data.id).padStart(5, "0")}`
      : "Will generate after submit";

  const schoolTotalFee = Number(data?.fees || 0);
  const hostelFee = Number(data?.hostel_fee || 0);
  const hostelFirstTermFee = Number(data?.hostel_first_term_fee || 0);
  const hostelSecondTermFee = Number(data?.hostel_second_term_fee || 0);
  const schoolDiscount = Number(data?.discount || 0);
  const schoolDiscountAmount = Math.round((schoolTotalFee * schoolDiscount) / 100);
  const netSchoolFee = Math.max(schoolTotalFee - schoolDiscountAmount, 0);
  const schoolFinalFee = Number(data?.final_fee || 0);
  const letterhead = data?.letterhead || {};
  const logo = letterhead.logo || DEFAULT_LOGO;
  const schoolName = letterhead.schoolName || SCHOOL_NAME;
  const schoolAddress = letterhead.address || SCHOOL_ADDRESS;
  const schoolPhone = letterhead.phone || SCHOOL_PHONE;
  const className = data?.class_applying_for || data?.class_applying || "-";

  return (
    <div className="receipt-copy border-2 border-black bg-white text-[11px] leading-tight text-black">
      <div className="receipt-p-2 border-b-2 border-black text-center">
        <div className="flex items-center justify-center gap-3">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logo}
              alt="School Logo"
              className="receipt-logo h-28 w-[420px] object-contain"
            />
          </div>
        </div>

        <p className="mt-1 text-sm font-black uppercase tracking-wide">
          {schoolName}
        </p>
        <p className="text-[10px] font-semibold">{schoolAddress}</p>
        <p className="text-[10px] font-semibold">Phone: {schoolPhone}</p>

        <div className="mt-2 border-y-2 border-black py-1">
          <h2 className="receipt-main-title text-xl font-black tracking-[0.15em]">
            ADMISSION CONFIRMATION
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
          <span className="ml-2 font-bold">{formatDate(data?.created_at)}</span>
        </div>
      </div>

      <ReceiptRow label="Regn No." value={registrationNo} />
      <ReceiptRow label="Student Name" value={data?.student_name || "-"} />
      <ReceiptRow label="Father's Name" value={data?.father_name || "-"} />
      <ReceiptRow label="STS No." value={data?.sts_no || "-"} />
      <ReceiptRow label="PEN Number" value={data?.pen_number || "-"} />
      <ReceiptRow label="Caste" value={data?.caste || "-"} />

      <div className="grid grid-cols-2 border-b border-black">
        <div className="receipt-p-1 border-r border-black">
          <span className="font-black">Class / Standard</span>
          <span className="ml-2 font-bold">{className}</span>
        </div>

        <div className="receipt-p-1">
          <span className="font-black">Medium :</span>
          <span className="ml-2 font-bold">{data?.medium || "-"}</span>
        </div>
      </div>

      <ReceiptRow label="Student Type" value={data?.student_type || "Day Scholar"} />

      <div className="receipt-p-1 border-b border-black">
        <p className="font-black">School Fee Details:</p>
        <p className="mt-1 text-[10px]">
          School Fee: ₹{formatAmountPlain(schoolTotalFee)} | Discount:{" "}
          {schoolDiscount}% (-₹{formatAmountPlain(schoolDiscountAmount)}) | Net
          School Fee: ₹{formatAmountPlain(netSchoolFee)}
        </p>
        {hostelFee > 0 ? (
          <p className="mt-1 text-[10px]">
            Hostel Fee: 1st Term ₹{formatAmountPlain(hostelFirstTermFee)} + 2nd
            Term ₹{formatAmountPlain(hostelSecondTermFee)} = ₹
            {formatAmountPlain(hostelFee)}
          </p>
        ) : null}
        <p className="mt-1 text-[10px] font-black">
          Total Payable: ₹{formatAmountPlain(schoolFinalFee)}
        </p>
        <p className="mt-1 text-[10px] font-semibold">
          This document confirms the admission entry only. Fee payments are
          recorded separately.
        </p>
      </div>

      <div className="grid grid-cols-2 text-[10px]">
        <div className="receipt-p-1">
          <p className="font-black">Note:</p>
          <p>No admission confirmation fee is collected with this form.</p>
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

function ReceiptRow({ label, value }) {
  return (
    <div className="grid grid-cols-[110px_1fr] border-b border-black">
      <div className="receipt-row-label receipt-p-1 border-r border-black font-black">
        {label}
      </div>
      <div className="receipt-p-1 font-bold">{value}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h2 className="mb-4 rounded-t-lg border-b bg-primary px-4 py-3 text-center text-lg font-semibold text-white">
        {title}
      </h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>

      <input
        {...props}
        className="mt-1 w-full rounded-lg border p-2 outline-none focus:ring-2 focus:ring-black"
      />
    </div>
  );
}

function Select({ label, children, ...props }) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>

      <select
        {...props}
        className="mt-1 w-full rounded-lg border p-2 outline-none focus:ring-2 focus:ring-black"
      >
        {children}
      </select>
    </div>
  );
}
