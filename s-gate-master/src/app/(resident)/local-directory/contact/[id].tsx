import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Clipboard, Linking, ScrollView, Share, StyleSheet,
  Text, TouchableOpacity, View } from 'react-native';
import { AppLoader } from '@/components/ui/AppLoader';
import { SgateColors, SgateFonts } from "../../../../constants/Sgate-theme";
import { ScreenHeader } from "../../../../components/ui/ScreenHeader";
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

function getCategoryIcon(name: string): { icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string; bg: string } {
  const lower = name.toLowerCase();
  if (lower.includes('plumber')) return { icon: 'pipe-wrench', color: SgateColors.blue, bg: SgateColors.blueBg };
  if (lower.includes('electrician')) return { icon: 'lightning-bolt', color: SgateColors.orange, bg: SgateColors.orangeBg };
  if (lower.includes('carpenter')) return { icon: 'hammer-screwdriver', color: SgateColors.goldDeep, bg: SgateColors.goldPale };
  if (lower.includes('painter')) return { icon: 'format-paint', color: SgateColors.violet, bg: SgateColors.violetBg };
  if (lower.includes('cleaner')) return { icon: 'broom', color: SgateColors.blue, bg: SgateColors.blueBg };
  if (lower.includes('gardener')) return { icon: 'leaf', color: SgateColors.green, bg: SgateColors.greenBg };
  if (lower.includes('pest')) return { icon: 'bug', color: SgateColors.red, bg: SgateColors.redBg };
  if (lower.includes('security')) return { icon: 'shield-account', color: SgateColors.t2, bg: SgateColors.surface };
  if (lower.includes('medical') || lower.includes('doctor')) return { icon: 'hospital-box', color: SgateColors.red, bg: SgateColors.redBg };
  return { icon: 'briefcase', color: SgateColors.t2, bg: SgateColors.surface };
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
      <View style={styles.root}>
        <ScreenHeader title="Details" />
        <AppLoader />
      </View>
    );
  }

  if (!contact) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Details" />
        <View style={styles.center}><Text style={styles.emptyTitle}>Contact not found</Text></View>
      </View>
    );
  }

  const catStyle = getCategoryIcon(contact.category);
  const displayName = contact.name.charAt(0).toUpperCase() + contact.name.slice(1).toLowerCase();

  return (
    <View style={styles.root}>
      <ScreenHeader title="Details" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* HEADER SECTION - NO CARD */}
        <View style={styles.headerSection}>
          <View style={[styles.avatarCircle, { backgroundColor: catStyle.bg }]}>
            <MaterialCommunityIcons name={catStyle.icon} size={48} color={catStyle.color} />
          </View>
          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.categorySubText}>{contact.category.toUpperCase()}</Text>
          {contact.isVerified && (
            <View style={styles.verifiedRow}>
              <Feather name="check-circle" size={14} color={SgateColors.green} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>

        {/* QUICK ACTIONS ROW */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity style={styles.quickActionBtn} onPress={handleCall} activeOpacity={0.7}>
            <View style={[styles.quickActionIconWrap, { backgroundColor: SgateColors.green }]}>
              <Feather name="phone" size={20} color={SgateColors.card} />
            </View>
            <Text style={[styles.quickActionLabel, { color: SgateColors.green }]}>Call</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionBtn} onPress={handleShare} activeOpacity={0.7}>
            <View style={styles.quickActionIconWrap}>
              <Feather name="share-2" size={20} color={SgateColors.blue} />
            </View>
            <Text style={[styles.quickActionLabel, { color: SgateColors.blue }]}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionBtn} onPress={handleLike} activeOpacity={0.7}>
            <View style={styles.quickActionIconWrap}>
              <Feather name="thumbs-up" size={20} color={contact.isLikedByMe ? SgateColors.goldDeep : SgateColors.t2} />
            </View>
            <Text style={[styles.quickActionLabel, { color: contact.isLikedByMe ? SgateColors.goldDeep : SgateColors.t2 }]}>Helpful</Text>
          </TouchableOpacity>
        </View>

        {/* DETAILS CARD */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>mobile</Text>
            <Text style={styles.detailValueBlue}>{contact.phone}</Text>
            <TouchableOpacity onPress={handleCopy} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Feather name="copy" size={18} color={SgateColors.t3} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.separator} />
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>added by</Text>
            <View style={styles.addedByWrap}>
              <View style={styles.initialsSmall}>
                <Text style={styles.initialsSmallText}>{contact.addedBy.initials}</Text>
              </View>
              <Text style={styles.detailValue}>{contact.addedBy.name}</Text>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.detailRow}>
             <Text style={styles.detailLabel}>added</Text>
             <Text style={styles.detailValue}>{contact.timeAgo}</Text>
          </View>
        </View>
        
        <View style={styles.detailsCard}>
           <View style={[styles.detailRow, { paddingVertical: 16 }]}>
             <Text style={styles.detailLabel}>helpful</Text>
             <Text style={styles.detailValue}>{contact.likes} residents found this helpful</Text>
           </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SgateColors.bg }, // iOS typical light gray background
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingVertical: 32, paddingHorizontal: 16 },
  
  headerSection: { alignItems: 'center', marginBottom: 28 },
  avatarCircle: { 
    width: 96, 
    height: 96, 
    borderRadius: 48, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  profileName: { fontSize: 26, fontFamily: SgateFonts.medium, color: SgateColors.t1, marginBottom: 4 },
  categorySubText: { fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.t2, letterSpacing: 0.5, marginBottom: 8 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.green },
  
  quickActionsRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: 32 },
  quickActionBtn: { alignItems: 'center', gap: 8, width: 80 },
  quickActionIconWrap: { 
    width: 46, 
    height: 46, 
    borderRadius: 23, 
    backgroundColor: SgateColors.card, 
    alignItems: 'center', 
    justifyContent: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.04, 
    shadowRadius: 8, 
    elevation: 1 
  },
  quickActionLabel: { fontSize: 12, fontFamily: SgateFonts.medium },

  detailsCard: { 
    backgroundColor: SgateColors.card, 
    borderRadius: 16, 
    paddingLeft: 16, 
    marginBottom: 20 
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingRight: 16 },
  detailLabel: { width: 80, fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t1 }, 
  detailValue: { flex: 1, fontSize: 15, fontFamily: SgateFonts.regular, color: SgateColors.t1 },
  detailValueBlue: { flex: 1, fontSize: 16, fontFamily: SgateFonts.medium, color: SgateColors.blue }, // iOS phone links are blue
  
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: SgateColors.border, marginLeft: 80 }, 
  
  addedByWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  initialsSmall: { width: 22, height: 22, borderRadius: 11, backgroundColor: SgateColors.surface, alignItems: 'center', justifyContent: 'center' },
  initialsSmallText: { fontSize: 9, fontFamily: SgateFonts.bold, color: SgateColors.t2 },
  
  emptyTitle: { fontSize: 16, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },
});
