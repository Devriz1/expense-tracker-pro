import { createWorker } from 'tesseract.js';

export interface ReceiptData {
  amount?: number;
  date?: string;
  vendor?: string;
  rawText: string;
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
    const date = extractDate(text);
    const vendor = extractVendor(text);

    return {
      amount,
      date,
      vendor,
      rawText: text,
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
    /(?:total|amount|grand\s*total|balance|sum|₹\s*|rs\.?|inr)\s*[:\-]?\s*(?:₹\s*)?(\d+(?:\.\d{1,2})?)/i,
    /₹\s*(\d+(?:\.\d{1,2})?)/,
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

export function extractDate(text: string): string | undefined {
  const patterns = [
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/,
    /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/,
    /(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]*\d{2,4})/i,
    /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]*\d{1,2}(?:st|nd|rd|th)?[\s,]*\d{2,4})/i,
  ];

  for (const pattern of patterns) {
    const matches = text.match(new RegExp(pattern.source, pattern.flags));
    if (matches && matches[1]) {
      return matches[1];
    }
  }

  return undefined;
}

export function extractVendor(text: string): string | undefined {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 2);

  const skipPatterns = [
    /^\d+$/,
    /^[\/\-\*\.]+$/,
    /^(tel|phone|fax|email|www|http|address|gst|tax|invoice|receipt|cashier|order|table|bill)/i,
  ];

  for (const line of lines.slice(0, 10)) {
    const shouldSkip = skipPatterns.some((pattern) => pattern.test(line));
    if (!shouldSkip && line.length > 2) {
      return line.replace(/[^\w\s&.\-]/g, '').trim();
    }
  }

  return undefined;
}
