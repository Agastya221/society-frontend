// Visit Entry Type for Check-In/Check-Out Tracking
export interface VisitEntry {
    id: string;
    visitorName: string;
    flatNumber: string;
    purpose: string;
    checkInTime: string; // ISO 8601 timestamp
    checkOutTime: string | null; // null if still IN
    status: 'IN' | 'OUT';
    type: 'Guest' | 'Delivery' | 'Worker' | 'Cab';
    approvedBy: string; // Resident name who approved
}

// Helper function to format time (e.g., "2:30 PM")
export function formatTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

// Helper function to calculate duration in minutes
export function calculateDuration(checkIn: string, checkOut: string): number {
    const checkInTime = new Date(checkIn).getTime();
    const checkOutTime = new Date(checkOut).getTime();
    return Math.floor((checkOutTime - checkInTime) / (1000 * 60)); // minutes
}

// Helper function to format duration (e.g., "2h 30m" or "45m")
export function formatDuration(minutes: number): string {
    if (minutes < 60) {
        return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
