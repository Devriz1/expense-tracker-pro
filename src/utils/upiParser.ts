export interface UpiPaymentData {
  payeeVpa: string;
  merchantName: string;
  amount?: number;
  note?: string;
}

export function parseUpiUri(uri: string): UpiPaymentData | null {
  if (!uri || !uri.startsWith('upi://pay')) {
    return null;
  }

  try {
    const queryString = uri.replace('upi://pay', '');
    const params = new URLSearchParams(queryString);

    const payeeVpa = params.get('pa') || '';
    const merchantName = decodeURIComponent(params.get('pn') || '');
    const amountStr = params.get('am');
    const note = decodeURIComponent(params.get('tn') || '');

    if (!payeeVpa) {
      return null;
    }

    return {
      payeeVpa,
      merchantName: merchantName || payeeVpa,
      amount: amountStr ? parseFloat(amountStr) : undefined,
      note: note || undefined,
    };
  } catch {
    return null;
  }
}
