import { StatusPill } from '@/components/ui/StatusPill';
import { ComplaintStatus } from '../../services/complaints';

interface ComplaintStatusBadgeProps {
    status: ComplaintStatus;
}

export function ComplaintStatusBadge({ status }: ComplaintStatusBadgeProps) {
    return <StatusPill status={status} uppercase />;
}
