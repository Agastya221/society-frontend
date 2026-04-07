import api from './api';

export interface BillingInvoice {
    month: string;
    totalFlats: number;
    amountPerFlat: number;
    status: 'GENERATED' | 'PROCESSING';
}

export const generateBulkInvoices = async (month: string, amountPerFlat: number): Promise<boolean> => {
    await api.post('/admin/billing/generate', { month, amountPerFlat });
    return true;
};

export const applyLatePenalty = async (amount: number): Promise<boolean> => {
    await api.post('/admin/billing/penalty', { amount });
    return true;
};

export const markInvoicePaid = async (id: string): Promise<boolean> => {
    await api.patch(`/admin/billing/invoices/${id}/paid`);
    return true;
};

export const waiveInvoice = async (id: string): Promise<boolean> => {
    await api.patch(`/admin/billing/invoices/${id}/waive`);
    return true;
};
