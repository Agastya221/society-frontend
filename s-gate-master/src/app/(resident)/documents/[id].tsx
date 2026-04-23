import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet,
  Share, ScrollView, ActivityIndicator, Linking, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import api from '../../../services/api';
import { AppAlert } from '../../../components/ui/AppAlert';

const CATEGORY_LABELS: Record<string, string> = {
  RULES_AND_BYLAWS: 'Rules & Regulations', MEETING_MINUTES: 'Minutes of Meeting',
  FINANCIAL: 'Financial Report', CIRCULAR: 'Circular', MAINTENANCE: 'Maintenance',
  LEGAL: 'Legal', PERSONAL: 'Personal', OTHER: 'Other',
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function formatDate(iso: string) { const d = new Date(iso); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }

interface Doc {
  id: string; name: string; category: string; fileName: string;
  fileSizeMB: number; fileType: string; uploadedBy: string; createdAt: string;
}

function normalise(raw: any): Doc {
  const ub = raw.uploadedBy;
  return {
    id: raw.id, name: raw.name ?? raw.fileName ?? '',
    category: raw.category ?? 'OTHER', fileName: raw.fileName ?? '',
    fileSizeMB: raw.fileSizeMB ?? 0, fileType: (raw.fileType ?? 'PDF').toUpperCase(),
    uploadedBy: typeof ub === 'string' ? ub : (ub?.name ?? 'Unknown'),
    createdAt: raw.createdAt ?? raw.uploadedAt ?? new Date().toISOString(),
  };
}

// File-type → Feather icon mapping
const FILE_TYPE_ICON: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  PDF: 'file-text', DOC: 'file', DOCX: 'file', IMAGE: 'image',
};

function FileIcon({ ft }: { ft: string }) {
  const iconName = FILE_TYPE_ICON[ft] ?? 'file';
  return (
    <View style={S.iconBubble}>
      <Feather name={iconName} size={40} color={SgateColors.goldDeep} />
    </View>
  );
}

export default function DocumentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);

  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const res = await api.get(`/resident/documents/${id}`);
        setDoc(normalise(res.data?.data ?? res.data));
      } catch { /* handled below */ } finally { setLoading(false); }
    })();
  }, [id]));

  const handleOpen = async () => {
    if (!doc || opening) return;
    setOpening(true);
    try {
      const res = await api.get(`/resident/documents/${id}/view-url`);
      const url: string = res.data?.data?.url ?? res.data?.url ?? res.data;
      if (url) await Linking.openURL(url);
      else AppAlert.show('Error', 'Could not get document URL.');
    } catch { AppAlert.show('Error', 'Could not open document.'); }
    finally { setOpening(false); }
  };

  const handleShare = async () => doc && Share.share({ message: `${doc.name} - Shared from S-Gate` });

  if (loading) return (
    <View style={S.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View style={S.headerBg}>
        <SafeAreaView edges={['top']}>
          <View style={S.headerInner}>
            <TouchableOpacity onPress={() => router.back()} style={S.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="arrow-left" size={22} color={SgateColors.t1} />
            </TouchableOpacity>
            <Text style={S.headerTitle}>Document</Text>
            <View style={{ width: 22 }} />
          </View>
        </SafeAreaView>
      </View>
      <View style={S.center}><ActivityIndicator size="large" color={SgateColors.gold} /></View>
    </View>
  );

  if (!doc) return (
    <View style={S.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View style={S.headerBg}>
        <SafeAreaView edges={['top']}>
          <View style={S.headerInner}>
            <TouchableOpacity onPress={() => router.back()} style={S.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="arrow-left" size={22} color={SgateColors.t1} />
            </TouchableOpacity>
            <Text style={S.headerTitle}>Document</Text>
            <View style={{ width: 22 }} />
          </View>
        </SafeAreaView>
      </View>
      <View style={S.center}>
        <View style={S.emptyIconCircle}>
          <Feather name="file" size={28} color={SgateColors.goldDeep} />
        </View>
        <Text style={S.notFoundText}>Document not found</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={S.backLink}>Go back</Text></TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={S.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* ── Header (edge-to-edge) ─────────────────────────────────────── */}
      <View style={S.headerBg}>
        <SafeAreaView edges={['top']}>
          <View style={S.headerInner}>
            <TouchableOpacity onPress={() => router.back()} style={S.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="arrow-left" size={22} color={SgateColors.t1} />
            </TouchableOpacity>
            <Text style={S.headerTitle} numberOfLines={1}>{doc.name}</Text>
            <TouchableOpacity onPress={handleShare} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="share-2" size={20} color={SgateColors.t1} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>
        <View style={S.centerArea}>
          <View style={S.mainCard}>
            <FileIcon ft={doc.fileType} />
            <View style={S.pill}><Text style={S.pillText}>{doc.fileType}</Text></View>
            <Text style={S.docName}>{doc.name}</Text>
            <View style={S.pill}><Text style={S.pillText}>{CATEGORY_LABELS[doc.category] ?? doc.category}</Text></View>
            <View style={S.divider} />
            {[
              { icon: 'user' as const, label: 'Uploaded by', value: doc.uploadedBy },
              { icon: 'calendar' as const, label: 'Upload date', value: formatDate(doc.createdAt) },
              { icon: 'hard-drive' as const, label: 'File size', value: `${doc.fileSizeMB} MB` },
            ].map(r => (
              <View key={r.label} style={S.row}>
                <View style={S.rowIconWrap}>
                  <Feather name={r.icon} size={14} color={SgateColors.goldDeep} />
                </View>
                <Text style={S.rowLabel}>{r.label}</Text>
                <Text style={S.rowValue}>{r.value}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={S.btns}>
          <TouchableOpacity style={S.primary} onPress={handleOpen} activeOpacity={0.85}>
            {opening
              ? <ActivityIndicator size="small" color={SgateColors.t1} />
              : <>
                  <Feather name="external-link" size={18} color={SgateColors.t1} />
                  <Text style={S.primaryText}>Open Document</Text>
                </>
            }
          </TouchableOpacity>
          <TouchableOpacity style={S.secondary} onPress={handleShare} activeOpacity={0.85}>
            <Feather name="share-2" size={16} color={SgateColors.t2} />
            <Text style={S.secondaryText}>Share</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
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
    fontSize: 18,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
    marginLeft: 12,
    flex: 1,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },

  scroll: {
    flexGrow: 1,
    paddingBottom: 8,
  },
  centerArea: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },

  // ── Gold-themed Icon Bubble ───────────────────────────────────────────
  iconBubble: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: SgateColors.goldPale,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pill: {
    marginTop: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pillText: {
    fontSize: 12,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t2,
    letterSpacing: 0.8,
  },
  docName: {
    fontSize: 17,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
  },
  divider: {
    width: 60,
    height: 1,
    backgroundColor: SgateColors.borderSoft,
    marginVertical: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  rowIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: SgateColors.goldPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rowLabel: {
    fontSize: 12,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t3,
    flex: 1,
  },
  rowValue: {
    fontSize: 13,
    fontFamily: SgateFonts.medium,
    color: SgateColors.t1,
  },

  btns: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 16,
  },
  primary: {
    backgroundColor: SgateColors.gold,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryText: {
    fontSize: 15,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
  },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: SgateColors.border,
    gap: 8,
  },
  secondaryText: {
    fontSize: 14,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
  },
  notFoundText: {
    fontSize: 16,
    fontFamily: SgateFonts.medium,
    color: SgateColors.t2,
  },
  backLink: {
    fontSize: 14,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.gold,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: SgateColors.goldPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
});
