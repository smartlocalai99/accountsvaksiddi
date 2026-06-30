import { getWhatsAppConfig, saveWhatsAppConfig } from "@/lib/whatsapp";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const config = await getWhatsAppConfig();
      const { workerUrl, workerApiKey, railwayApiToken, railwayServiceId, railwayEnvironmentId } = config;
      
      const connectUrl = process.env.WHATSAPP_CONNECT_URL || (workerUrl ? `${workerUrl}/qr` : "");

      if (!workerUrl || !workerApiKey) {
        return res.status(200).json({
          success: true,
          data: {
            configured: false,
            workerUrl: "",
            connectUrl: "",
            workerApiKey: "",
            railwayApiToken: "",
            railwayServiceId: "",
            railwayEnvironmentId: "",
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          configured: true,
          workerUrl,
          connectUrl,
          workerApiKey,
          railwayApiToken,
          railwayServiceId,
          railwayEnvironmentId,
        },
      });
    } catch (error) {
      console.error("WhatsApp Config GET Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to load WhatsApp configuration",
      });
    }
  }

  if (req.method === "POST") {
    try {
      const { workerUrl, workerApiKey, railwayApiToken, railwayServiceId, railwayEnvironmentId } = req.body || {};
      
      await saveWhatsAppConfig({
        workerUrl,
        workerApiKey,
        railwayApiToken,
        railwayServiceId,
        railwayEnvironmentId,
      });

      return res.status(200).json({
        success: true,
        message: "WhatsApp configuration saved successfully",
      });
    } catch (error) {
      console.error("WhatsApp Config POST Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to save WhatsApp configuration",
      });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({
    success: false,
    error: "Method not allowed",
  });
}
