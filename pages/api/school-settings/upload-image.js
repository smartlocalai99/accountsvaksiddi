import { mkdir, writeFile } from "fs/promises";
import path from "path";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

const ALLOWED_MIME_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

function parseDataUrl(value) {
  const match = String(value || "").match(/^data:([^;]+);base64,(.+)$/);

  if (!match) {
    return null;
  }

  const mimeType = match[1];
  const extension = ALLOWED_MIME_TYPES.get(mimeType);

  if (!extension) {
    return null;
  }

  return {
    extension,
    buffer: Buffer.from(match[2], "base64"),
  };
}

function cleanFieldName(value) {
  return String(value || "school")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const parsed = parseDataUrl(req.body?.image);

    if (!parsed) {
      return res.status(400).json({
        success: false,
        error: "Please upload a valid image file.",
      });
    }

    const fieldName = cleanFieldName(req.body?.fieldName);
    const uploadDir = path.join(process.cwd(), "public", "uploads", "school-settings");
    const fileName = `${fieldName}-${Date.now()}.${parsed.extension}`;
    const filePath = path.join(uploadDir, fileName);

    await mkdir(uploadDir, { recursive: true });
    await writeFile(filePath, parsed.buffer);

    return res.status(200).json({
      success: true,
      url: `/uploads/school-settings/${fileName}`,
    });
  } catch (error) {
    console.error("School settings upload error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to upload image",
    });
  }
}
