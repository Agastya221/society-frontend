/**
 * Plain-words status of a gate entry request for residents.
 *
 * The backend separates the resident's decision from the guard letting the
 * person in: APPROVED with no entryId means "approved, guard hasn't admitted
 * them yet", and only an entryId means they actually entered. EXPIRED and some
 * REJECTED requests carry fixed reasons from the gate (see backend
 * entry-request.service.ts).
 */
export const GATE_REASON = {
    CANCELLED_BY_GUARD: 'Cancelled by guard',
    STOPPED_BY_GUARD: 'Stopped by guard',
    VISITOR_LEFT: 'Visitor left before entering',
    APPROVAL_EXPIRED: 'Approval expired before arrival',
    REVOKED: 'Approval withdrawn by resident',
} as const;

export type GateStatusTone = 'pending' | 'waiting' | 'entered' | 'denied' | 'ended';

export interface GateRequestLike {
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | string;
    entryId?: string | null;
    rejectionReason?: string | null;
}

export function gateRequestStatus(request: GateRequestLike): { label: string; tone: GateStatusTone; detail?: string } {
    const reason = request.rejectionReason ?? undefined;
    switch (request.status) {
        case 'PENDING':
            return { label: 'Waiting for your answer', tone: 'pending' };
        case 'APPROVED':
            return request.entryId
                ? { label: 'Entered', tone: 'entered' }
                : { label: 'Approved — waiting for guard', tone: 'waiting' };
        case 'EXPIRED':
            if (reason === GATE_REASON.VISITOR_LEFT) return { label: 'Visitor left without entering', tone: 'ended' };
            if (reason === GATE_REASON.APPROVAL_EXPIRED) return { label: 'Approval expired — visitor never arrived', tone: 'ended' };
            return { label: 'Expired — no answer in time', tone: 'ended' };
        case 'REJECTED':
            if (reason === GATE_REASON.CANCELLED_BY_GUARD) return { label: 'Withdrawn by the gate', tone: 'ended' };
            if (reason === GATE_REASON.STOPPED_BY_GUARD) return { label: 'Stopped at the gate', tone: 'denied' };
            if (reason === GATE_REASON.REVOKED) return { label: 'You withdrew your approval', tone: 'ended' };
            return { label: 'Denied', tone: 'denied', detail: reason };
        default:
            return { label: String(request.status ?? '').replace(/_/g, ' ').toLowerCase(), tone: 'ended' };
    }
}

/** Push data types the backend sends for gate requests (GATE_REQUEST, GATE_APPROVED, GATE_DENIED, GATE_EXPIRED…). */
export function isGatePushType(type: unknown): boolean {
    return typeof type === 'string' && type.startsWith('GATE_');
}
