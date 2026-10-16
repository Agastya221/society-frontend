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

/** Decisions a guard may still need to relay to a person at the gate. */
export async function fetchRecentStopped(): Promise<QueueItem[]> {
  const since = encodeURIComponent(new Date(Date.now() - 30 * 60_000).toISOString());
  const [rejected, expired] = await Promise.all(['REJECTED', 'EXPIRED'].map(async (status) => {
    const res = await api.get(`/api/v1/gate/entry-requests?status=${status}&since=${since}&order=newest&limit=50`);
    return (res.data?.data?.entryRequests ?? []) as QueueItem[];
  }));
  return [...rejected, ...expired]
    .filter((item) => !['Cancelled by guard', 'Visitor left before entering', 'Approval expired before arrival'].includes(item.rejectionReason ?? ''))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
