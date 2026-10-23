import api from './api';

export interface SocietySettings {
    society: { name: string | null; address: string | null; city: string | null };
    maintenance: { monthlyFee: number | null; dueDayOfMonth: number; gracePeriodDays: number };
    autoApproval: { domesticStaff: boolean; delivery: boolean; cab: boolean };
    /** Where residents pay dues: the society's UPI ID (null until the admin sets it) */
    payments: { upiId: string | null; payeeName: string | null };
}

export interface SocietySettingsUpdate {
    maintenance?: Partial<SocietySettings['maintenance']>;
    autoApproval?: Partial<SocietySettings['autoApproval']>;
    payments?: Partial<SocietySettings['payments']>;
}

/** Society-level settings managed by the society admin. */
export const getSocietySettings = async (): Promise<SocietySettings> => {
    const res = await api.get('/admin/society/settings');
    return res.data.data;
};

export interface AdminHandoffResult {
    newAdmin: { id: string; name: string; phone: string };
    /** true when the old admin lives in a flat here and carries on as a resident; false when he leaves the society */
    oldAdminStaysAsResident: boolean;
}

/** The society admin hands the admin role to another number. No super admin involved. */
export const handoffAdminRole = async (phone: string, name: string): Promise<AdminHandoffResult> => {
    const res = await api.post('/admin/handoff', { phone, name });
    return res.data.data;
};

export const updateSocietySettings = async (data: SocietySettingsUpdate): Promise<SocietySettings> => {
    const res = await api.patch('/admin/society/settings', data);
    return res.data.data;
};
