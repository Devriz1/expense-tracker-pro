import type { UpiPaymentData } from '../utils/upiParser';

export interface PendingPayment {
  id: string;
  payeeVpa: string;
  merchantName: string;
  amount: number;
  note: string;
  category: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: number;
  upiDeepLink: string;
}

const STORAGE_KEY = 'expense-tracker-pending-payments';

export function getPendingPayments(): PendingPayment[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function savePendingPayment(payment: PendingPayment): void {
  const payments = getPendingPayments();
  payments.push(payment);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payments));
}

export function updatePaymentStatus(id: string, status: 'completed' | 'failed'): void {
  const payments = getPendingPayments();
  const updated = payments.map((p) => (p.id === id ? { ...p, status } : p));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function deletePendingPayment(id: string): void {
  const payments = getPendingPayments().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payments));
}

export function buildUpiDeepLink(data: UpiPaymentData, amount: number): string {
  const params = new URLSearchParams({
    pa: data.payeeVpa,
    pn: data.merchantName || data.payeeVpa,
    am: amount.toString(),
    cu: 'INR',
  });

  if (data.note) {
    params.set('tn', data.note);
  }

  return `upi://pay?${params.toString()}`;
}

export function triggerUpiPayment(deepLink: string): void {
  window.location.href = deepLink;
}
