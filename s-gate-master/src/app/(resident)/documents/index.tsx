import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import api from '../../../services/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// Maps backend category names → display labels
const CATEGORY_LABELS: Record<string, string> = {
  RULES:          'Rules & Regulations',
  RULES_AND_BYLAWS: 'Rules & Regulations',
  MINUTES:        'Minutes of Meeting',
  MEETING_MINUTES:'Minutes of Meeting',
  FINANCIAL:      'Financial Report',
  GENERAL:        'General',
  CIRCULAR:       'Circular',
  MAINTENANCE:    'Maintenance',
  LEGAL:          'Legal',
  PERSONAL:       'Personal',
  OTHER:          'Other',
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
    id:          raw.id,
    name:        raw.name ?? raw.fileName ?? '',
    category:    raw.category ?? 'GENERAL',
    uploadedBy:  uploaderName,
    uploadedAt:  raw.uploadedAt ?? raw.createdAt ?? new Date().toISOString(),
    fileSizeMB:  sizeMB,
    fileType:    raw.fileType ?? 'PDF',
    isAdminDoc:  raw.isAdminDoc ?? false,
    fileUrl:     raw.fileUrl ?? undefined,
  };
}

// ─── File icon bubble ─────────────────────────────────────────────────────────

function FileIconBubble({ fileType, size = 44 }: { fileType: SocietyDocument['fileType']; size?: number }) {
  const radius = Math.round(size * 0.27);
  const iconSize = Math.round(size * 0.45);
  let bgColor: string, iconColor: string, iconName: React.ComponentProps<typeof Feather>['name'];
  if (fileType === 'PDF')        { bgColor = SgateColors.redBg;   iconColor = SgateColors.red;   iconName = 'file-text'; }
  else if (fileType === 'DOC')   { bgColor = SgateColors.blueBg;  iconColor = SgateColors.blue;  iconName = 'file'; }
  else                           { bgColor = SgateColors.greenBg; iconColor = SgateColors.green; iconName = 'image'; }
  return (
    <View style={[styles.iconBubble, { width: size, height: size, borderRadius: radius, backgroundColor: bgColor }]}>
      <Feather name={iconName} size={iconSize} color={iconColor} />
    </View>
  );
}

// ─── Doc Card ─────────────────────────────────────────────────────────────────

function AdminDocCard({ doc, index }: { doc: SocietyDocument; index: number }) {
  const handleDownload = () => {
    if (doc.fileUrl) {
      Alert.alert('Opening...', `${doc.name}`);
    } else {
      Alert.alert('Unavailable', 'Download link is not available yet.');
    }
  };
  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()} style={styles.docCard}>
      <FileIconBubble fileType={doc.fileType} size={44} />
      <View style={styles.docContent}>
        <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
        <View style={styles.docMeta}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{CATEGORY_LABELS[doc.category] ?? doc.category}</Text>
          </View>
          <Text style={styles.sizeText}>{doc.fileSizeMB} MB</Text>
        </View>
        <Text style={styles.dateText}>{formatDate(doc.uploadedAt)}</Text>
      </View>
      <TouchableOpacity onPress={handleDownload} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Feather name="download" size={20} color={SgateColors.t3} />
      </TouchableOpacity>
    </Animated.View>
  );
}

function MyDocCard({ doc, index, onDelete }: { doc: SocietyDocument; index: number; onDelete: (id: string) => void }) {
  const handleDelete = () => {
    Alert.alert('Delete Document', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(doc.id) },
    ]);
  };
  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()} style={styles.docCard}>
      <FileIconBubble fileType={doc.fileType} size={44} />
      <View style={styles.docContent}>
        <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
        <View style={styles.docMeta}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{CATEGORY_LABELS[doc.category] ?? doc.category}</Text>
          </View>
          <Text style={styles.sizeText}>{doc.fileSizeMB} MB</Text>
        </View>
        <Text style={styles.dateText}>{formatDate(doc.uploadedAt)}</Text>
      </View>
      <View style={styles.myDocActions}>
        <TouchableOpacity onPress={() => Alert.alert('Opening...', doc.name)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="download" size={18} color={SgateColors.t3} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.deleteBtn}>
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
      Alert.alert('Error', 'Could not delete document. Please try again.');
    }
  };

  const handleUpload = () => {
    Alert.alert('Upload Document', 'Camera and gallery upload coming soon.');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={SgateColors.t1} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Documents</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={SgateColors.gold} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Society Documents</Text>
            <Text style={styles.sectionSubtitle}>Uploaded by RWA administration</Text>
          </View>
          {adminDocs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Feather name="folder" size={32} color={SgateColors.t4} />
              <Text style={styles.emptyText}>No society documents available</Text>
            </View>
          ) : (
            adminDocs.map((doc, index) => <AdminDocCard key={doc.id} doc={doc} index={index} />)
          )}

          <View style={[styles.sectionHeader, styles.sectionHeaderMy]}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, styles.flex1]}>My Documents</Text>
              <TouchableOpacity style={styles.uploadBtn} onPress={handleUpload}>
                <Feather name="upload" size={16} color={SgateColors.t2} />
                <Text style={styles.uploadBtnText}>Upload</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionSubtitle}>Your personal documents</Text>
          </View>

          {myDocs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Feather name="folder" size={32} color={SgateColors.t4} />
              <Text style={styles.emptyText}>No documents uploaded</Text>
            </View>
          ) : (
            myDocs.map((doc, index) => (
              <MyDocCard key={doc.id} doc={doc} index={index} onDelete={handleDelete} />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SgateColors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: SgateColors.card, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft },
  headerTitle: { fontSize: 18, fontFamily: SgateFonts.bold, color: SgateColors.t1, flex: 1, marginLeft: 12 },
  headerSpacer: { width: 22 },
  scrollContent: { paddingBottom: 32 },
  sectionHeader: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 },
  sectionHeaderMy: { paddingTop: 24 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
  sectionSubtitle: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 2 },
  flex1: { flex: 1 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  uploadBtnText: { fontSize: 12, fontFamily: SgateFonts.medium, color: SgateColors.t2 },
  docCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: SgateColors.card, borderRadius: 14, marginHorizontal: 16, marginBottom: 8, padding: 14, borderWidth: 1, borderColor: SgateColors.borderSoft, gap: 12 },
  iconBubble: { alignItems: 'center', justifyContent: 'center' },
  docContent: { flex: 1 },
  docName: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t1 },
  docMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  categoryBadge: { backgroundColor: SgateColors.surface, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  categoryText: { fontSize: 10, fontFamily: SgateFonts.bold, color: SgateColors.t2 },
  sizeText: { fontSize: 11, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
  dateText: { fontSize: 11, fontFamily: SgateFonts.regular, color: SgateColors.t4, marginTop: 2 },
  myDocActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deleteBtn: { marginLeft: 2 },
  emptyCard: { backgroundColor: SgateColors.card, borderRadius: 14, marginHorizontal: 16, padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.t2, marginTop: 8 },
  gold: { color: '#FFB800' },
});
