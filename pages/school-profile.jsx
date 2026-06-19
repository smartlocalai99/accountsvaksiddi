import { useEffect, useMemo, useState } from "react";
import { withAuthPage } from "@/lib/withAuthPage";

export const getServerSideProps = withAuthPage({ path: "/school-profile" });

const initialForm = {
  school_name: "Vaksiddhi Public School (R), Manvi",
  school_code: "",
  school_address: "Manvi, Raichur, Karnataka, India",
  established_year: "",
  academic_year: "",
  principal_name: "",
  contact_number: "+91 9449484004",
  email: "",
  school_logo: "/logos.png",
  letterhead_logo: "/logos.png",
  letterhead_school_name: "Vaksiddhi Public School (R), Manvi",
  letterhead_address: "Manvi, Raichur, Karnataka, India",
  admission_number_prefix: "",
  account_name: "",
  bank_name: "",
  branch_name: "",
  account_number: "",
  ifsc_code: "",
  upi_id: "",
  qr_code_image: "",
};

const DEFAULT_LOGO = "/logos.png";

export default function SchoolProfilePage() {
  const [form, setForm] = useState(initialForm);
  const [feeRows, setFeeRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSchoolSettings() {
      try {
        setLoading(true);
        setError("");

        const [settingsResponse, feesResponse] = await Promise.all([
          fetch("/api/school-settings"),
          fetch("/api/fee-structure"),
        ]);
        const data = await settingsResponse.json();
        const feeData = await feesResponse.json();

        if (!settingsResponse.ok || !data.success) {
          throw new Error(data.message || "Failed to load school settings");
        }

        if (!feesResponse.ok || !feeData.success) {
          throw new Error(feeData.error || "Failed to load fee structure");
        }

        if (data.data) {
          setForm((current) => ({ ...current, ...data.data }));
        }

        setFeeRows(feeData.rows || []);
      } catch (loadError) {
        setError(loadError.message || "Failed to load school settings");
      } finally {
        setLoading(false);
      }
    }

    loadSchoolSettings();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleFeeChange(index, fieldName, value) {
    setFeeRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [fieldName]: value } : row
      )
    );
  }

async function handleFileChange(event, fieldName) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const result = typeof reader.result === "string" ? reader.result : "";

      try {
        setError("");

        const response = await fetch("/api/school-settings/upload-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fieldName,
            image: result,
          }),
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to upload image");
        }

        setForm((current) => ({ ...current, [fieldName]: data.url }));
      } catch (uploadError) {
        setError(uploadError.message || "Failed to upload image");
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const response = await fetch("/api/school-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to save school settings");
      }

      const feeResponse = await fetch("/api/fee-structure", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rows: feeRows }),
      });
      const feeData = await feeResponse.json();

      if (!feeResponse.ok || !feeData.success) {
        throw new Error(feeData.error || "Failed to save fee structure");
      }

      if (data.data) {
        setForm((current) => ({ ...current, ...data.data }));
      }

      setFeeRows(feeData.rows || []);

      setMessage("School profile saved successfully.");
    } catch (saveError) {
      setError(saveError.message || "Failed to save school settings");
    } finally {
      setSaving(false);
    }
  }

  const logoPreview = useMemo(() => form.school_logo || DEFAULT_LOGO, [form.school_logo]);
  const letterheadLogoPreview = useMemo(
    () => form.letterhead_logo || form.school_logo || DEFAULT_LOGO,
    [form.letterhead_logo, form.school_logo]
  );

  if (loading) {
    return (
      <div className="px-4 py-6 md:px-6">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          Loading school settings...
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 md:px-6">
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              School Profile
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
              School Information
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            Configure the school details used across admissions and payments.
          </p>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {message}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="School Name" name="school_name" value={form.school_name} onChange={handleChange} required />
            <Field label="School Code" name="school_code" value={form.school_code} onChange={handleChange} />
            <Field label="School Address" name="school_address" value={form.school_address} onChange={handleChange} />
            <Field label="Established Year" name="established_year" value={form.established_year} onChange={handleChange} />
            <Field label="Academic Year" name="academic_year" value={form.academic_year} onChange={handleChange} />
            <Field label="Principal Name" name="principal_name" value={form.principal_name} onChange={handleChange} />
            <Field label="Contact Number" name="contact_number" value={form.contact_number} onChange={handleChange} />
            <Field label="Email" name="email" value={form.email} onChange={handleChange} />
            <Field label="Admission Number Prefix" name="admission_number_prefix" value={form.admission_number_prefix} onChange={handleChange} />
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Receipt Letterhead</h2>
            <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Letterhead Logo</span>
                <div className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={letterheadLogoPreview}
                    alt="Letterhead logo preview"
                    className="h-32 w-full object-contain p-4"
                  />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleFileChange(event, "letterhead_logo")}
                  className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Letterhead School Name" name="letterhead_school_name" value={form.letterhead_school_name} onChange={handleChange} />
                <Field label="Letterhead Address" name="letterhead_address" value={form.letterhead_address} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Fee Structure</h2>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Class</th>
                    <th className="px-4 py-3">School Fee</th>
                    <th className="px-4 py-3">Hostel 1st Term</th>
                    <th className="px-4 py-3">Hostel 2nd Term</th>
                    <th className="px-4 py-3">Hostel Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {feeRows.map((row, index) => {
                    const hostelTotal =
                      Number(row.hostel_first_term_fee || 0) +
                      Number(row.hostel_second_term_fee || 0);

                    return (
                      <tr key={row.id || row.class_name}>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {row.class_name}
                        </td>
                        <td className="px-4 py-3">
                          <NumberField value={row.school_fee} onChange={(value) => handleFeeChange(index, "school_fee", value)} />
                        </td>
                        <td className="px-4 py-3">
                          <NumberField value={row.hostel_first_term_fee} onChange={(value) => handleFeeChange(index, "hostel_first_term_fee", value)} />
                        </td>
                        <td className="px-4 py-3">
                          <NumberField value={row.hostel_second_term_fee} onChange={(value) => handleFeeChange(index, "hostel_second_term_fee", value)} />
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          ₹{hostelTotal.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Bank Details</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Account Name" name="account_name" value={form.account_name} onChange={handleChange} />
                <Field label="Account Number" name="account_number" value={form.account_number} onChange={handleChange} />
                <Field label="Bank Name" name="bank_name" value={form.bank_name} onChange={handleChange} />
                <Field label="IFSC Code" name="ifsc_code" value={form.ifsc_code} onChange={handleChange} />
                <Field label="Branch Name" name="branch_name" value={form.branch_name} onChange={handleChange} />
                <Field label="UPI ID" name="upi_id" value={form.upi_id} onChange={handleChange} />
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Uploads</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">School Logo</span>
                  <div className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoPreview}
                      alt="School logo preview"
                      className="h-40 w-full object-contain p-4"
                    />
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleFileChange(event, "school_logo")}
                    className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">QR Code Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleFileChange(event, "qr_code_image")}
                    className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
                  />
                  {form.qr_code_image ? (
                    <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={form.qr_code_image}
                        alt="QR code preview"
                        className="h-40 w-full object-contain p-4"
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setForm(initialForm)}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? "Saving..." : "Save School Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, placeholder, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      <input
        {...props}
        placeholder={placeholder || `Enter ${label.toLowerCase()}`}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
      />
    </label>
  );
}

function NumberField({ value, onChange }) {
  return (
    <input
      type="number"
      min="0"
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
      className="w-36 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900"
    />
  );
}
