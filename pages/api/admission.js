import { Pool } from "pg";
import { getWhatsAppConfig } from "@/lib/whatsapp";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function cleanValue(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return value;
}

function cleanNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function formatWhatsAppPhone(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

async function sendWhatsAppAdmission(admission) {
  const config = await getWhatsAppConfig();
  const workerUrl = config.workerUrl;
  const workerApiKey = config.workerApiKey;

  if (!workerUrl || !workerApiKey) {
    throw new Error("WhatsApp worker credentials not configured");
  }

  const phone = formatWhatsAppPhone(admission.father_mobile || admission.mother_mobile);
  if (!phone) {
    throw new Error("No parent mobile number available for WhatsApp notification");
  }

  const parentName = admission.father_name || admission.mother_name || "Parent";
  const studentName = admission.student_name;
  const admissionNo = `VPS-${String(admission.id).padStart(5, "0")}`;
  const className = admission.class_applying_for || "-";

  const formatINR = (val) => Number(val || 0).toLocaleString("en-IN");
  const fees = formatINR(admission.fees);
  const hostelFeeAmount = Number(admission.hostel_fee || 0);
  const hostelFee = formatINR(hostelFeeAmount);
  const discount = admission.discount || "0";
  const finalFee = formatINR(admission.final_fee);
  const isHosteller =
    String(admission.student_type || "").toLowerCase() === "hosteller";
  const hostelFeeLine =
    isHosteller && hostelFeeAmount > 0 ? `Hostel Fee: ₹${hostelFee}\n` : "";

  const message = `Dear ${parentName}, greetings from Vaksiddhi Public School (R), Manvi.

We are pleased to inform you that the admission application for ${studentName} has been submitted successfully.

Admission No: ${admissionNo}
Class: ${className}
Total School Fee: ₹${fees}
Discount: ${discount}%
${hostelFeeLine}Student Type: ${admission.student_type || "Day Scholar"}
Final Payable Fee: ₹${finalFee}

Thank you.
Vaksiddhi Public School (R), Manvi`;

  const response = await fetch(`${workerUrl}/api/messages/send-test`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": workerApiKey,
    },
    body: JSON.stringify({
      recipient_phone: phone,
      message_text: message,
    }),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok || data?.success === false || data?.ok === false) {
    throw new Error(data?.error || "WhatsApp worker failed");
  }

  return data;
}

async function ensureAdmissionColumns(client) {
  await client.query(`
    ALTER TABLE public.admissions
      ADD COLUMN IF NOT EXISTS sts_no VARCHAR(50),
      ADD COLUMN IF NOT EXISTS pen_number VARCHAR(50),
      ADD COLUMN IF NOT EXISTS caste VARCHAR(100),
      ADD COLUMN IF NOT EXISTS student_type VARCHAR(30) NOT NULL DEFAULT 'Day Scholar',
      ADD COLUMN IF NOT EXISTS hostel_fee NUMERIC(12, 2) NOT NULL DEFAULT 0
  `);

  await client.query(`
    ALTER TABLE public.students
      ADD COLUMN IF NOT EXISTS sts_no VARCHAR(50),
      ADD COLUMN IF NOT EXISTS pen_number VARCHAR(50),
      ADD COLUMN IF NOT EXISTS caste VARCHAR(100),
      ADD COLUMN IF NOT EXISTS student_type VARCHAR(30) NOT NULL DEFAULT 'Day Scholar'
  `);
}

export default async function handler(req, res) {
  try {
    await ensureAdmissionColumns(pool);

    if (req.method === "GET") {
      const result = await pool.query(
        `
        SELECT 
          id,
          student_name,
          gender,
          date_of_birth,
          age,
          blood_group,
          aadhar_last4,
          religion,
          sts_no,
          pen_number,
          caste,
          class_applying_for,
          previous_school_name,
          previous_class,
          transfer_certificate,
          medium,
          student_type,
          hostel_fee,
          father_name,
          father_mobile,
          father_occupation,
          mother_name,
          mother_mobile,
          mother_occupation,
          guardian_name,
          mother_aadhar_last4,
          mother_bank_account,
          bank_name,
          branch_name,
          ifsc_code,
          address,
          door_no,
          street,
          city,
          village,
          pin_code,
          emergency_contact,
          created_at,
          parent_id,
          fees,
          discount,
          final_fee
        FROM public.admissions
        ORDER BY created_at DESC, id DESC
        `
      );

      return res.status(200).json({
        success: true,
        admissions: result.rows,
      });
    }

    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        error: "Method not allowed",
      });
    }

    const body = req.body;
    const aadhar = String(body.aadhar || "").replace(/\D/g, "");

    if (body.aadhar && aadhar.length !== 12) {
      return res.status(400).json({
        success: false,
        error: "Aadhaar number must contain exactly 12 digits",
      });
    }

    const fees = cleanNumber(body.fees);
    const hostelFee = cleanNumber(body.hostel_fee);
    const discount = cleanNumber(body.discount);

    // discount is percentage
    const discountAmount = Math.round((fees * discount) / 100);
    const finalFee = Math.max(fees - discountAmount, 0) + hostelFee;

    const client = await pool.connect();
    let clientReleased = false;

    try {
      await client.query("BEGIN");

      const parentResult = await client.query(
        `
          INSERT INTO public.parents (
            father_name,
            father_mobile,
            mother_name,
            mother_mobile
          ) VALUES ($1, $2, $3, $4)
          RETURNING id;
        `,
        [
          cleanValue(body.father_name),
          cleanValue(body.father_mobile),
          cleanValue(body.mother_name),
          cleanValue(body.mother_mobile),
        ]
      );

      const parentId = parentResult.rows[0]?.id || null;
      const admissionResult = await client.query(
        `
          INSERT INTO public.admissions (
            student_name,
            gender,
            date_of_birth,
            age,
            blood_group,
            aadhar_last4,
            religion,
            sts_no,
            pen_number,
            caste,

            class_applying_for,
            previous_school_name,
            previous_class,
            transfer_certificate,
            medium,
            student_type,
            hostel_fee,

            fees,
            discount,
            final_fee,

            father_name,
            father_mobile,
            father_occupation,

            mother_name,
            mother_mobile,
            mother_occupation,

            guardian_name,
            parent_id,

            mother_aadhar_last4,
            mother_bank_account,
            bank_name,
            branch_name,
            ifsc_code,

            address,
            door_no,
            street,
            city,
            village,
            pin_code,
            emergency_contact
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,

            $11, $12, $13, $14, $15, $16, $17,

            $18, $19, $20,

            $21, $22, $23,

            $24, $25, $26,

            $27, $28,

            $29, $30, $31, $32, $33,

            $34, $35, $36, $37, $38, $39, $40
          )
          RETURNING *;
        `,
        [
          cleanValue(body.student_name),
          cleanValue(body.gender),
          cleanValue(body.dob),
          cleanValue(body.age),
          cleanValue(body.blood_group),
          cleanValue(aadhar),
          cleanValue(body.religion),
          cleanValue(body.sts_no),
          cleanValue(body.pen_number),
          cleanValue(body.caste),

          cleanValue(body.class_applying),
          cleanValue(body.previous_school),
          cleanValue(body.previous_class),
          body.tc === "Yes" ? true : body.tc === "No" ? false : null,
          cleanValue(body.medium),
          cleanValue(body.student_type) || "Day Scholar",
          hostelFee,

          fees,
          discount,
          finalFee,

          cleanValue(body.father_name),
          cleanValue(body.father_mobile),
          cleanValue(body.father_occupation),

          cleanValue(body.mother_name),
          cleanValue(body.mother_mobile),
          cleanValue(body.mother_occupation),

          cleanValue(body.guardian_name),
          parentId,

          cleanValue(body.mother_aadhar),
          cleanValue(body.bank_account),
          cleanValue(body.bank_name),
          cleanValue(body.branch),
          cleanValue(body.ifsc),

          cleanValue(body.address),
          cleanValue(body.door_no),
          cleanValue(body.street),
          cleanValue(body.city),
          cleanValue(body.village),
          cleanValue(body.pin_code),
          cleanValue(body.emergency),
        ]
      );

      const admission = admissionResult.rows[0];

      await client.query(
        `
          INSERT INTO public.students (
            full_name,
            gender,
            date_of_birth,
            age,
            class,
            blood_group,
            religion,
            medium,
            sts_no,
            pen_number,
            caste,
            student_type,
            admission_id,
            student_unique_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING id;
        `,
        [
          cleanValue(body.student_name),
          cleanValue(body.gender),
          cleanValue(body.dob),
          cleanValue(body.age),
          cleanValue(body.class_applying),
          cleanValue(body.blood_group),
          cleanValue(body.religion),
          cleanValue(body.medium),
          cleanValue(body.sts_no),
          cleanValue(body.pen_number),
          cleanValue(body.caste),
          cleanValue(body.student_type) || "Day Scholar",
          admission.id,
          `STU-${admission.id}`,
        ]
      );

      await client.query("COMMIT");
      client.release();
      clientReleased = true;

      try {
        await sendWhatsAppAdmission(admission);
        return res.status(200).json({
          success: true,
          data: admission,
          whatsappSent: true,
        });
      } catch (waError) {
        console.error("Admission WhatsApp Error:", waError);
        return res.status(200).json({
          success: true,
          data: admission,
          whatsappSent: false,
          whatsappError: waError.message || "Failed to send WhatsApp message",
        });
      }
    } catch (transactionError) {
      await client.query("ROLLBACK");
      throw transactionError;
    } finally {
      if (!clientReleased) {
        client.release();
      }
    }
  } catch (err) {
    console.error("Admission API Error:", err);

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}
