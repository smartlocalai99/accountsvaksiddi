"use client";
import React, { useState } from "react";
import Swal from "sweetalert2";



export default function AdmissionForm() {
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    // 🔴 Basic validation
    if (!form.student_name || !form.father_mobile) {
      Swal.fire({
        icon: "warning",
        title: "Missing Fields",
        text: "Please fill required fields",
      });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admission", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (data.success) {
        Swal.fire({
          icon: "success",
          title: "Admission Submitted!",
          text: "Admission Submitted Successfully!",
        });
        setForm({});
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
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full space-y-8 bg-white p-6">

        <h1 className="text-2xl font-bold text-center">
          Quantum Heights Admission Form 2026 -2027
        </h1>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* STUDENT INFO */}
          <Section title="Student Information">
            <Input label="Full Name" name="student_name" onChange={handleChange} value={form.student_name || ""} />
            <Select label="Gender" name="gender" onChange={handleChange} value={form.gender || ""}>
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </Select>
            <Input label="Date of Birth" type="date" name="dob" onChange={handleChange} value={form.dob || ""} />
            <Input label="Age" name="age" onChange={handleChange} value={form.age || ""} />
            <Input label="Blood Group" name="blood_group" onChange={handleChange} value={form.blood_group || ""} />
            <Input label="Aadhar (Last 4 Digits)" name="aadhar" onChange={handleChange} value={form.aadhar || ""} />
            <Input label="Nationality" name="nationality" onChange={handleChange} value={form.nationality || ""} />
            <Input label="Religion" name="religion" onChange={handleChange} value={form.religion || ""} />
          </Section>

          {/* ACADEMIC */}
          <Section title="Academic Details">
            <Input label="Class Applying For" name="class_applying" onChange={handleChange} value={form.class_applying || ""} />
            <Input label="Previous School" name="previous_school" onChange={handleChange} value={form.previous_school || ""} />
            <Input label="Previous Class" name="previous_class" onChange={handleChange} value={form.previous_class || ""} />

            <Select label="Transfer Certificate" name="tc" onChange={handleChange} value={form.tc || ""}>
              <option value="">Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </Select>

            <Select label="Medium" name="medium" onChange={handleChange} value={form.medium || ""}>
              <option value="">Select</option>
              <option value="English">English</option>
              <option value="Telugu">Telugu</option>
            </Select>

            <Select label="Program" name="program" onChange={handleChange} value={form.program || ""}>
              <option value="">Select</option>
              <option value="Quantum">Quantum</option>
              <option value="Quantum Pro">Quantum Pro</option>
              <option value="Quantum Elite">Quantum Elite</option>
            </Select>

            <Select label="Admission Fee Mode" name="admission_fee_mode" onChange={handleChange} value={form.admission_fee_mode || ""}>
              <option value="">Select Payment Mode</option>
              <option value="PhonePe">PhonePe</option>
              <option value="Cash">Cash</option>
            </Select>
          </Section>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* PARENT */}
          <Section title="Parent Details">
            <Input label="Father Name" name="father_name" onChange={handleChange} value={form.father_name || ""} />
            <Input label="Father Mobile" name="father_mobile" onChange={handleChange} value={form.father_mobile || ""} />
            <Input label="Father Occupation" name="father_occupation" onChange={handleChange} value={form.father_occupation || ""} />

            <Input label="Mother Name" name="mother_name" onChange={handleChange} value={form.mother_name || ""} />
            <Input label="Mother Mobile" name="mother_mobile" onChange={handleChange} value={form.mother_mobile || ""} />
            <Input label="Mother Occupation" name="mother_occupation" onChange={handleChange} value={form.mother_occupation || ""} />

            <Input label="Guardian Name" name="guardian_name" onChange={handleChange} value={form.guardian_name || ""} />
          </Section>

          {/* BANK DETAILS */}
          <Section title="Bank Details">
            <Input label="Mother Aadhar (Last 4)" name="mother_aadhar" onChange={handleChange} value={form.mother_aadhar || ""} />
            <Input label="Bank Account Number" name="bank_account" onChange={handleChange} value={form.bank_account || ""} />
            <Input label="Bank Name" name="bank_name" onChange={handleChange} value={form.bank_name || ""} />
            <Input label="Branch" name="branch" onChange={handleChange} value={form.branch || ""} />
            <Input label="IFSC Code" name="ifsc" onChange={handleChange} value={form.ifsc || ""} />
          </Section>
        </div>

        {/* ADDRESS */}
        <Section title="Address Details">
          <Input label="Address" name="address" onChange={handleChange} value={form.address || ""} />
          <Input label="Door No" name="door_no" onChange={handleChange} value={form.door_no || ""} />
          <Input label="Street" name="street" onChange={handleChange} value={form.street || ""} />
          <Input label="City" name="city" onChange={handleChange} value={form.city || ""} />
          <Input label="Village/Ward" name="village" onChange={handleChange} value={form.village || ""} />
          <Input label="Pin Code" name="pin_code" onChange={handleChange} value={form.pin_code || ""} />
          <Input label="Emergency Contact" name="emergency" onChange={handleChange} value={form.emergency || ""} />
        </Section>

        {/* SUBMIT */}
        {/* Desktop/Tablet: normal button, Mobile: fixed at bottom */}
        <div className="block md:hidden h-16" /> {/* Spacer for mobile fixed button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-black text-white py-3 rounded-xl hover:bg-gray-800 transition hidden md:block"
        >
          {loading ? "Submitting..." : "Submit Application"}
        </button>
        {/* Fixed button for mobile */}
        <div className="md:hidden">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="fixed bottom-0 left-0 w-full bg-black text-white py-4 rounded-none shadow-2xl z-40 text-lg"
            style={{borderRadius: 0}}
          >
            {loading ? "Submitting..." : "Submit Application"}
          </button>
        </div>

      </div>
    </div>
  );
}

/* ---------- REUSABLE COMPONENTS ---------- */

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h2 className="mb-4 border-b pb-2 bg-[#711d18] text-white text-center text-lg font-semibold rounded-t-lg px-4 py-3">
        {title}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
        className="w-full border rounded-lg p-2 mt-1 outline-none focus:ring-2 focus:ring-black"
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
        className="w-full border rounded-lg p-2 mt-1 outline-none focus:ring-2 focus:ring-black"
      >
        {children}
      </select>
    </div>
  );
}