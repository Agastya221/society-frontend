import type {
    ResidentContextRequest,
    ResidentRequestDetails,
} from '@/services/profile.service';
import type {
    Block,
    City,
    Flat,
    OnboardingStatusType,
    ResidentType,
    Society,
} from '@/types/onboarding.types';

type RequestLike = ResidentContextRequest | ResidentRequestDetails;

function normalizeResidentType(value?: string | null): ResidentType | null {
    if (value === 'OWNER' || value === 'TENANT') return value;
    return null;
}

function normalizeStatus(value: string): OnboardingStatusType | null {
    const statuses: OnboardingStatusType[] = [
        'NOT_STARTED',
        'DRAFT',
        'PENDING_DOCS',
        'PENDING_APPROVAL',
        'RESUBMIT_REQUESTED',
        'APPROVED',
        'REJECTED',
    ];
    return statuses.includes(value as OnboardingStatusType)
        ? value as OnboardingStatusType
        : null;
}

export function buildOnboardingDraftFromRequest(request: RequestLike): {
    selectedCity: City;
    selectedSociety: Society;
    selectedBlock: Block;
    selectedFlat: Flat;
    residentType: ResidentType;
    isLivingHere: boolean;
    sourceRequestStatus: OnboardingStatusType | null;
} | null {
    const residentType = normalizeResidentType(request.residentType);
    if (!residentType) return null;

    const cityName = request.societyCity || 'Selected City';
    const floor = request.floor || '';

    return {
        selectedCity: {
            id: cityName,
            name: cityName,
            state: '',
            isFeatured: false,
        },
        selectedSociety: {
            id: request.societyId,
            name: request.societyName,
            address: 'societyAddress' in request ? request.societyAddress || '' : '',
            city: cityName,
            state: '',
            pincode: '',
            totalFlats: 0,
            totalBlocks: 0,
        },
        selectedBlock: {
            id: request.blockId,
            name: request.blockName,
            totalFloors: 0,
            description: '',
            totalFlats: 0,
        },
        selectedFlat: {
            id: request.flatId,
            flatNumber: request.flatNumber,
            floor,
            blockName: request.blockName,
            isOccupied: true,
            hasOwner: false,
            hasTenant: false,
            ownerName: null,
            canApply: true,
        },
        residentType,
        isLivingHere: residentType === 'TENANT' ? true : request.isLivingHere,
        sourceRequestStatus: normalizeStatus(request.status),
    };
}
