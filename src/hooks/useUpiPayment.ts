import { useState, useEffect, useCallback } from 'react';
import type { PendingPayment } from '../services/paymentService';

function getPendingPayments(): PendingPayment[] {
  try {
    const data = localStorage.getItem('expense-tracker-pending-payments');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function savePendingPayment(payment: PendingPayment): void {
  const payments = getPendingPayments();
  payments.push(payment);
  localStorage.setItem('expense-tracker-pending-payments', JSON.stringify(payments));
}

function updatePaymentStatus(id: string, status: 'completed' | 'failed'): void {
  const payments = getPendingPayments();
  const updated = payments.map((p) => (p.id === id ? { ...p, status } : p));
  localStorage.setItem('expense-tracker-pending-payments', JSON.stringify(updated));
}

export function useUpiPayment() {
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [verificationPrompt, setVerificationPrompt] = useState<{
    payment: PendingPayment;
    isReturning: boolean;
  } | null>(null);

  const loadPendingPayments = useCallback(() => {
    setPendingPayments(getPendingPayments());
  }, []);

  useEffect(() => {
    loadPendingPayments();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadPendingPayments();
        const pending = getPendingPayments();
        const latestPending = pending.find((p) => p.status === 'pending');
        if (latestPending) {
          setVerificationPrompt({
            payment: latestPending,
            isReturning: true,
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadPendingPayments]);

  const createPendingPayment = (
    payeeVpa: string,
    merchantName: string,
    amount: number,
    category: string,
    note: string,
    upiDeepLink: string
  ): PendingPayment => {
    const payment: PendingPayment = {
      id: crypto.randomUUID(),
      payeeVpa,
      merchantName,
      amount,
      note,
      category,
      status: 'pending',
      createdAt: Date.now(),
      upiDeepLink,
    };
    savePendingPayment(payment);
    loadPendingPayments();
    return payment;
  };

  const markPaymentCompleted = (id: string): void => {
    updatePaymentStatus(id, 'completed');
    loadPendingPayments();
    setVerificationPrompt(null);
  };

  const markPaymentFailed = (id: string): void => {
    updatePaymentStatus(id, 'failed');
    loadPendingPayments();
    setVerificationPrompt(null);
  };

  const dismissVerification = (): void => {
    setVerificationPrompt(null);
  };

  return {
    pendingPayments,
    verificationPrompt,
    createPendingPayment,
    markPaymentCompleted,
    markPaymentFailed,
    dismissVerification,
    loadPendingPayments,
  };
}
