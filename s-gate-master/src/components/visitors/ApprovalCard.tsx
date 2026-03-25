import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import { Avatar } from '@/components/ui/Avatar';
type VisitorType = 'Service' | 'Delivery' | 'Guest' | 'Cab' | string;

interface ApprovalCardProps {
  name: string;
  type: VisitorType;
  time: string;
  gate?: string;
  /** Explicit initials override (e.g. "JD"). Falls back to deriving from name. */
  initials?: string;
  /** Solid background color for avatar bubble. When set, avatarColor is the text color. */
  avatarBg?: string;
  avatarColor?: string;
  onApprove: () => void;
  onDeny: () => void;
}

export function ApprovalCard({
  name,
  type,
  time,
  gate = 'Gate A',
  initials,
  avatarBg,
  avatarColor,
  onApprove,
  onDeny,
}: ApprovalCardProps) {
  // When avatarBg is provided, pass it as `color` — SgateAvatar will use it
  // as the solid bg (12%-opacity tint mode). avatarColor becomes the text color.
  const avatarName = initials ? `${initials[0]} ${initials[1] ?? ''}`.trim() : name;

  return (
    <View style={styles.card}>
      {/* Top row: avatar + info + pill */}
      <View style={styles.topRow}>
        <Avatar name={avatarName} size={44} color={avatarBg ?? avatarColor} />

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.meta}>
            {gate} · {time}
          </Text>
        </View>

        <View style={styles.pillWrap}>
          <View style={styles.typePill}>
            <Text style={styles.typePillText}>{type}</Text>
          </View>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.denyBtn} onPress={onDeny} activeOpacity={0.75}>
          <Feather name="x" size={14} color={SgateColors.t2} />
          <Text style={styles.denyText}>Deny</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.approveBtn} onPress={onApprove} activeOpacity={0.8}>
          <Feather name="check" size={14} color={SgateColors.gold} />
          <Text style={styles.approveText}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SgateColors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: SgateColors.borderSoft,
    padding: 16,
    gap: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
  },
  meta: {
    marginTop: 3,
    fontSize: 13,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t3,
  },
  pillWrap: {
    alignSelf: 'flex-start',
  },
  typePill: {
    backgroundColor: SgateColors.goldPale,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  typePillText: {
    fontSize: 11,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.goldDeep,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  denyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: SgateColors.surface,
    borderRadius: 14,
    paddingVertical: 11,
  },
  denyText: {
    fontSize: 13,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t2,
  },
  approveBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: SgateColors.black,
    borderRadius: 14,
    paddingVertical: 11,
  },
  approveText: {
    fontSize: 13,
    fontFamily: SgateFonts.semibold,
    color: '#FFFFFF',
  },
});
