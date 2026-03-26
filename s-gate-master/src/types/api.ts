// ─── Union type enums ─────────────────────────────────────────────────────────

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'GUARD' | 'RESIDENT';

export type EntryType = 'VISITOR' | 'DELIVERY' | 'DOMESTIC_STAFF' | 'CAB' | 'VENDOR';

export type EntryRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export type EntryStatus =
    | 'PENDING'
    | 'APPROVED'
    | 'REJECTED'
    | 'CHECKED_IN'
    | 'CHECKED_OUT';

export type PreApprovalStatus = 'ACTIVE' | 'EXPIRED' | 'USED' | 'CANCELLED';

export type InvitePassType =
    | 'QUICK'
    | 'FREQUENT'
    | 'PRIVATE';

export type InvitePassStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';

export type VisitorType =
    | 'GUEST'
    | 'DELIVERY_PERSON'
    | 'CAB_DRIVER'
    | 'SERVICE_PROVIDER'
    | 'FAMILY_MEMBER'
    | 'FRIEND'
    | 'OTHER';

export type ProviderTag =
    | 'BLINKIT'
    | 'SWIGGY'
    | 'ZOMATO'
    | 'AMAZON'
    | 'FLIPKART'
    | 'BIGBASKET'
    | 'DUNZO'
    | 'OTHER';

export type GatePassType =
    | 'MATERIAL'
    | 'VEHICLE'
    | 'MOVE_IN'
    | 'MOVE_OUT'
    | 'MAINTENANCE';

export type GatePassStatus =
    | 'PENDING'
    | 'APPROVED'
    | 'REJECTED'
    | 'ACTIVE'
    | 'USED'
    | 'EXPIRED';

export type EmergencyType =
    | 'MEDICAL'
    | 'FIRE'
    | 'THEFT'
    | 'VIOLENCE'
    | 'ACCIDENT'
    | 'OTHER';

export type NotificationType =
    | 'ONBOARDING_STATUS'
    | 'ENTRY_REQUEST'
    | 'DELIVERY_REQUEST'
    | 'EMERGENCY_ALERT'
    | 'STAFF_CHECKIN'
    | 'STAFF_CHECKOUT'
    | 'SYSTEM';

export type FamilyRole = 'SPOUSE' | 'CHILD' | 'PARENT' | 'SIBLING' | 'OTHER';

export type OnboardingStatus =
    | 'DRAFT'
    | 'PENDING_DOCS'
    | 'PENDING_APPROVAL'
    | 'RESUBMIT_REQUESTED'
    | 'APPROVED'
    | 'REJECTED';

// ─── Generic API envelope ─────────────────────────────────────────────────────

export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data: T;
}

// ─── Domain models ────────────────────────────────────────────────────────────

export interface User {
    id: string;
    name: string;
    phone: string;
    role: UserRole;
    isActive: boolean;
    flatId: string | null;
    societyId: string | null;
    email?: string;
    photoUrl?: string;
    flat?: { number: string; block?: { name: string } } | null;
    society?: { name: string; address?: string; city?: string } | null;
}

export interface EntryRequest {
    id: string;
    type: EntryType;
    visitorName: string;
    visitorPhone?: string;
    providerTag?: ProviderTag;
    status: EntryRequestStatus;
    flatId: string;
    flat?: { number: string; block?: { name: string } };
    gate?: string;
    createdAt: string;
    photoKey?: string;
}

export interface PreApproval {
    id: string;
    visitorName: string;
    visitorPhone?: string;
    visitorType: VisitorType;
    status: PreApprovalStatus;
    validFrom: string;
    validUntil: string;
    qrToken?: string;
    flatId: string;
}

export interface InvitePass {
    id: string;
    type: InvitePassType;
    status: InvitePassStatus;
    visitorName?: string;
    visitorPhone?: string;
    purpose?: string;
    vehicleNumber?: string;
    companyName?: string;
    companies?: string[];
    allowedDays?: string[];
    timeFrom?: string;
    timeUntil?: string;
    passcode?: string;
    validFrom: string;
    validUntil: string;
    maxUses: number | null;
    usedCount: number;
    createdAt: string;
    isPrivate?: boolean;
    safePickup?: boolean;
}

export interface Entry {
    id: string;
    type: EntryType;
    visitorName: string;
    status: EntryStatus;
    createdAt: string;
    checkOutAt?: string;
    flat?: { number: string };
}

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    body: string;
    isRead: boolean;
    createdAt: string;
    data?: Record<string, unknown>;
}

export interface GatePass {
    id: string;
    type: GatePassType;
    subject: string;
    status: GatePassStatus;
    validFrom: string;
    validUntil: string;
    qrToken?: string;
    details?: string;
}

export interface FamilyMember {
    id: string;
    name: string;
    phone: string;
    email?: string;
    familyRole: FamilyRole;
}

export interface Notice {
    id: string;
    title: string;
    content: string;
    type: string;
    priority: string;
    isPinned: boolean;
    createdAt: string;
}
