import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Alert, Clipboard, Linking, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LOCAL_CONTACTS } from "../../../../mocks/localDirectory";

const SgateColors = { black: "#0D0F14", gold: "#FFB800", goldDeep: "#E5A500", goldPale: "#FFF8E1", green: "#00D68F", greenBg: "#E5FBF3", bg: "#F5F4F0", card: "#FFFFFF", surface: "#EEECEA", border: "#E5E3DE", borderSoft: "#F0EEEB", t1: "#0D0F14", t2: "#4A4D57", t3: "#8A8D97", t4: "#B5B8C0" };
const SgateFonts = { regular: "Sora-Regular", medium: "Sora-Medium", semiBold: "Sora-SemiBold", bold: "Sora-Bold", extraBold: "Sora-ExtraBold" };

export default function ContactProfile() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const contact = LOCAL_CONTACTS.find(c => c.id === id);

  if (!contact) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}><Feather name="arrow-left" size={22} color={SgateColors.t1} /></TouchableOpacity>
          <Text style={styles.headerTitle}>Profile Details</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.emptyWrap}><Text style={styles.emptyTitle}>Contact not found</Text></View>
      </SafeAreaView>
    );
  }

  const handleCall = () => Linking.openURL("tel:" + contact.phone.replace(/\s/g, ""));
  const handleCopy = () => { Clipboard.setString(contact.phone); Alert.alert("Copied", "Phone number copied to clipboard"); };
  const handleShare = async () => { await Share.share({ message: contact.name + " (" + contact.category + ")\nPhone: " + contact.phone + "\nShared from S-Gate Local Directory" }); };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={SgateColors.t1} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Details</Text>
        <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="more-vertical" size={22} color={SgateColors.t2} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.profileTop}>
            <View style={styles.bigIconCircle}><Feather name="tool" size={32} color={SgateColors.t2} /></View>
            <Text style={styles.profileName}>{contact.name}</Text>
            <View style={styles.categoryPill}><Text style={styles.categoryPillText}>{contact.category}</Text></View>
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
              <View style={styles.initialsCircle}><Text style={styles.initialsText}>{contact.addedBy.initials}</Text></View>
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
          <TouchableOpacity style={styles.actionBtn}>
            <Feather name="thumbs-up" size={18} color={SgateColors.t2} />
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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, backgroundColor: SgateColors.card, borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft },
  headerTitle: { fontSize: 17, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
  content: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: SgateColors.card, borderRadius: 20, borderWidth: 1, borderColor: SgateColors.borderSoft, padding: 20, marginBottom: 16 },
  profileTop: { alignItems: "center", paddingBottom: 20 },
  bigIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: SgateColors.surface, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  profileName: { fontSize: 20, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginBottom: 8 },
  categoryPill: { backgroundColor: SgateColors.goldPale, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  categoryPillText: { fontSize: 12, fontFamily: SgateFonts.medium, color: SgateColors.goldDeep },
  divider: { height: 1, backgroundColor: SgateColors.borderSoft, marginVertical: 12 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoLabel: { fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.t3, width: 70 },
  infoValue: { flex: 1, fontSize: 14, fontFamily: SgateFonts.semiBold, color: SgateColors.t1 },
  addedByRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  initialsCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: SgateColors.goldPale, alignItems: "center", justifyContent: "center" },
  initialsText: { fontSize: 10, fontFamily: SgateFonts.bold, color: SgateColors.goldDeep },
  actionsRow: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: SgateColors.card, borderRadius: 16, borderWidth: 1, borderColor: SgateColors.borderSoft, paddingVertical: 14, gap: 4 },
  callBtn: { backgroundColor: SgateColors.green, borderColor: SgateColors.green },
  actionCount: { fontSize: 14, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
  actionLabel: { fontSize: 12, fontFamily: SgateFonts.medium, color: SgateColors.t2 },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 16, fontFamily: SgateFonts.semiBold, color: SgateColors.t2 },
});
