import { createWorker } from 'tesseract.js';

export interface ReceiptData {
  amount?: number;
  vendor?: string;
}

export async function extractReceiptData(imageFile: File): Promise<ReceiptData> {
  const worker = await createWorker('eng', 1, {
    logger: () => {},
  });

  try {
    const result = await worker.recognize(imageFile);
    const text = result.data.text;
    await worker.terminate();

    const amount = extractAmount(text);
    const vendor = extractVendor(text);

    return {
      amount,
      vendor,
    };
  } catch (err) {
    try {
      await worker.terminate();
    } catch {
      // ignore terminate errors
    }
    throw err;
  }
}

export function extractAmount(text: string): number | undefined {
  const cleanText = text.replace(/,/g, '');
  const patterns = [
    /(?:total|grand\s*total|net\s*total|balance\s*due|amount\s*due|total\s*due)\s*[:\-]?\s*(?:₹\s*)?(\d+(?:\.\d{1,2})?)/i,
    /(?:₹\s*|rs\.?|inr)\s*(\d+(?:\.\d{1,2})?)/,
    /(\d+(?:\.\d{2}))/,
  ];

  let bestMatch: number | undefined;
  for (const pattern of patterns) {
    const matches = cleanText.match(new RegExp(pattern.source, pattern.flags));
    if (matches && matches[1]) {
      const value = parseFloat(matches[1]);
      if (value > 0) {
        bestMatch = value;
        break;
      }
    }
  }

  return bestMatch;
}

export function extractVendor(text: string): string | undefined {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 2);

  const skipPatterns = [
    /^\d+$/,
    /^[\/\-\*\.]+$/,
    /^(tel|phone|fax|email|www|http|address|gst|tax|invoice|receipt|cashier|order|table|bill|welcome|customer|copy|thank|visit|www)/i,
  ];

  for (const line of lines.slice(0, 10)) {
    const shouldSkip = skipPatterns.some((pattern) => pattern.test(line));
    if (!shouldSkip && line.length > 2) {
      return line.replace(/[^\w\s&.\-]/g, '').trim();
    }
  }

  return undefined;
}