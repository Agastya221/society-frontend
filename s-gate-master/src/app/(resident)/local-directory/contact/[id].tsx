import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Clipboard, Linking, ScrollView, Share, StyleSheet,
  Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { SgateColors, SgateFonts } from "../../../../constants/Sgate-theme";
import api from "../../../../services/api";
import { AppAlert } from '../../../../components/ui/AppAlert';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Contact {
  id: string;
  name: string;
  category: string;
  phone: string;
  isVerified: boolean;
  rating?: number;
  totalReviews?: number;
  likes: number;
  isLikedByMe: boolean;
  addedBy: { name: string; initials: string; role?: string };
  timeAgo: string;
}

function toInitials(name?: string): string {
  if (!name) return '??';
  return name.trim().split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function normalise(raw: any): Contact {
  const addedBy = raw.addedBy ?? {};
  return {
    id:         raw.id,
    name:       raw.name ?? '',
    category:   raw.category ?? '',
    phone:      raw.phone ?? '',
    isVerified: raw.isVerified ?? false,
    rating:     raw.rating ?? undefined,
    totalReviews: raw.totalReviews ?? 0,
    likes:       raw.likesCount ?? raw.likes ?? 0,
    isLikedByMe: raw.isLikedByMe ?? false,
    addedBy: {
      name:     addedBy.name ?? 'Unknown',
      initials: addedBy.initials ?? toInitials(addedBy.name),
      role:     addedBy.role,
    },
    timeAgo: raw.createdAt ? timeAgo(raw.createdAt) : (raw.timeAgo ?? ''),
  };
}

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function ContactProfile() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    const fetch = async () => {
      try {
        const res = await api.get(`/resident/local-directory/${id}`);
        setContact(normalise(res.data?.data ?? res.data));
      } catch (err) {
        console.error('Failed to fetch contact:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]));

  const handleLike = async () => {
    if (!contact) return;
    setContact(c => c ? { ...c, isLikedByMe: !c.isLikedByMe, likes: c.isLikedByMe ? c.likes - 1 : c.likes + 1 } : null);
    try {
      await api.post(`/resident/local-directory/${id}/like`);
    } catch {
      setContact(c => c ? { ...c, isLikedByMe: !c.isLikedByMe, likes: c.isLikedByMe ? c.likes - 1 : c.likes + 1 } : null);
    }
  };

  const handleCall = () => contact && Linking.openURL("tel:" + contact.phone.replace(/\s/g, ""));
  const handleCopy = () => {
    if (!contact) return;
    Clipboard.setString(contact.phone);
    AppAlert.show("Copied", "Phone number copied to clipboard");
  };
  const handleShare = async () => {
    if (!contact) return;
    await Share.share({ message: `${contact.name} (${contact.category})\nPhone: ${contact.phone}\nShared from S-Gate Local Directory` });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}><Feather name="arrow-left" size={22} color={SgateColors.t1} /></TouchableOpacity>
          <Text style={styles.headerTitle}>Profile Details</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.center}><ActivityIndicator size="large" color={SgateColors.gold} /></View>
      </SafeAreaView>
    );
  }

  if (!contact) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}><Feather name="arrow-left" size={22} color={SgateColors.t1} /></TouchableOpacity>
          <Text style={styles.headerTitle}>Profile Details</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.center}><Text style={styles.emptyTitle}>Contact not found</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={SgateColors.t1} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Details</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.profileTop}>
            <View style={styles.bigIconCircle}><Feather name="tool" size={32} color={SgateColors.t2} /></View>
            <Text style={styles.profileName}>{contact.name}</Text>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{contact.category}</Text>
            </View>
            {contact.isVerified && (
              <View style={styles.verifiedPill}>
                <Feather name="check-circle" size={12} color={SgateColors.green} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
            {contact.rating !== undefined && (
              <View style={styles.ratingRow}>
                <Feather name="star" size={14} color={SgateColors.goldDeep} />
                <Text style={styles.ratingText}>{contact.rating.toFixed(1)} ({contact.totalReviews} reviews)</Text>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Feather name="phone" size={16} color={SgateColors.t3} />
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{contact.phone}</Text>
            <TouchableOpacity onPress={handleCopy}><Feather name="copy" size={16} color={SgateColors.t3} /></TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Feather name="user" size={16} color={SgateColors.t3} />
            <Text style={styles.infoLabel}>Added by</Text>
            <View style={styles.addedByRow}>
              <View style={styles.initialsCircle}>
                <Text style={styles.initialsText}>{contact.addedBy.initials}</Text>
              </View>
              <Text style={styles.infoValue}>{contact.addedBy.name}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Feather name="clock" size={16} color={SgateColors.t3} />
            <Text style={styles.infoLabel}>Added</Text>
            <Text style={styles.infoValue}>{contact.timeAgo}</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
            <Feather name="thumbs-up" size={18} color={contact.isLikedByMe ? SgateColors.goldDeep : SgateColors.t2} />
            <Text style={styles.actionCount}>{contact.likes}</Text>
            <Text style={styles.actionLabel}>Helpful</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
            <Feather name="share-2" size={18} color={SgateColors.t2} />
            <Text style={styles.actionLabel}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.callBtn]} onPress={handleCall}>
            <Feather name="phone" size={18} color="#fff" />
            <Text style={[styles.actionLabel, { color: "#fff" }]}>Call</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SgateColors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, backgroundColor: SgateColors.card, borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft },
  headerTitle: { fontSize: 17, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
  content: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: SgateColors.card, borderRadius: 20, borderWidth: 1, borderColor: SgateColors.borderSoft, padding: 20, marginBottom: 16 },
  profileTop: { alignItems: "center", paddingBottom: 20 },
  bigIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: SgateColors.surface, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  profileName: { fontSize: 20, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginBottom: 8 },
  categoryPill: { backgroundColor: SgateColors.goldPale, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 6 },
  categoryPillText: { fontSize: 12, fontFamily: SgateFonts.medium, color: SgateColors.goldDeep },
  verifiedPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: SgateColors.greenBg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 6 },
  verifiedText: { fontSize: 11, fontFamily: SgateFonts.semibold, color: SgateColors.green },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingText: { fontSize: 12, fontFamily: SgateFonts.medium, color: SgateColors.t2 },
  divider: { height: 1, backgroundColor: SgateColors.borderSoft, marginVertical: 12 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoLabel: { fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.t3, width: 70 },
  infoValue: { flex: 1, fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t1 },
  addedByRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  initialsCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: SgateColors.goldPale, alignItems: "center", justifyContent: "center" },
  initialsText: { fontSize: 10, fontFamily: SgateFonts.bold, color: SgateColors.goldDeep },
  actionsRow: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: SgateColors.card, borderRadius: 16, borderWidth: 1, borderColor: SgateColors.borderSoft, paddingVertical: 14, gap: 4 },
  callBtn: { backgroundColor: SgateColors.green, borderColor: SgateColors.green },
  actionCount: { fontSize: 14, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
  actionLabel: { fontSize: 12, fontFamily: SgateFonts.medium, color: SgateColors.t2 },
  emptyTitle: { fontSize: 16, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },
});
