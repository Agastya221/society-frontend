/**
 * Human label for an onboarding document type code. The API's codes keep the
 * misspelling AADHAR_CARD (a stored enum), so map it explicitly.
 */
const DOCUMENT_LABELS: Record<string, string> = {
    AADHAR_CARD: 'Aadhaar Card',
    AADHAAR_CARD: 'Aadhaar Card',
    PAN_CARD: 'PAN Card',
    VOTER_ID: 'Voter ID',
};

export function documentTypeLabel(type?: string | null): string {
    if (!type) return 'Document';
    return DOCUMENT_LABELS[type.toUpperCase()]
        ?? type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}
