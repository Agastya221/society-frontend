import api from './api';

/**
 * Paying dues by UPI. Residents pay the society's UPI ID directly (no gateway), so the app cannot
 * know whether the payment worked: the resident reports the UPI reference number (UTR) and an
 * admin confirms it against the society's bank statement.
 */

export type SubmissionStatus = 'SUBMITTED' | 'CONFIRMED' | 'REJECTED';

export interface PaymentSubmission {
    id: string;
    status: SubmissionStatus;
    utr: string;
    amount: number;
    rejectionReason: string | null;
    submittedAt: string;
    reviewedAt: string | null;
}

/** A submission as the admin sees it, with the flat and resident it belongs to. */
export interface AdminPaymentSubmission extends PaymentSubmission {
    invoiceId: string;
    month: string;
    invoiceStatus: string;
    flatNumber: string;
    blockName: string | null;
    residentName: string;
    residentPhone: string | null;
}

export interface UpiPayee {
    upiId: string;
    payeeName: string;
}

/** Same rule as the server: name@bank */
export const UPI_ID_PATTERN = /^[a-zA-Z0-9.\-_]{2,64}@[a-zA-Z0-9]{2,32}$/;

/** The reference number as the server wants it: no spaces, upper case, 8 to 22 letters or digits. */
export const cleanUtr = (value: string) => value.replace(/\s+/g, '').toUpperCase();
export const isValidUtr = (value: string) => /^[A-Z0-9]{8,22}$/.test(cleanUtr(value));

/**
 * The link that opens the resident's UPI app with the payee and the amount already filled in.
 * Android shows its own list of installed UPI apps (GPay, PhonePe, Paytm, bank apps) for it.
 */
export const buildUpiLink = (payee: UpiPayee, amount: number, note: string): string => {
    const params = [
        `pa=${encodeURIComponent(payee.upiId)}`,
        `pn=${encodeURIComponent(payee.payeeName)}`,
        `am=${amount.toFixed(2)}`,
        `cu=INR`,
        `tn=${encodeURIComponent(note.slice(0, 50))}`,
    ];
    return `upi://pay?${params.join('&')}`;
};

// ── Resident ─────────────────────────────────────────────────────────────────

export const submitDuePayment = async (dueId: string, utr: string): Promise<PaymentSubmission> => {
    const res = await api.post(`/resident/dues/${dueId}/payment-submissions`, { utr: cleanUtr(utr) });
    return res.data.data;
};

// ── Admin ────────────────────────────────────────────────────────────────────

export const listPaymentSubmissions = async (status?: SubmissionStatus): Promise<AdminPaymentSubmission[]> => {
    const res = await api.get('/admin/billing/payment-submissions', { params: status ? { status } : undefined });
    return res.data.data ?? [];
};

export const confirmPaymentSubmission = async (id: string): Promise<void> => {
    await api.patch(`/admin/billing/payment-submissions/${id}/confirm`);
};

export const rejectPaymentSubmission = async (id: string, reason: string): Promise<void> => {
    await api.patch(`/admin/billing/payment-submissions/${id}/reject`, { reason });
};
