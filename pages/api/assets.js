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
  try {
    if (req.method === "GET") {
      const result = await pool.query(`
        SELECT *
        FROM public.assets
        ORDER BY id DESC
      `);

      return res.status(200).json({
        success: true,
        assets: result.rows,
      });
    }

    if (req.method === "POST") {
      const {
        asset_code,
        asset_name,
        asset_category,
        quantity,
        purchase_date,
        purchase_cost,
        vendor_name,
        invoice_number,
        invoice_file_url,
        brand,
        model_number,
        serial_number,
        assigned_to,
        assigned_location,
        warranty_expiry_date,
        description,
      } = req.body;

      if (!asset_code || !asset_name || !asset_category) {
        return res.status(400).json({
          success: false,
          error: "Asset code, asset name and category are required",
        });
      }

      const result = await pool.query(
        `
        INSERT INTO public.assets (
          asset_code, asset_name, asset_category, quantity,
          purchase_date, purchase_cost, vendor_name, invoice_number,
          invoice_file_url, brand, model_number, serial_number,
          assigned_to, assigned_location, warranty_expiry_date, description
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,
          $9,$10,$11,$12,$13,$14,$15,$16
        )
        RETURNING *
        `,
        [
          asset_code,
          asset_name,
          asset_category,
          Number(quantity || 1),
          purchase_date || null,
          Number(purchase_cost || 0),
          vendor_name || null,
          invoice_number || null,
          invoice_file_url || null,
          brand || null,
          model_number || null,
          serial_number || null,
          assigned_to || null,
          assigned_location || null,
          warranty_expiry_date || null,
          description || null,
        ]
      );

      return res.status(201).json({
        success: true,
        asset: result.rows[0],
      });
    }

    if (req.method === "PUT") {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: "Asset id is required",
        });
      }

      const {
        asset_code,
        asset_name,
        asset_category,
        quantity,
        purchase_date,
        purchase_cost,
        vendor_name,
        invoice_number,
        invoice_file_url,
        brand,
        model_number,
        serial_number,
        assigned_to,
        assigned_location,
        warranty_expiry_date,
        description,
      } = req.body;

      const result = await pool.query(
        `
        UPDATE public.assets
        SET
          asset_code = $1,
          asset_name = $2,
          asset_category = $3,
          quantity = $4,
          purchase_date = $5,
          purchase_cost = $6,
          vendor_name = $7,
          invoice_number = $8,
          invoice_file_url = $9,
          brand = $10,
          model_number = $11,
          serial_number = $12,
          assigned_to = $13,
          assigned_location = $14,
          warranty_expiry_date = $15,
          description = $16,
          updated_at = NOW()
        WHERE id = $17
        RETURNING *
        `,
        [
          asset_code,
          asset_name,
          asset_category,
          Number(quantity || 1),
          purchase_date || null,
          Number(purchase_cost || 0),
          vendor_name || null,
          invoice_number || null,
          invoice_file_url || null,
          brand || null,
          model_number || null,
          serial_number || null,
          assigned_to || null,
          assigned_location || null,
          warranty_expiry_date || null,
          description || null,
          Number(id),
        ]
      );

      return res.status(200).json({
        success: true,
        asset: result.rows[0],
      });
    }

    if (req.method === "DELETE") {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: "Asset id is required",
        });
      }

      await pool.query(`DELETE FROM public.assets WHERE id = $1`, [Number(id)]);

      return res.status(200).json({
        success: true,
        message: "Asset deleted successfully",
      });
    }

    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  } catch (err) {
    console.error("Assets API Error:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}