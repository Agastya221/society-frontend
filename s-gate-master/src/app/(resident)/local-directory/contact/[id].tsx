import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Clipboard, Linking, ScrollView, Share, StyleSheet,
  Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
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
  if (lower.includes('plumber')) return { icon: 'pipe-wrench', color: '#3B82F6', bg: '#EFF6FF' };
  if (lower.includes('electrician')) return { icon: 'lightning-bolt', color: '#F97316', bg: '#FFF7ED' };
  if (lower.includes('carpenter')) return { icon: 'hammer-screwdriver', color: '#D97706', bg: '#FEF3C7' };
  if (lower.includes('painter')) return { icon: 'format-paint', color: '#A855F7', bg: '#FAF5FF' };
  if (lower.includes('cleaner')) return { icon: 'broom', color: '#14B8A6', bg: '#F0FDFA' };
  if (lower.includes('gardener')) return { icon: 'leaf', color: '#22C55E', bg: '#F0FDF4' };
  if (lower.includes('pest')) return { icon: 'bug', color: '#EF4444', bg: '#FEF2F2' };
  if (lower.includes('security')) return { icon: 'shield-account', color: '#4B5563', bg: '#F3F4F6' };
  if (lower.includes('medical') || lower.includes('doctor')) return { icon: 'hospital-box', color: '#EF4444', bg: '#FEF2F2' };
  return { icon: 'briefcase', color: '#6B7280', bg: '#E5E7EB' };
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
        <View style={styles.center}><ActivityIndicator size="large" color={SgateColors.gold} /></View>
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
              <Feather name="check-circle" size={14} color="#10B981" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>

        {/* QUICK ACTIONS ROW */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity style={styles.quickActionBtn} onPress={handleCall} activeOpacity={0.7}>
            <View style={[styles.quickActionIconWrap, { backgroundColor: '#10B981' }]}>
              <Feather name="phone" size={20} color="#FFFFFF" />
            </View>
            <Text style={[styles.quickActionLabel, { color: '#10B981' }]}>Call</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionBtn} onPress={handleShare} activeOpacity={0.7}>
            <View style={styles.quickActionIconWrap}>
              <Feather name="share-2" size={20} color="#3B82F6" />
            </View>
            <Text style={[styles.quickActionLabel, { color: '#3B82F6' }]}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionBtn} onPress={handleLike} activeOpacity={0.7}>
            <View style={styles.quickActionIconWrap}>
              <Feather name="thumbs-up" size={20} color={contact.isLikedByMe ? '#F59E0B' : '#6B7280'} />
            </View>
            <Text style={[styles.quickActionLabel, { color: contact.isLikedByMe ? '#F59E0B' : '#6B7280' }]}>Helpful</Text>
          </TouchableOpacity>
        </View>

        {/* DETAILS CARD */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>mobile</Text>
            <Text style={styles.detailValueBlue}>{contact.phone}</Text>
            <TouchableOpacity onPress={handleCopy} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Feather name="copy" size={18} color="#9CA3AF" />
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
  root: { flex: 1, backgroundColor: '#F2F2F7' }, // iOS typical light gray background
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
  profileName: { fontSize: 26, fontFamily: SgateFonts.medium, color: '#111827', marginBottom: 4 },
  categorySubText: { fontSize: 13, fontFamily: SgateFonts.medium, color: '#6B7280', letterSpacing: 0.5, marginBottom: 8 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { fontSize: 13, fontFamily: SgateFonts.medium, color: '#10B981' },
  
  quickActionsRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: 32 },
  quickActionBtn: { alignItems: 'center', gap: 8, width: 80 },
  quickActionIconWrap: { 
    width: 46, 
    height: 46, 
    borderRadius: 23, 
    backgroundColor: '#FFFFFF', 
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
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    paddingLeft: 16, 
    marginBottom: 20 
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingRight: 16 },
  detailLabel: { width: 80, fontSize: 14, fontFamily: SgateFonts.regular, color: '#111827' }, 
  detailValue: { flex: 1, fontSize: 15, fontFamily: SgateFonts.regular, color: '#111827' },
  detailValueBlue: { flex: 1, fontSize: 16, fontFamily: SgateFonts.medium, color: '#3B82F6' }, // iOS phone links are blue
  
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(0,0,0,0.1)', marginLeft: 80 }, 
  
  addedByWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  initialsSmall: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  initialsSmallText: { fontSize: 9, fontFamily: SgateFonts.bold, color: '#6B7280' },
  
  emptyTitle: { fontSize: 16, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },
});
