import { Pool } from "pg";

const pool =
  global.pgPool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  });

if (!global.pgPool) global.pgPool = pool;

export default async function handler(req, res) {
  const {
    query: { id },
    method,
  } = req;

  if (method !== "DELETE") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  const studentId = Number(id);

  if (!studentId) {
    return res.status(400).json({
      success: false,
      error: "Invalid student id",
    });
  }

  try {
    const studentResult = await pool.query(
      `SELECT id, admission_id FROM public.students WHERE id = $1 LIMIT 1`,
      [studentId]
    );

    const student = studentResult.rows[0];

    if (!student) {
      return res.status(404).json({
        success: false,
        error: "Student not found",
      });
    }

    if (student.admission_id) {
      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        const admissionResult = await client.query(
          `
            SELECT id, parent_id, father_name, father_mobile, mother_name, mother_mobile
            FROM public.admissions
            WHERE id = $1
            FOR UPDATE
          `,
          [student.admission_id]
        );
        const admission = admissionResult.rows[0];

        await client.query(`DELETE FROM public.fee_payments WHERE admission_id = $1`, [
          student.admission_id,
        ]);

        const studentsResult = await client.query(
          `DELETE FROM public.students WHERE admission_id = $1 RETURNING id`,
          [student.admission_id]
        );

        if (admission) {
          await client.query(`DELETE FROM public.admissions WHERE id = $1`, [
            student.admission_id,
          ]);
        }

        const parentIdsToCheck = new Set();

        if (admission?.parent_id) {
          parentIdsToCheck.add(admission.parent_id);
        }

        if (admission) {
          const matchingParentsResult = await client.query(
            `
              SELECT id
              FROM public.parents
              WHERE (
                NULLIF($1::text, '') IS NOT NULL
                AND regexp_replace(COALESCE(father_mobile, ''), '\\D', '', 'g') =
                    regexp_replace($1::text, '\\D', '', 'g')
              )
              OR (
                NULLIF($2::text, '') IS NOT NULL
                AND regexp_replace(COALESCE(mother_mobile, ''), '\\D', '', 'g') =
                    regexp_replace($2::text, '\\D', '', 'g')
              )
              OR (
                NULLIF($3::text, '') IS NOT NULL
                AND LOWER(TRIM(COALESCE(father_name, ''))) = LOWER(TRIM($3::text))
                AND NULLIF($1::text, '') IS NULL
              )
            `,
            [
              admission.father_mobile || "",
              admission.mother_mobile || "",
              admission.father_name || "",
            ]
          );

          matchingParentsResult.rows.forEach((row) => parentIdsToCheck.add(row.id));
        }

        const deletedParentIds = [];

        for (const parentId of parentIdsToCheck) {
          const parentUsageResult = await client.query(
            `
              SELECT COUNT(*)::int AS count
              FROM public.admissions
              WHERE parent_id = $1
                OR (
                  NULLIF($2::text, '') IS NOT NULL
                  AND regexp_replace(COALESCE(father_mobile, ''), '\\D', '', 'g') =
                      regexp_replace($2::text, '\\D', '', 'g')
                )
                OR (
                  NULLIF($3::text, '') IS NOT NULL
                  AND regexp_replace(COALESCE(mother_mobile, ''), '\\D', '', 'g') =
                      regexp_replace($3::text, '\\D', '', 'g')
                )
            `,
            [
              parentId,
              admission?.father_mobile || "",
              admission?.mother_mobile || "",
            ]
          );

          if (Number(parentUsageResult.rows[0]?.count || 0) === 0) {
            await client.query(`DELETE FROM public.parents WHERE id = $1`, [
              parentId,
            ]);
            deletedParentIds.push(parentId);
          }
        }

        await client.query("COMMIT");

        return res.status(200).json({
          success: true,
          deleted: {
            admissionId: student.admission_id,
            studentIds: studentsResult.rows.map((row) => row.id),
            parentIds: deletedParentIds,
          },
        });
      } catch (deleteError) {
        await client.query("ROLLBACK");
        throw deleteError;
      } finally {
        client.release();
      }
    }

    await pool.query(`DELETE FROM public.students WHERE id = $1`, [studentId]);

    return res.status(200).json({
      success: true,
      deleted: {
        studentIds: [studentId],
      },
    });
  } catch (err) {
    console.error("Student delete API error:", err?.message || err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
