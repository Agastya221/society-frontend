import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppAlert } from '../../../components/ui/AppAlert';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import api from '../../../services/api';

// ─── Download helper ─────────────────────────────────────────────────────────

const FILE_EXT: Record<string, string> = { PDF: '.pdf', DOC: '.doc', DOCX: '.docx', IMAGE: '.jpg' };

async function downloadAndOpen(doc: { id: string; name: string; fileType: string; fileUrl?: string }) {
  // 1. Get a usable URL — prefer direct fileUrl, otherwise fetch a signed one
  let url = doc.fileUrl;
  if (!url) {
    const res = await api.get(`/resident/documents/${doc.id}/view-url`);
    url = res.data?.data?.url ?? res.data?.url ?? res.data;
  }
  if (!url || typeof url !== 'string') {
    throw new Error('NO_URL');
  }

  // 2. Download to local cache
  const ext = FILE_EXT[doc.fileType] ?? '.pdf';
  const safeName = doc.name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 60);
  const localUri = FileSystem.cacheDirectory + safeName + ext;
  const download = await FileSystem.downloadAsync(url, localUri);

  if (!download?.uri) throw new Error('DOWNLOAD_FAILED');

  // 3. Open / share the file
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(download.uri, { dialogTitle: doc.name });
  } else {
    // Fallback — should rarely happen
    throw new Error('SHARING_UNAVAILABLE');
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// Maps backend category names → display labels
const CATEGORY_LABELS: Record<string, string> = {
  RULES: 'Rules & Regulations',
  RULES_AND_BYLAWS: 'Rules & Regulations',
  MINUTES: 'Minutes of Meeting',
  MEETING_MINUTES: 'Minutes of Meeting',
  FINANCIAL: 'Financial Report',
  GENERAL: 'General',
  CIRCULAR: 'Circular',
  MAINTENANCE: 'Maintenance',
  LEGAL: 'Legal',
  PERSONAL: 'Personal',
  OTHER: 'Other',
};

// File-type → Feather icon mapping
const FILE_TYPE_ICON: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  PDF: 'file-text',
  DOC: 'file',
  DOCX: 'file',
  IMAGE: 'image',
};

interface SocietyDocument {
  id: string;
  name: string;
  category: string;
  uploadedBy: string;
  uploadedAt: string;
  fileSizeMB: number;
  fileType: 'PDF' | 'DOC' | 'IMAGE';
  isAdminDoc: boolean;
  fileUrl?: string;
}

function normaliseDoc(raw: any): SocietyDocument {
  const uploader = raw.uploadedBy;
  let uploaderName = 'Unknown';
  if (typeof uploader === 'string') uploaderName = uploader;
  else if (typeof uploader === 'object' && uploader?.name) uploaderName = uploader.name;

  const sizeBytes = raw.fileSizeBytes ?? 0;
  const sizeMB = raw.fileSizeMB ?? (sizeBytes > 0 ? parseFloat((sizeBytes / 1048576).toFixed(2)) : 0);

  return {
    id: raw.id,
    name: raw.name ?? raw.fileName ?? '',
    category: raw.category ?? 'GENERAL',
    uploadedBy: uploaderName,
    uploadedAt: raw.uploadedAt ?? raw.createdAt ?? new Date().toISOString(),
    fileSizeMB: sizeMB,
    fileType: raw.fileType ?? 'PDF',
    isAdminDoc: raw.isAdminDoc ?? false,
    fileUrl: raw.fileUrl ?? undefined,
  };
}

// ─── File icon bubble (gold-themed) ──────────────────────────────────────────

function FileIconBubble({ fileType }: { fileType: string }) {
  const iconName = FILE_TYPE_ICON[fileType] ?? 'file';
  return (
    <View style={styles.iconBubble}>
      <Feather name={iconName} size={20} color={SgateColors.goldDeep} />
    </View>
  );
}

// ─── Doc Card (Admin) ────────────────────────────────────────────────────────

function AdminDocCard({ doc, index }: { doc: SocietyDocument; index: number }) {
  const [busy, setBusy] = useState(false);

  const handleDownload = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await downloadAndOpen(doc);
    } catch (err: any) {
      if (err?.message === 'NO_URL') {
        AppAlert.show('Unavailable', 'Download link is not available for this document.');
      } else {
        AppAlert.show('Download Failed', 'Could not download the file. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()} style={styles.docCard}>
      <FileIconBubble fileType={doc.fileType} />
      <View style={styles.docContent}>
        <Text style={styles.docName} numberOfLines={2}>{doc.name}</Text>
        <View style={styles.docMeta}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{CATEGORY_LABELS[doc.category] ?? doc.category}</Text>
          </View>
          <Text style={styles.sizeText}>{doc.fileSizeMB} MB</Text>
        </View>
        <Text style={styles.dateText}>{formatDate(doc.uploadedAt)}</Text>
      </View>
      <TouchableOpacity
        style={[styles.downloadBtn, busy && styles.downloadBtnActive]}
        onPress={handleDownload}
        disabled={busy}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {busy
          ? <ActivityIndicator size="small" color={SgateColors.goldDeep} />
          : <Feather name="download" size={18} color={SgateColors.t2} />
        }
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Doc Card (My) ───────────────────────────────────────────────────────────

function MyDocCard({ doc, index, onDelete }: { doc: SocietyDocument; index: number; onDelete: (id: string) => void }) {
  const [busy, setBusy] = useState(false);

  const handleDownload = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await downloadAndOpen(doc);
    } catch (err: any) {
      if (err?.message === 'NO_URL') {
        AppAlert.show('Unavailable', 'Download link is not available for this document.');
      } else {
        AppAlert.show('Download Failed', 'Could not download the file. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = () => {
    AppAlert.show('Delete Document', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(doc.id) },
    ]);
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()} style={styles.docCard}>
      <FileIconBubble fileType={doc.fileType} />
      <View style={styles.docContent}>
        <Text style={styles.docName} numberOfLines={2}>{doc.name}</Text>
        <View style={styles.docMeta}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{CATEGORY_LABELS[doc.category] ?? doc.category}</Text>
          </View>
          <Text style={styles.sizeText}>{doc.fileSizeMB} MB</Text>
        </View>
        <Text style={styles.dateText}>{formatDate(doc.uploadedAt)}</Text>
      </View>
      <View style={styles.myDocActions}>
        <TouchableOpacity
          style={[styles.downloadBtn, busy && styles.downloadBtnActive]}
          onPress={handleDownload}
          disabled={busy}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {busy
            ? <ActivityIndicator size="small" color={SgateColors.goldDeep} />
            : <Feather name="download" size={18} color={SgateColors.t2} />
          }
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteActionBtn}
          onPress={handleDelete}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="trash-2" size={18} color={SgateColors.red} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function DocumentsScreen() {
  const router = useRouter();
  const [adminDocs, setAdminDocs] = useState<SocietyDocument[]>([]);
  const [myDocs, setMyDocs] = useState<SocietyDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/resident/documents');
      const raw = res.data?.data ?? res.data;
      const list: any[] = Array.isArray(raw) ? raw : raw?.documents ?? [];
      const normalised = list.map(normaliseDoc);
      setAdminDocs(normalised.filter(d => d.isAdminDoc));
      setMyDocs(normalised.filter(d => !d.isAdminDoc));
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchDocuments(); }, []));

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/resident/documents/${id}`);
      setMyDocs(ds => ds.filter(d => d.id !== id));
    } catch (err) {
      AppAlert.show('Error', 'Could not delete document. Please try again.');
    }
  };

  const handleUpload = () => {
    AppAlert.show('Upload Document', 'Camera and gallery upload coming soon.');
  };

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* ── Header (edge-to-edge) ─────────────────────────────────────── */}
      <View style={styles.headerBg}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerInner}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="arrow-left" size={22} color={SgateColors.t1} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Documents</Text>
            <View style={{ width: 22 }} />
          </View>
        </SafeAreaView>
      </View>

      {/* ── Content ───────────────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={SgateColors.gold} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Society Documents ──────────────────────────────────────── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Society Documents</Text>
            <Text style={styles.sectionSubtitle}>Uploaded by RWA administration</Text>
          </View>

          {adminDocs.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Feather name="folder" size={28} color={SgateColors.goldDeep} />
              </View>
              <Text style={styles.emptyTitle}>No documents available</Text>
              <Text style={styles.emptySub}>Society documents will appear here once uploaded by the admin</Text>
            </View>
          ) : (
            adminDocs.map((doc, index) => <AdminDocCard key={doc.id} doc={doc} index={index} />)
          )}

          {/* ── My Documents ──────────────────────────────────────────── */}
          <View style={styles.sectionHeaderMy}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, { flex: 1 }]}>My Documents</Text>
            </View>
            <Text style={styles.sectionSubtitle}>Your personal documents</Text>
          </View>

          {myDocs.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Feather name="file-plus" size={28} color={SgateColors.goldDeep} />
              </View>
              <Text style={styles.emptyTitle}>No documents yet</Text>
              <Text style={styles.emptySub}>Upload personal documents to access them anytime</Text>
            </View>
          ) : (
            myDocs.map((doc, index) => (
              <MyDocCard key={doc.id} doc={doc} index={index} onDelete={handleDelete} />
            ))
          )}
        </ScrollView>
      )}

      {/* ── Upload FAB ────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleUpload}
        activeOpacity={0.85}
      >
        <Feather name="upload" size={20} color={SgateColors.t1} />
        <Text style={styles.fabText}>Upload</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SgateColors.bg,
  },

  // ── Header ────────────────────────────────────────────────────────────
  headerBg: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
    marginLeft: 12,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // ── Section Headers ───────────────────────────────────────────────────
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 14,
  },
  sectionHeaderMy: {
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t3,
    marginTop: 3,
  },

  // ── Document Card ─────────────────────────────────────────────────────
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    gap: 14,
    // Subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },

  // ── Icon Bubble (gold-themed) ─────────────────────────────────────────
  iconBubble: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: SgateColors.goldPale,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Card Content ──────────────────────────────────────────────────────
  docContent: {
    flex: 1,
  },
  docName: {
    fontSize: 15,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
    lineHeight: 21,
  },
  docMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  categoryBadge: {
    backgroundColor: '#F5F5F5',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryText: {
    fontSize: 11,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t2,
  },
  sizeText: {
    fontSize: 13,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t3,
  },
  dateText: {
    fontSize: 12,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t4,
    marginTop: 4,
  },

  // ── Download Button ───────────────────────────────────────────────────
  downloadBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F8F8F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadBtnActive: {
    backgroundColor: SgateColors.goldPale,
  },

  // ── My Doc Actions ────────────────────────────────────────────────────
  myDocActions: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  deleteActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: SgateColors.redBg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Empty State ───────────────────────────────────────────────────────
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: SgateColors.goldPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t3,
    textAlign: 'center',
    lineHeight: 19,
  },

  // ── Upload FAB ────────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 36 : 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SgateColors.gold,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: SgateColors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    fontSize: 15,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
  },
});
