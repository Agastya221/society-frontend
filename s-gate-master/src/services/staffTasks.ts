import api from './api';

export type TaskStatus = 'ASSIGNED' | 'ACCEPTED' | 'DONE' | 'CANCELLED';

export interface StaffTask {
    id: string;
    title: string;
    note?: string | null;
    location?: string | null;
    block?: { id: string; name: string } | null;
    status: TaskStatus;
    createdAt: string;
    domesticStaff: { id: string; name: string; phone?: string; staffType: string };
    createdBy?: { id: string; name: string } | null;
}

export interface AssignableStaff {
    id: string;
    name: string;
    phone?: string;
    staffType: string;
    insideNow: boolean;
}

export interface TaskPlaces {
    blocks: { id: string; name: string }[];
    commonAreas: string[];
}

export interface NewTask {
    domesticStaffId: string;
    title: string;
    note?: string;
    blockId?: string;
    location?: string;
}

/** Tasks for staff: the admin hands a job (clean the lobby...) to a staff member who uses the staff app. */
export const listStaffTasks = async (): Promise<StaffTask[]> => {
    const res = await api.get('/admin/staff-tasks', { params: { scope: 'all' } });
    return Array.isArray(res.data?.data) ? res.data.data : [];
};

export const listAssignableStaff = async (): Promise<AssignableStaff[]> => {
    const res = await api.get('/admin/staff-tasks/staff');
    return Array.isArray(res.data?.data) ? res.data.data : [];
};

export const getTaskPlaces = async (): Promise<TaskPlaces | null> => {
    const res = await api.get('/community/emergencies/places');
    const data = res.data?.data;
    return data && Array.isArray(data.blocks) ? { blocks: data.blocks, commonAreas: Array.isArray(data.commonAreas) ? data.commonAreas : [] } : null;
};

export const giveStaffTask = async (task: NewTask): Promise<void> => {
    await api.post('/admin/staff-tasks', task);
};

export const cancelStaffTask = async (id: string): Promise<void> => {
    await api.patch(`/admin/staff-tasks/${id}/cancel`, {});
};
