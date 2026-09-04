import { useEffect, useRef, useCallback, useState } from 'react';
import { Bell } from 'lucide-react';

interface DailyReminderOptions {
  enabled: boolean;
  reminderTimes: string[];
}

function hasTransactionsForDate(transactions: any[], date: Date): boolean {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  return transactions.some((t) => {
    const txDate = new Date(t.date);
    return txDate >= start && txDate <= end;
  });
}

function getReminderKey(time: string, date: Date): string {
  return `reminder-${time}-${date.toISOString().split('T')[0]}`;
}

function shouldSendReminder(time: string, date: Date): boolean {
  const key = getReminderKey(time, date);
  const lastSent = localStorage.getItem(key);
  if (!lastSent) return true;
  const lastDate = new Date(lastSent);
  return lastDate.toDateString() !== date.toDateString();
}

function markReminderSent(time: string, date: Date): void {
  const key = getReminderKey(time, date);
  localStorage.setItem(key, date.toISOString());
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function getNextReminderTime(reminderTimes: string[]): Date | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (const time of reminderTimes) {
    const [hours, minutes] = time.split(':').map(Number);
    const reminderDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes, 0, 0);
    if (reminderDate > now) {
      return reminderDate;
    }
  }

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [firstHours, firstMinutes] = reminderTimes[0].split(':').map(Number);
  return new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), firstHours, firstMinutes, 0, 0);
}

export interface TransactionReminder {
  message: string;
  time: string;
  onDismiss: () => void;
  onAddTransaction: () => void;
}

export function useDailyReminder(transactions: any[], options: DailyReminderOptions) {
  const { enabled, reminderTimes } = options;
  const [showReminder, setShowReminder] = useState<TransactionReminder | null>(null);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissReminder = useCallback(() => {
    setShowReminder(null);
  }, []);

  const sendBrowserNotification = useCallback((time: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        new Notification('Expense Tracker Reminder', {
          body: 'Did you forget to enter today\'s income and expenses?',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: `reminder-${time}`,
          requireInteraction: false,
        });
      } catch {
        // ignore notification errors
      }
    }
  }, []);

  const checkAndNotify = useCallback(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;

    const today = new Date();
    if (hasTransactionsForDate(transactions, today)) return;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const time of reminderTimes) {
      const reminderMinutes = parseTimeToMinutes(time);
      if (currentMinutes >= reminderMinutes && shouldSendReminder(time, today)) {
        markReminderSent(time, today);
        sendBrowserNotification(time);

        setShowReminder({
          message: 'Did you forget to enter today\'s income and expenses?',
          time,
          onDismiss: dismissReminder,
          onAddTransaction: dismissReminder,
        });
        break;
      }
    }
  }, [enabled, transactions, reminderTimes, dismissReminder, sendBrowserNotification]);

  useEffect(() => {
    if (!enabled) return;

    const requestPermission = async () => {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        try {
          await Notification.requestPermission();
        } catch {
          // ignore permission errors
        }
      }
    };

    requestPermission();

    const scheduleNextReminder = () => {
      const nextTime = getNextReminderTime(reminderTimes);
      if (!nextTime) return;

      const now = new Date();
      const delay = nextTime.getTime() - now.getTime();

      const timeoutId = setTimeout(() => {
        checkAndNotify();
        scheduleNextReminder();
      }, delay);

      const key = nextTime.toISOString();
      timersRef.current.set(key, timeoutId);
    };

    checkAndNotify();
    scheduleNextReminder();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAndNotify();
      }
    };

    const handleFocus = () => {
      checkAndNotify();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, [enabled, reminderTimes, checkAndNotify]);

  return {
    showReminder,
    dismissReminder,
  };
}

export function TransactionReminderBanner({ reminder }: { reminder: TransactionReminder }) {
  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-100 rounded-xl flex-shrink-0">
          <Bell className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">Daily Reminder</h3>
          <p className="text-sm text-gray-600 mt-1">{reminder.message}</p>
          <p className="text-xs text-gray-400 mt-1">Scheduled at {reminder.time}</p>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={reminder.onAddTransaction}
          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Add Transaction
        </button>
        <button
          onClick={reminder.onDismiss}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          Later
        </button>
      </div>
    </div>
  );
}
