import { useAuthStore } from '../store/useAuthStore';
import api from './api';

// Complaint types
export type ComplaintCategory = 'MAINTENANCE' | 'SECURITY' | 'CLEANLINESS' | 'WATER' | 'ELECTRICITY' | 'PARKING' | 'NOISE' | 'PETS' | 'PLUMBING' | 'OTHER';
export type ComplaintUrgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ComplaintStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface CreateComplaintPayload {
    title: string;
    description: string;
    category: ComplaintCategory;
    urgency: ComplaintUrgency;
    isPrivate: boolean;
    photos?: string[];
    location?: string; // Location of the complaint
    societyId?: string;
}

export interface ComplaintResponse {
    id: string;
    status: string;
    ticketNumber: string;
    createdAt: string;
}

export interface Complaint {
    id: string;
    title: string;
    description: string;
    category: ComplaintCategory;
    priority: ComplaintUrgency; // API uses priority
    status: ComplaintStatus;
    ticketNumber?: string; // Optional in list view
    createdAt: string;
    updatedAt: string;
    location?: string;
    isAnonymous: boolean;
    images?: string[]; // Raw relative paths from backend
    imageUrls?: { viewUrl: string }[]; // Normalized full URLs for rendering
    reportedBy?: {
        id: string;
        name: string;
        phone: string;
    };
    assignedTo?: {
        id: string;
        name: string;
        role?: string;
    };
    assignedAt?: string;
    resolution?: string;
    resolvedBy?: {
        id: string;
        name: string;
    };
    resolvedAt?: string;
    flat?: {
        id: string;
        flatNumber: string;
        block?: any;
    };
}

/**
 * Create a new complaint
 * 
 * @param payload - Complaint details
 * @returns Created complaint data with ticketNumber
 */
export const createComplaint = async (payload: CreateComplaintPayload): Promise<ComplaintResponse> => {
    try {
        // Map frontend field names to backend API field names
        const requestPayload: Record<string, any> = {
            category: payload.category,
            title: payload.title,
            description: payload.description,
            priority: payload.urgency, // urgency → priority
            images: payload.photos || [], // Always include images, even if empty
            location: payload.location || '', // Required field
            isAnonymous: payload.isPrivate, // isPrivate → isAnonymous
        };

        console.log('📤 Creating complaint');
        console.log('📦 Request payload:', JSON.stringify(requestPayload, null, 2));

        const response = await api.post<{ data: ComplaintResponse }>(
            '/api/v1/community/complaints',
            requestPayload
        );

        console.log('✅ Complaint created successfully!');
        console.log('📋 Response:', response.data.data);

        return response.data.data;
    } catch (error: any) {
        // Let the interceptor handle 401 errors
        // Re-throw with a user-friendly message
        if (error.response?.data?.message) {
            throw new Error(error.response.data.message);
        }
        throw new Error('Failed to create complaint. Please try again.');
    }
};

/**
 * Fetch all complaints for the current user
 * 
 * @returns Array of complaints
 */
/**
 * Create a new complaint with the specified API v1 schema
 * This function matches the exact API specification with priority, images, location, and isAnonymous fields
 * 
 * @param category - Complaint category (PLUMBING, ELECTRICAL, SECURITY, CLEANLINESS, OTHER)
 * @param title - Title of the complaint
 * @param description - Detailed description
 * @param priority - Priority level (HIGH, MEDIUM, LOW, CRITICAL)
 * @param images - Array of image URLs/paths
 * @param location - Location of the issue
 * @param isAnonymous - Whether the complaint is anonymous
 * @param accessToken - JWT access token for authorization
 * @returns Created complaint response with status 201
 */
export const createComplaintV2 = async ({
    category,
    title,
    description,
    priority,
    images = [],
    location,
    isAnonymous = false,
    accessToken,
}: {
    category: ComplaintCategory;
    title: string;
    description: string;
    priority: ComplaintUrgency;
    images?: string[];
    location: string;
    isAnonymous?: boolean;
    accessToken: string;
}): Promise<ComplaintResponse> => {
    try {
        console.log('📤 Creating complaint with the following details:');
        console.log('Category:', category);
        console.log('Title:', title);
        console.log('Priority:', priority);
        console.log('Location:', location);
        console.log('Is Anonymous:', isAnonymous);

        const response = await api.post<{ data: ComplaintResponse }>(
            '/api/v1/community/complaints',
            {
                category,
                title,
                description,
                priority,
                images,
                location,
                isAnonymous,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
            }
        );

        // Check for successful response (status 201)
        if (response.status === 201) {
            console.log('✅ Complaint created successfully!');
            console.log('📋 Ticket Number:', response.data.data.ticketNumber);
            return response.data.data;
        }

        throw new Error('Unexpected response status');
    } catch (error: any) {
        // Log and handle error responses
        console.error('❌ Error creating complaint:', error);

        if (error.response?.data?.message) {
            console.error('Backend error message:', error.response.data.message);
            throw new Error(error.response.data.message);
        }

        if (error.response) {
            throw new Error(`Failed to create complaint: ${error.response.statusText || 'Unknown error'}`);
        }

        if (error.request) {
            throw new Error('Network error. Please check your connection.');
        }

        throw new Error('Failed to create complaint. Please try again.');
    }
};

export const fetchComplaints = async (): Promise<Complaint[]> => {
    try {
        // Get user info from auth store
        const user = useAuthStore.getState().user;
        const societyId = user?.societyId;
        const userId = user?.id;
        const userRole = user?.role;

        console.log('📥 Fetching complaints for user:');
        console.log('👤 User ID:', userId);
        console.log('👔 User Role:', userRole);
        console.log('🏢 Society ID:', societyId);
        console.log('🔗 GET Request URL:', '/api/v1/community/complaints');
        console.log('📋 Note: Authorization header with Bearer token is automatically added by interceptor');

        const response = await api.get<{
            data: {
                complaints: Complaint[];
                pagination: any;
            }
        }>(
            '/api/v1/community/complaints'
        );

        // Extract complaints from nested structure
        const complaints = response.data.data?.complaints || [];

        console.log('✅ Fetched complaints count:', complaints.length);
        console.log('✅ Fetched complaints with S3 keys:', complaints);

        return complaints;
    } catch (error: any) {
        // Let the interceptor handle 401 errors
        // Re-throw with a user-friendly message
        if (error.response?.data?.message) {
            throw new Error(error.response.data.message);
        }
        throw new Error('Failed to fetch complaints. Please try again.');
    }
};

/**
 * Fetch a single complaint by ID
 * 
 * @param complaintId - The ID of the complaint to fetch
 * @returns Complaint details
 */
export const fetchComplaintDetails = async (complaintId: string): Promise<Complaint> => {
    try {
        console.log('📥 Fetching complaint details:', complaintId);

        const response = await api.get<{ data: Complaint }>(
            `/api/v1/community/complaints/${complaintId}`
        );

        console.log('✅ Fetched complaint details successfully');
        return response.data.data;
    } catch (error: any) {
        // Let the interceptor handle 401 errors
        if (error.response?.data?.message) {
            throw new Error(error.response.data.message);
        }
        throw new Error('Failed to fetch complaint details. Please try again.');
    }
};

/**
 * Delete a complaint by ID
 * 
 * @param complaintId - The ID of the complaint to delete
 * @returns Success message from backend
 */
export const deleteComplaint = async (complaintId: string): Promise<string> => {
    try {
        console.log('🗑️  Deleting complaint:', complaintId);

        const response = await api.delete<{ success: boolean; message: string }>(
            `/api/v1/community/complaints/${complaintId}`
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to delete complaint');
        }

        console.log('✅ Complaint deleted successfully');
        return response.data.message;
    } catch (error: any) {
        console.error('❌ Delete complaint error:', error);

        // Let the interceptor handle 401 errors
        if (error.response?.data?.message) {
            throw new Error(error.response.data.message);
        }
        throw new Error('Failed to delete complaint. Please try again.');
    }
};
// --- Admin Specific Endpoints ---

export interface Guard {
    id: string;
    name: string;
    phone: string;
    role: string;
    isActive: boolean;
    photoUrl?: string;
}

/**
 * Fetch all guards for assignment
 */
export const fetchGuards = async (): Promise<Guard[]> => {
    try {
        console.log('📥 Fetching guards list...');
        // Endpoint from docs: 8. Get All Guards (Admin Only) -> GET /resident-app/guards
        const response = await api.get<{ data: Guard[] }>('/api/v1/auth/resident-app/guards');
        console.log('✅ Fetched guards count:', response.data.data.length);
        return response.data.data;
    } catch (error: any) {
        console.error('❌ Fetch guards error:', error);
        if (error.response?.data?.message) {
            throw new Error(error.response.data.message);
        }
        throw new Error('Failed to fetch guards list.');
    }
};

/**
 * Update complaint status or assign to staff
 * Combining logic as typically "assignment" can be part of an update patch, 
 * or there might be specific endpoints. 
 * Since docs don't explicit show "ASSIGN", we'll check if PATCH /complaints/:id supports it.
 * If not, we might need a specific endpoint. 
 * For now, assuming PATCH supports 'status' and 'assignedToId'.
 */
export const updateComplaint = async (
    complaintId: string,
    updates: { status?: ComplaintStatus; assignedToId?: string; resolution?: string }
): Promise<Complaint> => {
    try {
        console.log(`📤 Updating complaint ${complaintId}:`, updates);

        const response = await api.patch<{ data: Complaint }>(
            `/api/v1/community/complaints/${complaintId}`,
            updates
        );

        console.log('✅ Complaint updated successfully');
        return response.data.data;
    } catch (error: any) {
        console.error('❌ Update complaint error:', error);
        if (error.response?.data?.message) {
            throw new Error(error.response.data.message);
        }
        throw new Error('Failed to update complaint.');
    }
};
