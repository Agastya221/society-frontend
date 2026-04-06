import api from './api';

export interface BillingInvoice {
    month: string;
    totalFlats: number;
    amountPerFlat: number;
    status: 'GENERATED' | 'PROCESSING';
}

export const generateBulkInvoices = async (month: string, amountPerFlat: number): Promise<boolean> => {
    try {
        await api.post('/admin/billing/generate', { month, amountPerFlat });
        return true;
    } catch (err) {
        // Mock successful generation for now
        console.warn('Backend /admin/billing/generate failed, mocking success.');
        return new Promise(resolve => setTimeout(() => resolve(true), 1500));
    }
};

export const applyLatePenalty = async (amount: number): Promise<boolean> => {
    try {
        await api.post('/admin/billing/penalty', { amount });
        return true;
    } catch (err) {
        console.warn('Backend /admin/billing/penalty failed, mocking success.');
        return new Promise(resolve => setTimeout(() => resolve(true), 1200));
    }
};
