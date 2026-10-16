import api from './api';

export type QueueItem = {
  id: string;
  visitorName?: string | null;
  type: string;
  providerTag?: string | null;
  purpose?: string | null;
  flatLabel?: string;
  flat?: { number?: string };
  createdAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  entryId?: string | null;
  rejectionReason?: string | null;
};

export type GateQueue = {
  /** PENDING — resident hasn't answered yet. */
  waiting: QueueItem[];
  /** APPROVED but not yet admitted at the gate. */
  ready: QueueItem[];
  /** Recently rejected/expired by someone other than this gate. */
  stopped: QueueItem[];
  /** Visitors checked in + staff not yet checked out. */
  insideCount: number;
  serverTime?: string;
};

/**
 * Stops the guard made themselves. The backend's /queue already leaves these out
 * of `stopped`; the same list is applied here so an older server can't make the
 * guard's own stop show up (and buzz) as if a resident had refused.
 */
export const GUARD_OWN_STOP_REASONS = [
  'Stopped by guard',
  'Cancelled by guard',
  'Visitor left before entering',
  'Approval expired before arrival',
];

const list = (value: unknown): QueueItem[] => (Array.isArray(value) ? (value as QueueItem[]) : []);

/** The single call for the gate queue — Home and Approvals both read from this. */
export async function fetchQueue(): Promise<GateQueue> {
  const res = await api.get('/api/v1/gate/entry-requests/queue');
  const data = res.data?.data ?? {};
  return {
    waiting: list(data.waiting),
    ready: list(data.ready),
    stopped: list(data.stopped).filter((item) => !GUARD_OWN_STOP_REASONS.includes(item.rejectionReason ?? '')),
    insideCount: typeof data.insideCount === 'number' ? data.insideCount : 0,
    serverTime: data.serverTime,
  };
}
