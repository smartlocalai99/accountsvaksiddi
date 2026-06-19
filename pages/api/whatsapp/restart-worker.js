import { getWhatsAppConfig } from "@/lib/whatsapp";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const config = await getWhatsAppConfig();
  const { workerUrl, workerApiKey, railwayApiToken, railwayServiceId, railwayEnvironmentId } = config;

  if (!workerUrl || !workerApiKey) {
    return res.status(400).json({
      success: false,
      error: "WhatsApp worker URL and API Key are not configured in settings.",
    });
  }

  // 1. Try direct API logout on the worker (works instantly without Railway reboot)
  try {
    const logoutRes = await fetch(`${workerUrl}/api/instance/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": workerApiKey,
      },
      signal: AbortSignal.timeout(8000), // 8 seconds timeout
    });

    if (logoutRes.ok) {
      const data = await logoutRes.json();
      if (data.ok) {
        return res.status(200).json({
          success: true,
          message: "WhatsApp session disconnected successfully! Please wait a few seconds and click Open QR Code to link your new number.",
        });
      }
    }
  } catch (logoutErr) {
    console.warn("Direct worker logout failed, falling back to Railway restart:", logoutErr.message);
  }

  // 2. Fallback: Try Railway service restart if credentials are provided
  if (railwayApiToken && railwayServiceId && railwayEnvironmentId) {
    try {
      const mutation = `
        mutation serviceInstanceRedeploy($serviceId: String!, $environmentId: String!) {
          serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId)
        }
      `;

      const response = await fetch("https://backboard.railway.app/graphql/v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${railwayApiToken}`,
        },
        body: JSON.stringify({
          query: mutation,
          variables: { serviceId: railwayServiceId, environmentId: railwayEnvironmentId },
        }),
      });

      const data = await response.json();

      if (data.errors && data.errors.length > 0) {
        return res.status(500).json({
          success: false,
          error: data.errors[0].message || "Railway API error",
        });
      }

      return res.status(200).json({
        success: true,
        message: "WhatsApp worker restarting on Railway. Wait ~15 seconds, then scan the new QR code.",
      });
    } catch (err) {
      console.error("Railway restart error:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Failed to restart Railway service",
      });
    }
  }

  return res.status(500).json({
    success: false,
    error: "Failed to disconnect session. Make sure the worker is running, or verify your Railway credentials.",
  });
}
