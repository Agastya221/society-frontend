export type DocCategory =
  | 'RULES'
  | 'MINUTES'
  | 'FINANCIAL'
  | 'GENERAL'
  | 'PERSONAL';

export type FileType = 'PDF' | 'DOC' | 'IMAGE';

export interface SocietyDocument {
  id: string;
  name: string;
  category: DocCategory;
  uploadedBy: string;
  uploadedAt: string;
  fileSizeMB: number;
  fileType: FileType;
  isAdminDoc: boolean;
}

export const DOCUMENTS: SocietyDocument[] = [
  // ── Admin / Society documents ──────────────────────────────────────────
  {
    id: 'd1',
    name: 'Society Bye-Laws 2024',
    category: 'RULES',
    uploadedBy: 'RWA Admin',
    uploadedAt: '2024-01-15T10:00:00Z',
    fileSizeMB: 1.2,
    fileType: 'PDF',
    isAdminDoc: true,
  },
  {
    id: 'd2',
    name: 'AGM Minutes – March 2025',
    category: 'MINUTES',
    uploadedBy: 'RWA Secretary',
    uploadedAt: '2025-03-28T14:00:00Z',
    fileSizeMB: 0.8,
    fileType: 'PDF',
    isAdminDoc: true,
  },
  {
    id: 'd3',
    name: 'Annual Financial Report 2024-25',
    category: 'FINANCIAL',
    uploadedBy: 'RWA Treasurer',
    uploadedAt: '2025-04-10T09:30:00Z',
    fileSizeMB: 3.1,
    fileType: 'PDF',
    isAdminDoc: true,
  },
  {
    id: 'd4',
    name: 'Emergency Contact Numbers',
    category: 'GENERAL',
    uploadedBy: 'RWA Admin',
    uploadedAt: '2025-01-01T08:00:00Z',
    fileSizeMB: 0.1,
    fileType: 'PDF',
    isAdminDoc: true,
  },
  {
    id: 'd5',
    name: 'Parking Rules & Allocation Map',
    category: 'RULES',
    uploadedBy: 'RWA Admin',
    uploadedAt: '2025-06-20T11:00:00Z',
    fileSizeMB: 0.5,
    fileType: 'PDF',
    isAdminDoc: true,
  },
  // ── Resident / personal documents ─────────────────────────────────────
  {
    id: 'd6',
    name: 'Lease Agreement – B204',
    category: 'PERSONAL',
    uploadedBy: 'You',
    uploadedAt: '2025-08-01T10:00:00Z',
    fileSizeMB: 0.6,
    fileType: 'PDF',
    isAdminDoc: false,
  },
  {
    id: 'd7',
    name: 'NOC from Previous Society',
    category: 'PERSONAL',
    uploadedBy: 'You',
    uploadedAt: '2025-07-15T16:00:00Z',
    fileSizeMB: 0.3,
    fileType: 'IMAGE',
    isAdminDoc: false,
  },
];

export const CATEGORY_LABELS: Record<DocCategory, string> = {
  RULES: 'Rules & Regulations',
  MINUTES: 'Minutes of Meeting',
  FINANCIAL: 'Financial Report',
  GENERAL: 'General',
  PERSONAL: 'Personal',
};
