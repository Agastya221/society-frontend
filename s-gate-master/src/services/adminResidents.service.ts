import api from './api';

export { isRouteMissing, serverMessage } from './apiErrors';

export type AdminResidentType = 'OWNER' | 'TENANT' | 'FAMILY';

export interface AdminResident {
    id: string;
    membershipId: string;
    name: string;
    phone: string;
    photoUrl: string | null;
    residentType: AdminResidentType;
    isPrimary: boolean;
    flat: { id: string; flatNumber: string; block: { id: string; name: string } | null } | null;
    createdAt: string | null;
}

export interface Pagination {
    total: number;
    page: number;
    limit: number;
    pages: number;
}

export interface AdminResidentsPage {
    residents: AdminResident[];
    pagination: Pagination;
}

const normaliseType = (raw: unknown): AdminResidentType => {
    const t = String(raw ?? '').toUpperCase();
    if (t === 'TENANT' || t === 'RENTER') return 'TENANT';
    if (t === 'FAMILY' || t === 'FAMILY_MEMBER') return 'FAMILY';
    return 'OWNER';
};

export function normaliseAdminResident(raw: any): AdminResident {
    const flat = raw?.flat;
    const block = flat?.block;
    return {
        id: String(raw?.id ?? raw?.membershipId ?? ''),
        membershipId: String(raw?.membershipId ?? raw?.id ?? ''),
        name: String(raw?.name ?? 'Resident'),
        phone: String(raw?.phone ?? ''),
        photoUrl: raw?.photoUrl ?? null,
        residentType: normaliseType(raw?.residentType),
        isPrimary: Boolean(raw?.isPrimary),
        flat: flat
            ? {
                id: String(flat.id ?? ''),
                flatNumber: String(flat.flatNumber ?? flat.number ?? ''),
                block: block
                    ? { id: String(block.id ?? ''), name: String(block.name ?? '') }
                    : typeof block === 'string' ? { id: '', name: block } : null,
            }
            : null,
        createdAt: raw?.createdAt ?? null,
    };
}

/** GET /admin/residents — the society's current resident members. */
export async function listAdminResidents(params: { search?: string; page?: number; limit?: number }): Promise<AdminResidentsPage> {
    const res = await api.get('/admin/residents', {
        params: {
            search: params.search?.trim() || undefined,
            page: params.page ?? 1,
            limit: params.limit ?? 20,
        },
    });
    const data = res.data?.data ?? {};
    const list: any[] = Array.isArray(data) ? data : Array.isArray(data.residents) ? data.residents : [];
    const residents = list.map(normaliseAdminResident).filter(r => r.membershipId);
    const p = data.pagination ?? {};
    const page = Number(p.page) || params.page || 1;
    const limit = Number(p.limit) || params.limit || 20;
    const total = Number(p.total) || residents.length;
    return {
        residents,
        pagination: { total, page, limit, pages: Number(p.pages) || Math.max(1, Math.ceil(total / limit)) },
    };
}

/** POST /admin/residents — add a person to a flat directly (201 returns the resident). */
export async function addAdminResident(body: {
    name: string;
    phone: string;
    flatId: string;
    residentType: AdminResidentType;
}): Promise<AdminResident> {
    const res = await api.post('/admin/residents', body);
    return normaliseAdminResident(res.data?.data ?? {});
}

/** DELETE /admin/residents/:membershipId — remove the person from that flat. */
export async function removeAdminResident(membershipId: string): Promise<void> {
    await api.delete(`/admin/residents/${encodeURIComponent(membershipId)}`);
}
