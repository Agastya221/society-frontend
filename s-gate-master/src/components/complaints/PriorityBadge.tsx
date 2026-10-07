import { StatusPill } from '@/components/ui/StatusPill';
import { ComplaintUrgency } from '../../services/complaints';

interface PriorityBadgeProps {
    priority: ComplaintUrgency;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
    return <StatusPill status={priority} label={`${priority} PRIORITY`} uppercase />;
}
