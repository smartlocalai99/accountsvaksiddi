import { query } from "./db";

/**
 * Ensures the whatsapp_config table exists in the database.
 */
export async function ensureWhatsAppConfigTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS public.whatsapp_config (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      worker_url TEXT,
      worker_api_key TEXT,
      railway_api_token TEXT,
      railway_service_id TEXT,
      railway_environment_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `, []);
}

/**
 * Fetches the WhatsApp config from database, falling back to process.env variables.
 */
export async function getWhatsAppConfig() {
  try {
    await ensureWhatsAppConfigTable();

    const result = await query(
      `SELECT * FROM public.whatsapp_config ORDER BY id ASC LIMIT 1`,
      []
    );
    const dbConfig = result.rows[0] || {};

    return {
      workerUrl: dbConfig.worker_url || process.env.WHATSAPP_WORKER_URL || "",
      workerApiKey: dbConfig.worker_api_key || process.env.WHATSAPP_WORKER_API_KEY || "",
      railwayApiToken: dbConfig.railway_api_token || process.env.RAILWAY_API_TOKEN || "",
      railwayServiceId: dbConfig.railway_service_id || process.env.RAILWAY_SERVICE_ID || "",
      railwayEnvironmentId: dbConfig.railway_environment_id || process.env.RAILWAY_ENVIRONMENT_ID || "",
    };
  } catch (error) {
    console.error("Failed to fetch WhatsApp config from database:", error);
    // Safe fallback to environment variables in case of DB failure
    return {
      workerUrl: process.env.WHATSAPP_WORKER_URL || "",
      workerApiKey: process.env.WHATSAPP_WORKER_API_KEY || "",
      railwayApiToken: process.env.RAILWAY_API_TOKEN || "",
      railwayServiceId: process.env.RAILWAY_SERVICE_ID || "",
      railwayEnvironmentId: process.env.RAILWAY_ENVIRONMENT_ID || "",
    };
  }
}

/**
 * Saves or updates the WhatsApp config in the database.
 */
export async function saveWhatsAppConfig(config) {
  await ensureWhatsAppConfigTable();

  const currentResult = await query(
    `SELECT id FROM public.whatsapp_config ORDER BY id ASC LIMIT 1`,
    []
  );
  const currentId = currentResult.rows[0]?.id || null;

  const workerUrl = (config.workerUrl || "").trim();
  const workerApiKey = (config.workerApiKey || "").trim();
  const railwayApiToken = (config.railwayApiToken || "").trim();
  const railwayServiceId = (config.railwayServiceId || "").trim();
  const railwayEnvironmentId = (config.railwayEnvironmentId || "").trim();

  if (currentId) {
    await query(
      `
        UPDATE public.whatsapp_config
        SET
          worker_url = $1,
          worker_api_key = $2,
          railway_api_token = $3,
          railway_service_id = $4,
          railway_environment_id = $5,
          updated_at = NOW()
        WHERE id = $6
      `,
      [
        workerUrl,
        workerApiKey,
        railwayApiToken,
        railwayServiceId,
        railwayEnvironmentId,
        currentId,
      ]
    );
  } else {
    await query(
      `
        INSERT INTO public.whatsapp_config (
          worker_url,
          worker_api_key,
          railway_api_token,
          railway_service_id,
          railway_environment_id
        ) VALUES ($1, $2, $3, $4, $5)
      `,
      [
        workerUrl,
        workerApiKey,
        railwayApiToken,
        railwayServiceId,
        railwayEnvironmentId,
      ]
    );
  }
}
