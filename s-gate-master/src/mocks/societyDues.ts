export type DueStatus = 'PAID' | 'PENDING' | 'OVERDUE';

export interface DueLineItem {
  label: string;
  amount: number;
  isRed?: boolean;
}

export interface PaymentRecord {
  date: string;
  method: string;
  amount: number;
  txnId: string;
}

export interface DueItem {
  id: string;
  month: string;
  year: number;
  status: DueStatus;
  dueDate: string;
  totalAmount: number;
  lineItems: DueLineItem[];
  paidOn?: string;
  paidVia?: string;
  paymentHistory?: PaymentRecord[];
  flat: string;
  society: string;
}

export const DUES: DueItem[] = [
  {
    id: 'due_1',
    month: 'March',
    year: 2026,
    status: 'PENDING',
    dueDate: '2026-03-31',
    totalAmount: 4700,
    flat: 'B-204',
    society: 'Greenwood Heights Society',
    lineItems: [
      { label: 'Maintenance Fee', amount: 4000 },
      { label: 'Water Charges', amount: 200 },
      { label: 'Parking', amount: 500 },
    ],
    paymentHistory: [],
  },
  {
    id: 'due_2',
    month: 'February',
    year: 2026,
    status: 'PAID',
    dueDate: '2026-02-28',
    totalAmount: 4500,
    paidOn: '2026-02-18',
    paidVia: 'UPI',
    flat: 'B-204',
    society: 'Greenwood Heights Society',
    lineItems: [
      { label: 'Maintenance Fee', amount: 3800 },
      { label: 'Water Charges', amount: 200 },
      { label: 'Parking', amount: 500 },
    ],
    paymentHistory: [
      { date: '2026-02-18', method: 'UPI', amount: 4500, txnId: 'TXN20260218001' },
    ],
  },
  {
    id: 'due_3',
    month: 'January',
    year: 2026,
    status: 'PAID',
    dueDate: '2026-01-31',
    totalAmount: 4500,
    paidOn: '2026-01-22',
    paidVia: 'Net Banking',
    flat: 'B-204',
    society: 'Greenwood Heights Society',
    lineItems: [
      { label: 'Maintenance Fee', amount: 3800 },
      { label: 'Water Charges', amount: 200 },
      { label: 'Parking', amount: 500 },
    ],
    paymentHistory: [
      { date: '2026-01-22', method: 'Net Banking', amount: 4500, txnId: 'TXN20260122002' },
    ],
  },
  {
    id: 'due_4',
    month: 'December',
    year: 2025,
    status: 'OVERDUE',
    dueDate: '2025-12-31',
    totalAmount: 5200,
    flat: 'B-204',
    society: 'Greenwood Heights Society',
    lineItems: [
      { label: 'Maintenance Fee', amount: 3800 },
      { label: 'Water Charges', amount: 200 },
      { label: 'Parking', amount: 500 },
      { label: 'Late Payment Penalty', amount: 700, isRed: true },
    ],
    paymentHistory: [],
  },
  {
    id: 'due_5',
    month: 'November',
    year: 2025,
    status: 'PAID',
    dueDate: '2025-11-30',
    totalAmount: 4500,
    paidOn: '2025-11-20',
    paidVia: 'UPI',
    flat: 'B-204',
    society: 'Greenwood Heights Society',
    lineItems: [
      { label: 'Maintenance Fee', amount: 3800 },
      { label: 'Water Charges', amount: 200 },
      { label: 'Parking', amount: 500 },
    ],
    paymentHistory: [
      { date: '2025-11-20', method: 'UPI', amount: 4500, txnId: 'TXN20251120003' },
    ],
  },
  {
    id: 'due_6',
    month: 'October',
    year: 2025,
    status: 'PAID',
    dueDate: '2025-10-31',
    totalAmount: 4500,
    paidOn: '2025-10-15',
    paidVia: 'UPI',
    flat: 'B-204',
    society: 'Greenwood Heights Society',
    lineItems: [
      { label: 'Maintenance Fee', amount: 3800 },
      { label: 'Water Charges', amount: 200 },
      { label: 'Parking', amount: 500 },
    ],
    paymentHistory: [
      { date: '2025-10-15', method: 'UPI', amount: 4500, txnId: 'TXN20251015004' },
    ],
  },
];

export const DUES_SUMMARY = {
  totalOutstanding: 9900, // March PENDING + December OVERDUE
  currentMonth: 4700,
  overdue: 5200,
};
