// ─── Onboarding Types ─────────────────────────────────────────────────────────
// Matches backend contract from ONBOARDING_API_HANDOFF.md

// ── City ──────────────────────────────────────────────────────────────────────

export interface City {
    id: string;
    name: string;
    state: string;
    isFeatured: boolean;
}

// ── Society ───────────────────────────────────────────────────────────────────

export interface Society {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    totalFlats: number;
    totalBlocks: number;
}

// ── Block / Tower ─────────────────────────────────────────────────────────────

export interface Block {
    id: string;
    name: string;
    totalFloors: number;
    description: string;
    totalFlats: number;
}

// ── Flat ──────────────────────────────────────────────────────────────────────

export interface Flat {
    id: string;
    flatNumber: string;
    floor: string;
    blockName: string;
    isOccupied: boolean;
    hasOwner: boolean;
    hasTenant: boolean;
    ownerName: string | null;
    canApply: boolean;
}

// ── Resident Type ─────────────────────────────────────────────────────────────

export type ResidentType = 'OWNER' | 'TENANT';

// ── Document Types ────────────────────────────────────────────────────────────

export type DocumentType =
    | 'OWNERSHIP_PROOF'
    | 'TENANT_AGREEMENT'
    | 'AADHAR_CARD'
    | 'PAN_CARD'
    | 'PASSPORT'
    | 'DRIVING_LICENSE'
    | 'VOTER_ID'
    | 'OTHER';

export const ID_PROOF_TYPES: { type: DocumentType; label: string }[] = [
    { type: 'AADHAR_CARD', label: 'Aadhaar Card' },
    { type: 'PAN_CARD', label: 'PAN Card' },
    { type: 'PASSPORT', label: 'Passport' },
    { type: 'DRIVING_LICENSE', label: 'Driving License' },
    { type: 'VOTER_ID', label: 'Voter ID' },
];

export interface UploadedDocument {
    type: DocumentType;
    s3Key: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
}

// ── Onboarding Request (Submission Payload) ───────────────────────────────────

export interface OnboardingRequestPayload {
    societyId: string;
    blockId: string;
    flatId: string;
    residentType: ResidentType;
    isLivingHere?: boolean;
    documents: {
        type: DocumentType;
        s3Key: string;
        fileName?: string;
        fileSize?: number;
        mimeType?: string;
    }[];
}

export interface OnboardingSubmitResponse {
    requestId: string;
    status: OnboardingStatusType;
    submittedAt: string;
    estimatedReviewTime: string;
}

// ── Onboarding Status ─────────────────────────────────────────────────────────

export type OnboardingStatusType =
    | 'NOT_STARTED'
    | 'DRAFT'
    | 'PENDING_DOCS'
    | 'PENDING_APPROVAL'
    | 'RESUBMIT_REQUESTED'
    | 'APPROVED'
    | 'REJECTED';

export interface OnboardingStatusResponse {
    status: OnboardingStatusType;
    society: string;
    block: string;
    flat: string;
    residentType: ResidentType;
    isLivingHere: boolean;
    ownerOccupancy: string;
    submittedAt: string | null;
    approvedAt: string | null;
    rejectedAt: string | null;
    documents: UploadedDocument[];
    message: string | null;
    rejectionReason: string | null;
    resubmitReason: string | null;
    canReapply: boolean;
    accessGranted: boolean;
}

// ── Search Params ─────────────────────────────────────────────────────────────

export interface SocietySearchParams {
    city?: string;
    search?: string;
}

// ── API Response Envelope ─────────────────────────────────────────────────────

export interface ApiEnvelope<T> {
    success: boolean;
    message?: string;
    data: T;
}
