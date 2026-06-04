import fs from "fs";
import formidable from "formidable";
import pdfParse from "pdf-parse";
import Tesseract from "tesseract.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseForm(req) {
  const form = formidable({
    multiples: false,
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (error, fields, files) => {
      if (error) {
        reject(error);
        return;
      }

      resolve({ fields, files });
    });
  });
}

function cleanText(value = "") {
  return String(value)
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeAmount(value = "") {
  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/[^\d.]/g, "");

  const amount = Number(cleaned);

  if (!Number.isFinite(amount) || amount <= 0) {
    return "";
  }

  return String(Math.round(amount));
}

function extractAmount(text) {
  // First, try to find obvious labelled amounts (grand total, net amount etc.)
  const patterns = [
    /grand\s*total[^0-9₹rs]*(?:₹|rs\.?|inr)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i,
    /net\s*amount[^0-9₹rs]*(?:₹|rs\.?|inr)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i,
    /total\s*amount[^0-9₹rs]*(?:₹|rs\.?|inr)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i,
    /amount\s*paid[^0-9₹rs]*(?:₹|rs\.?|inr)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i,
    /total[^0-9₹rs]*(?:₹|rs\.?|inr)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return normalizeAmount(match[1]);
    }
  }

  // Otherwise, collect all numeric candidates and prefer numbers on lines
  // that contain keywords like total, amount, grand, net.
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const candidateNumbers = [];

  for (const line of lines) {
    const nums = Array.from(
      line.matchAll(/(?:₹|rs\.?|inr)?\s*([0-9][0-9,]{0,}(?:\.\d{1,2})?)/gi)
    ).map((m) => Number(String(m[1]).replace(/,/g, ""))).filter((v) => Number.isFinite(v));

    if (nums.length === 0) continue;

    const hasKeyword = /\b(total|grand|net|amount|balance|payable|due)\b/i.test(line);

    for (const n of nums) {
      if (n > 0 && n < 10000000) {
        candidateNumbers.push({ value: n, weight: hasKeyword ? 2 : 1 });
      }
    }
  }

  if (candidateNumbers.length === 0) return "";

  // Choose the highest weighted candidate (prefer labelled amounts), tie-breaker on value
  candidateNumbers.sort((a, b) => b.weight - a.weight || b.value - a.value);
  return normalizeAmount(String(candidateNumbers[0].value));
}

function toIsoDate(day, month, year) {
  let yyyy = Number(year);

  if (yyyy < 100) {
    yyyy += yyyy > 50 ? 1900 : 2000;
  }

  const mm = String(Number(month)).padStart(2, "0");
  const dd = String(Number(day)).padStart(2, "0");

  if (!yyyy || Number(mm) < 1 || Number(mm) > 12 || Number(dd) < 1 || Number(dd) > 31) {
    return "";
  }

  return `${yyyy}-${mm}-${dd}`;
}

function extractDate(text) {
  // Common numeric date patterns
  const datePatterns = [
    /(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/, // dd/mm/yyyy or dd-mm-yyyy
    /(\d{4})[/-](\d{1,2})[/-](\d{1,2})/, // yyyy-mm-dd
    /(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*[,\s]*(\d{2,4})/i, // 4 Jun 2026
  ];

  // Try numeric first
  const first = text.match(datePatterns[0]);
  if (first) {
    return toIsoDate(first[1], first[2], first[3]);
  }

  const second = text.match(datePatterns[1]);
  if (second) {
    return toIsoDate(second[3], second[2], second[1]);
  }

  // Month-name formats
  const third = text.match(datePatterns[2]);
  if (third) {
    const day = third[1];
    const monText = third[2];
    const year = third[3];
    const monthMap = {
      jan: 1,
      feb: 2,
      mar: 3,
      apr: 4,
      may: 5,
      jun: 6,
      jul: 7,
      aug: 8,
      sep: 9,
      sept: 9,
      oct: 10,
      nov: 11,
      dec: 12,
    };

    const m = monthMap[String(monText).slice(0, 3).toLowerCase()];
    if (m) return toIsoDate(day, String(m), year);
  }

  return "";
}

function guessCategory(text) {
  const lower = text.toLowerCase();

  const rules = [
    {
      category: "Transport",
      keywords: ["fuel", "diesel", "petrol", "transport", "bus", "auto", "vehicle"],
    },
    {
      category: "Stationery",
      keywords: ["stationery", "book", "books", "pen", "paper", "notebook", "xerox"],
    },
    {
      category: "Maintenance",
      keywords: ["repair", "maintenance", "paint", "plumbing", "electrician", "hardware"],
    },
    {
      category: "Electricity",
      keywords: ["electricity", "power", "current bill", "apsPDCL", "energy"],
    },
    {
      category: "Food",
      keywords: ["food", "canteen", "water", "tea", "snacks", "lunch"],
    },
    {
      category: "Internet",
      keywords: ["internet", "wifi", "broadband", "airtel", "jio"],
    },
    {
      category: "Printing",
      keywords: ["printing", "print", "banner", "poster", "flex"],
    },
    {
      category: "Salary",
      keywords: ["salary", "wages", "staff payment"],
    },
  ];

  const matched = rules.find((rule) =>
    rule.keywords.some((keyword) => lower.includes(keyword))
  );

  return matched?.category || "General";
}

function guessTitle(text, fileName = "") {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.length >= 3);

  const skipWords = [
    "invoice",
    "tax invoice",
    "bill",
    "cash memo",
    "receipt",
    "gst",
    "total",
    "amount",
    "date",
    "phone",
    "mobile",
  ];

  // Prefer a reasonably long line that is not mostly numeric or noise, from the first 6 lines
  const candidate = lines
    .slice(0, 6)
    .map((line) => ({ line, score: line.replace(/[^a-zA-Z ]/g, "").length }))
    .filter(({ line }) => {
      const lower = line.toLowerCase();
      if (skipWords.some((word) => lower === word || lower.startsWith(`${word}:`))) return false;
      // filter out lines that are mostly numbers or symbols
      const alphaCount = (line.match(/[a-zA-Z]/g) || []).length;
      const nonAlpha = line.length - alphaCount;
      if (alphaCount < 3 || nonAlpha > line.length * 0.6) return false;
      return true;
    })
    .sort((a, b) => b.score - a.score)[0];

  if (candidate) return candidate.line.slice(0, 80);

  return fileName ? fileName.replace(/\.[^.]+$/, "").slice(0, 80) : "Expense bill";
}

function buildNotes(text) {
  const preview = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6)
    .join(" | ");

  return preview
    ? `Auto-filled from uploaded bill. OCR preview: ${preview}`
    : "Auto-filled from uploaded bill. Please verify before saving.";
}

function extractFieldsFromText(text, fileName = "") {
  const cleaned = cleanText(text);

  return {
    date: extractDate(cleaned),
    amount: extractAmount(cleaned),
    title: guessTitle(cleaned, fileName),
    category: guessCategory(cleaned),
    notes: buildNotes(cleaned),
    rawTextPreview: cleaned.slice(0, 1200),
  };
}

async function extractTextFromPdf(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text || "";
}

async function extractTextFromImage(filePath) {
  const result = await Tesseract.recognize(filePath, "eng");
  return result?.data?.text || "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    const { files } = await parseForm(req);
    const uploaded = Array.isArray(files.receipt)
      ? files.receipt[0]
      : files.receipt;

    if (!uploaded) {
      return res.status(400).json({
        success: false,
        error: "No receipt file uploaded",
      });
    }

    const filePath = uploaded.filepath;
    const originalName = uploaded.originalFilename || "receipt";
    const mimeType = uploaded.mimetype || "";

    let extractedText = "";

    if (mimeType.includes("pdf") || originalName.toLowerCase().endsWith(".pdf")) {
      extractedText = await extractTextFromPdf(filePath);

      if (!cleanText(extractedText)) {
        return res.status(422).json({
          success: false,
          error:
            "This PDF looks scanned or image-based. Upload a clear image or use OCR-supported backend later.",
        });
      }
    } else if (mimeType.startsWith("image/")) {
      extractedText = await extractTextFromImage(filePath);
    } else {
      return res.status(400).json({
        success: false,
        error: "Unsupported file type. Upload image or PDF bill.",
      });
    }

    const extracted = extractFieldsFromText(extractedText, originalName);

    return res.status(200).json({
      success: true,
      extracted,
    });
  } catch (error) {
    console.error("Receipt scan API error:", error);

    return res.status(500).json({
      success: false,
      error: "Unable to scan receipt. Please enter details manually.",
    });
  }
}