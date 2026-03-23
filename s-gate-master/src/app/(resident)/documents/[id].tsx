import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Share,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import {
  DOCUMENTS,
  SocietyDocument,
  CATEGORY_LABELS,
} from '../../../mocks/documents';

// ─── Helpers ────────────────────────────────────────────────────────────────

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function LargeFileIcon({ fileType }: { fileType: SocietyDocument['fileType'] }) {
  let bgColor: string;
  let iconColor: string;
  let iconName: React.ComponentProps<typeof Feather>['name'];

  if (fileType === 'PDF') {
    bgColor = SgateColors.redBg;
    iconColor = SgateColors.red;
    iconName = 'file-text';
  } else if (fileType === 'DOC') {
    bgColor = SgateColors.blueBg;
    iconColor = SgateColors.blue;
    iconName = 'file';
  } else {
    bgColor = SgateColors.greenBg;
    iconColor = SgateColors.green;
    iconName = 'image';
  }

  return (
    <View
      style={[styles.largeIconBubble, { backgroundColor: bgColor }]}
    >
      <Feather name={iconName} size={40} color={iconColor} />
    </View>
  );
}

interface DetailRowProps {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  value: string;
}

function DetailRow({ icon, label, value }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Feather name={icon} size={14} color={SgateColors.t4} style={styles.detailIcon} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function DocumentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const doc = DOCUMENTS.find((d) => d.id === id) ?? null;

  if (!doc) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.notFoundContainer}>
          <Feather name="file" size={40} color={SgateColors.t4} />
          <Text style={styles.notFoundText}>Document not found</Text>
          <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
            <Text style={styles.backLinkText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleShare = async () => {
    await Share.share({
      message: `${doc.name} - Shared from S-Gate app`,
    });
  };

  const handleOpenDocument = () => {
    Alert.alert(
      'Coming Soon',
      'Document viewer will be available in a future update.',
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={22} color={SgateColors.t1} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {doc.name}
        </Text>
        <TouchableOpacity
          onPress={handleShare}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.headerShareBtn}
        >
          <Feather name="share-2" size={22} color={SgateColors.t1} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            Alert.alert('Downloading...', `${doc.name} is being downloaded.`, [
              { text: 'OK' },
            ])
          }
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="download" size={22} color={SgateColors.t1} />
        </TouchableOpacity>
      </View>

      {/* ── Center content ── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.centerArea}>
          {/* Main card */}
          <View style={styles.mainCard}>
            <LargeFileIcon fileType={doc.fileType} />

            <View style={styles.fileTypePill}>
              <Text style={styles.fileTypeText}>{doc.fileType}</Text>
            </View>

            <Text style={styles.docName}>{doc.name}</Text>

            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {CATEGORY_LABELS[doc.category]}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRows}>
              <DetailRow
                icon="user"
                label="Uploaded by"
                value={doc.uploadedBy}
              />
              <DetailRow
                icon="calendar"
                label="Upload date"
                value={formatDate(doc.uploadedAt)}
              />
              <DetailRow
                icon="hard-drive"
                label="File size"
                value={`${doc.fileSizeMB} MB`}
              />
            </View>
          </View>
        </View>

        {/* ── Bottom buttons ── */}
        <View style={styles.bottomButtons}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleOpenDocument}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Open Document</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={handleShare}
            activeOpacity={0.85}
          >
            <Feather name="share-2" size={16} color={SgateColors.t2} />
            <Text style={styles.secondaryBtnText}>Share</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: SgateColors.bg,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SgateColors.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
    flex: 1,
    marginLeft: 12,
  },
  headerShareBtn: {
    marginRight: 12,
  },
  // Scroll / layout
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 8,
  },
  centerArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  // Main card
  mainCard: {
    backgroundColor: SgateColors.card,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SgateColors.borderSoft,
  },
  largeIconBubble: {
    width: 88,
    height: 88,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileTypePill: {
    marginTop: 12,
    backgroundColor: SgateColors.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  fileTypeText: {
    fontSize: 12,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t2,
    letterSpacing: 1.2,
  },
  docName: {
    fontSize: 17,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 24,
  },
  categoryBadge: {
    backgroundColor: SgateColors.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 8,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t2,
  },
  divider: {
    width: 60,
    height: 1,
    backgroundColor: SgateColors.borderSoft,
    marginVertical: 20,
  },
  detailRows: {
    width: '100%',
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    marginRight: 10,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t3,
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    fontFamily: SgateFonts.medium,
    color: SgateColors.t1,
  },
  // Bottom buttons
  bottomButtons: {
    paddingHorizontal: 16,
    paddingBottom: 0,
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: SgateColors.black,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 15,
    fontFamily: SgateFonts.bold,
    color: SgateColors.card,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: SgateColors.border,
    gap: 8,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
  },
  // Not found
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  notFoundText: {
    fontSize: 16,
    fontFamily: SgateFonts.medium,
    color: SgateColors.t2,
  },
  backLink: {
    marginTop: 4,
  },
  backLinkText: {
    fontSize: 14,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.gold,
  },
});
