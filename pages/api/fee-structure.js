import { query } from "@/lib/db";

const DEFAULT_ROWS = [
  ["Baby", 15000],
  ["L.K.G.", 16000],
  ["U.K.G.", 17000],
  ["1st Std", 18000],
  ["2nd Std", 19000],
  ["3rd Std", 20000],
  ["4th Std", 21000],
  ["5th Std", 22000],
  ["6th Std", 23000],
  ["7th Std", 24000],
  ["8th Std", 25000],
];

async function ensureFeeStructureTable() {
  await query(
    `
      CREATE TABLE IF NOT EXISTS public.fee_structure (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        class_name VARCHAR(50) UNIQUE NOT NULL,
        school_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
        hostel_first_term_fee NUMERIC(12, 2) NOT NULL DEFAULT 40000,
        hostel_second_term_fee NUMERIC(12, 2) NOT NULL DEFAULT 20000,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `,
    []
  );

  for (const [index, [className, schoolFee]] of DEFAULT_ROWS.entries()) {
    await query(
      `
        INSERT INTO public.fee_structure (
          class_name,
          school_fee,
          hostel_first_term_fee,
          hostel_second_term_fee,
          display_order
        ) VALUES ($1, $2, 40000, 20000, $3)
        ON CONFLICT (class_name) DO NOTHING
      `,
      [className, schoolFee, index + 1]
    );
  }
}

function normalizeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function mapRow(row) {
  return {
    id: row.id,
    class_name: row.class_name,
    school_fee: Number(row.school_fee || 0),
    hostel_first_term_fee: Number(row.hostel_first_term_fee || 0),
    hostel_second_term_fee: Number(row.hostel_second_term_fee || 0),
    hostel_total_fee:
      Number(row.hostel_first_term_fee || 0) +
      Number(row.hostel_second_term_fee || 0),
    display_order: Number(row.display_order || 0),
  };
}

export default async function handler(req, res) {
  try {
    await ensureFeeStructureTable();

    if (req.method === "GET") {
      const result = await query(
        `
          SELECT *
          FROM public.fee_structure
          ORDER BY display_order ASC, id ASC
        `,
        []
      );

      return res.status(200).json({
        success: true,
        rows: result.rows.map(mapRow),
      });
    }

    if (req.method === "PUT") {
      const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];

      for (const [index, row] of rows.entries()) {
        const className = String(row.class_name || "").trim();

        if (!className) {
          continue;
        }

        await query(
          `
            INSERT INTO public.fee_structure (
              class_name,
              school_fee,
              hostel_first_term_fee,
              hostel_second_term_fee,
              display_order
            ) VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (class_name)
            DO UPDATE SET
              school_fee = EXCLUDED.school_fee,
              hostel_first_term_fee = EXCLUDED.hostel_first_term_fee,
              hostel_second_term_fee = EXCLUDED.hostel_second_term_fee,
              display_order = EXCLUDED.display_order,
              updated_at = NOW()
          `,
          [
            className,
            normalizeNumber(row.school_fee),
            normalizeNumber(row.hostel_first_term_fee),
            normalizeNumber(row.hostel_second_term_fee),
            Number(row.display_order || index + 1),
          ]
        );
      }

      const result = await query(
        `
          SELECT *
          FROM public.fee_structure
          ORDER BY display_order ASC, id ASC
        `,
        []
      );

      return res.status(200).json({
        success: true,
        rows: result.rows.map(mapRow),
      });
    }

    res.setHeader("Allow", ["GET", "PUT"]);
    return res.status(405).json({ success: false, error: "Method not allowed" });
  } catch (error) {
    console.error("Fee structure API Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to save fee structure",
    });
  }
}
