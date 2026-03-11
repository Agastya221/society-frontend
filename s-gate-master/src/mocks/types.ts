export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type VisitorType = 'GUEST' | 'DELIVERY' | 'WORKER';

export interface ApprovalRequest {
    id: string;
    visitorName: string;
    visitorType: VisitorType;
    visitorPhotoUrl: string; // placeholder
    flatId: string;
    requestedAt: string; // ISO date
    status: ApprovalStatus;
    rejectionReason?: string;
}

export type GatePassType = 'GUEST' | 'WORKER' | 'MATERIAL';

export interface GatePass {
    id: string;
    type: GatePassType;
    title: string;
    description: string;
    validFrom: string;
    validTo: string;
    status: ApprovalStatus;
    rejectionReason?: string; // If auto-rejected or manually rejected by guard?
    code: string; // QR code content
    createdAt: string;
}

export type NoticePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Notice {
    id: string;
    title: string;
    content: string;
    priority: NoticePriority;
    isPinned: boolean;
    createdAt: string;
    postedBy: string;
}

export type StaffStatus = 'IN' | 'OUT';
export type StaffRole = 'MAID' | 'DRIVER' | 'COOK' | 'NANNY';

export interface DomesticStaff {
    id: string;
    name: string;
    role: StaffRole;
    photoUrl: string;
    currentStatus: StaffStatus;
    lastEntry?: string;
    lastExit?: string;
}

export type ComplaintStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ComplaintCategory = 'Plumbing' | 'Electrical' | 'Security' | 'Cleanliness' | 'Other';
export type UserRole = 'RESIDENT' | 'ADMIN';

export interface ComplaintComment {
    id: string;
    author: string;
    role: UserRole;
    message: string;
    createdAt: string;
}

export interface Complaint {
    id: string;
    title: string;
    description: string;
    category: ComplaintCategory;
    priority: ComplaintPriority;
    status: ComplaintStatus;
    flatNumber: string;
    createdBy: string;
    images: string[];
    comments: ComplaintComment[];
    createdAt: string;
    updatedAt: string;
    likes: number;
    likedBy: string[]; // user IDs
}
