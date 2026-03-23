import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
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

function mockDownload(doc: SocietyDocument): void {
  Alert.alert('Downloading...', `${doc.name} is being downloaded.`, [{ text: 'OK' }]);
  setTimeout(() => {
    Alert.alert('Downloaded', `${doc.name} downloaded successfully.`);
  }, 1500);
}

// ─── File icon bubble ────────────────────────────────────────────────────────

function FileIconBubble({
  fileType,
  size = 44,
}: {
  fileType: SocietyDocument['fileType'];
  size?: number;
}) {
  const radius = Math.round(size * 0.27);
  const iconSize = Math.round(size * 0.45);

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
      style={[
        styles.iconBubble,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: bgColor,
        },
      ]}
    >
      <Feather name={iconName} size={iconSize} color={iconColor} />
    </View>
  );
}

// ─── Doc Card ────────────────────────────────────────────────────────────────

function AdminDocCard({
  doc,
  index,
}: {
  doc: SocietyDocument;
  index: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).springify()}
      style={styles.docCard}
    >
      <FileIconBubble fileType={doc.fileType} size={44} />

      <View style={styles.docContent}>
        <Text style={styles.docName} numberOfLines={1}>
          {doc.name}
        </Text>
        <View style={styles.docMeta}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              {CATEGORY_LABELS[doc.category]}
            </Text>
          </View>
          <Text style={styles.sizeText}>{doc.fileSizeMB} MB</Text>
        </View>
        <Text style={styles.dateText}>{formatDate(doc.uploadedAt)}</Text>
      </View>

      <TouchableOpacity
        onPress={() => mockDownload(doc)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="download" size={20} color={SgateColors.t3} />
      </TouchableOpacity>
    </Animated.View>
  );
}

function MyDocCard({
  doc,
  index,
  onDelete,
}: {
  doc: SocietyDocument;
  index: number;
  onDelete: (id: string) => void;
}) {
  const handleDelete = () => {
    Alert.alert('Delete Document', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onDelete(doc.id),
      },
    ]);
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).springify()}
      style={styles.docCard}
    >
      <FileIconBubble fileType={doc.fileType} size={44} />

      <View style={styles.docContent}>
        <Text style={styles.docName} numberOfLines={1}>
          {doc.name}
        </Text>
        <View style={styles.docMeta}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              {CATEGORY_LABELS[doc.category]}
            </Text>
          </View>
          <Text style={styles.sizeText}>{doc.fileSizeMB} MB</Text>
        </View>
        <Text style={styles.dateText}>{formatDate(doc.uploadedAt)}</Text>
      </View>

      <View style={styles.myDocActions}>
        <TouchableOpacity
          onPress={() => mockDownload(doc)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="download" size={18} color={SgateColors.t3} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.deleteBtn}
        >
          <Feather name="trash-2" size={18} color={SgateColors.red} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function DocumentsScreen() {
  const router = useRouter();
  const adminDocs = DOCUMENTS.filter((d) => d.isAdminDoc);
  const [myDocs, setMyDocs] = useState<SocietyDocument[]>(
    DOCUMENTS.filter((d) => !d.isAdminDoc),
  );

  const handleDelete = (id: string) => {
    setMyDocs((ds) => ds.filter((d) => d.id !== id));
  };

  const handleUpload = () => {
    Alert.alert(
      'Upload Document',
      'Camera and gallery upload coming soon.',
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={22} color={SgateColors.t1} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Documents</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Society Documents Section ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Society Documents</Text>
          <Text style={styles.sectionSubtitle}>
            Uploaded by RWA administration
          </Text>
        </View>

        {adminDocs.map((doc, index) => (
          <AdminDocCard key={doc.id} doc={doc} index={index} />
        ))}

        {/* ── My Documents Section ── */}
        <View style={[styles.sectionHeader, styles.sectionHeaderMy]}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, styles.flex1]}>
              My Documents
            </Text>
            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={handleUpload}
            >
              <Feather name="upload" size={16} color={SgateColors.t2} />
              <Text style={styles.uploadBtnText}>Upload</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionSubtitle}>
            Your personal documents
          </Text>
        </View>

        {myDocs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="folder" size={32} color={SgateColors.t4} />
            <Text style={styles.emptyText}>No documents uploaded</Text>
          </View>
        ) : (
          myDocs.map((doc, index) => (
            <MyDocCard
              key={doc.id}
              doc={doc}
              index={index}
              onDelete={handleDelete}
            />
          ))
        )}
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
    borderBottomWidth: 1,
    borderBottomColor: SgateColors.borderSoft,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
    flex: 1,
    marginLeft: 12,
  },
  headerSpacer: {
    width: 22,
  },
  // Scroll
  scrollContent: {
    paddingBottom: 32,
  },
  // Section headers
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionHeaderMy: {
    paddingTop: 24,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t3,
    marginTop: 2,
  },
  flex1: {
    flex: 1,
  },
  // Upload button
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  uploadBtnText: {
    fontSize: 12,
    fontFamily: SgateFonts.medium,
    color: SgateColors.t2,
  },
  // Doc Card
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SgateColors.card,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: SgateColors.borderSoft,
    gap: 12,
  },
  iconBubble: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  docContent: {
    flex: 1,
  },
  docName: {
    fontSize: 14,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
  },
  docMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  categoryBadge: {
    backgroundColor: SgateColors.surface,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryText: {
    fontSize: 10,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t2,
  },
  sizeText: {
    fontSize: 11,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t3,
  },
  dateText: {
    fontSize: 11,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t4,
    marginTop: 2,
  },
  // My doc action icons
  myDocActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteBtn: {
    marginLeft: 2,
  },
  // Empty state
  emptyCard: {
    backgroundColor: SgateColors.card,
    borderRadius: 14,
    marginHorizontal: 16,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: SgateFonts.medium,
    color: SgateColors.t2,
    marginTop: 8,
  },
});
