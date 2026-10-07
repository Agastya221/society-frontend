import api from './api';

export type VehicleStatus = 'PENDING' | 'ACTIVE' | 'REJECTED';

/** A vehicle as returned by GET /admin/vehicles (Prisma Vehicle + user + flat). */
export interface AdminVehicle {
    id: string;
    vehicleNumber: string;
    vehicleType: string;
    model: string;
    color: string;
    status: VehicleStatus;
    rejectionNote: string | null;
    owner: { id: string; name: string; phone: string } | null;
    flatLabel: string;
    createdAt: string | null;
}

export function normaliseVehicleStatus(raw: unknown): VehicleStatus {
    const s = String(raw ?? '').toUpperCase();
    if (s === 'ACTIVE' || s === 'APPROVED') return 'ACTIVE';
    if (s === 'REJECTED') return 'REJECTED';
    return 'PENDING';
}

function normaliseAdminVehicle(raw: any): AdminVehicle {
    const flat = raw?.flat;
    const blockName = typeof flat?.block === 'string' ? flat.block : flat?.block?.name;
    const flatNumber = flat?.flatNumber ?? flat?.number;
    const owner = raw?.user ?? raw?.owner ?? raw?.resident;
    return {
        id: String(raw?.id ?? ''),
        vehicleNumber: String(raw?.vehicleNumber ?? raw?.plateNumber ?? ''),
        vehicleType: String(raw?.vehicleType ?? raw?.type ?? 'Other'),
        model: String(raw?.model ?? raw?.makeModel ?? ''),
        color: String(raw?.color ?? ''),
        status: normaliseVehicleStatus(raw?.status),
        rejectionNote: raw?.rejectionNote ?? raw?.reason ?? null,
        owner: owner
            ? { id: String(owner.id ?? ''), name: String(owner.name ?? 'Resident'), phone: String(owner.phone ?? '') }
            : null,
        flatLabel: flatNumber ? [blockName, flatNumber].filter(Boolean).join('-') : '',
        createdAt: raw?.createdAt ?? null,
    };
}

/** GET /admin/vehicles?status=PENDING — vehicles awaiting the admin's decision. */
export async function listPendingVehicles(params: { page?: number; limit?: number } = {}): Promise<{ vehicles: AdminVehicle[]; total: number; pages: number }> {
    const res = await api.get('/admin/vehicles', {
        params: { status: 'PENDING', page: params.page ?? 1, limit: params.limit ?? 50 },
    });
    const data = res.data?.data ?? {};
    const list: any[] = Array.isArray(data) ? data : Array.isArray(data.vehicles) ? data.vehicles : [];
    const vehicles = list
        .map(normaliseAdminVehicle)
        // Guard against a server that ignores the status filter.
        .filter(v => v.id && v.status === 'PENDING');
    const total = Number(data.pagination?.total);
    return {
        vehicles,
        total: Number.isFinite(total) && list.length === vehicles.length ? total : vehicles.length,
        pages: Number(data.pagination?.pages) || 1,
    };
}

/**
 * PATCH /admin/vehicles/:id/approve. The controller passes the body straight to
 * the service, which stores `rejectionNote`; `reason` is sent too for the newer
 * contract.
 */
export async function decideVehicle(id: string, status: 'ACTIVE' | 'REJECTED', reason?: string): Promise<void> {
    const note = reason?.trim();
    await api.patch(`/admin/vehicles/${encodeURIComponent(id)}/approve`, {
        status,
        ...(status === 'REJECTED' && note ? { reason: note, rejectionNote: note } : {}),
    });
}
