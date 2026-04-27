import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SgateColors, SgateFonts } from '../../../../constants/Sgate-theme';
import type { User } from '../../../../types/api';
import { AppAlert } from '../../../../components/ui/AppAlert';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatGateId(id: string): string {
    // Show last 6 chars separated by space: "201 141"
    const clean = id.replace(/-/g, '').slice(-6);
    return clean.slice(0, 3) + ' ' + clean.slice(3);
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProfileHeaderProps {
    user: User;
    role?: 'resident' | 'admin';
    onEditPress: () => void;
    onQrPress?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProfileHeader({ user, role = 'resident', onEditPress, onQrPress }: ProfileHeaderProps) {
    const isAdmin = role === 'admin';
    const name = user.name || (isAdmin ? 'Admin' : 'Resident');
    const initials = getInitials(name);
    const gateId = formatGateId(user.id);
    const hasPhoto = !!user.photoUrl;

    return (
        <View style={styles.container}>
            {/* Avatar */}
            <TouchableOpacity onPress={onEditPress} activeOpacity={0.8}>
                <View style={styles.avatarWrap}>
                    {hasPhoto ? (
                        <Image source={{ uri: user.photoUrl! }} style={styles.avatarImage} />
                    ) : (
                        <View style={[styles.avatarFallback, isAdmin && styles.avatarFallbackAdmin]}>
                            <Text style={styles.avatarText}>{initials}</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>

            {/* Info */}
            <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>{name}</Text>

                <View style={styles.idRow}>
                    {isAdmin ? (
                        /* ── Admin: Role badge ───────────────────────────── */
                        <View style={styles.adminBadge}>
                            <MaterialCommunityIcons name="shield-check" size={14} color={SgateColors.goldDeep} style={{ marginRight: 4 }} />
                            <Text style={styles.adminBadgeText}>
                                {user.role ? user.role.replace(/_/g, ' ') : 'Admin'}
                            </Text>
                        </View>
                    ) : (
                        /* ── Resident: s-gate ID pill + QR ───────────────── */
                        <>
                            <View style={styles.idPill}>
                                <Text style={styles.idLabel}>s-gate ID </Text>
                                <Text style={styles.idValue}>{gateId}</Text>
                                <TouchableOpacity 
                                    hitSlop={8} 
                                    style={styles.idInfoBtn}
                                    onPress={() => AppAlert.show('About s-gate ID', 'This is your unique residential identifier used by security. Show this to the guards for fast-track entry to the society.')}
                                >
                                    <Feather name="info" size={12} color={SgateColors.t3} />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity onPress={onQrPress} style={styles.qrBtn} activeOpacity={0.7}>
                                <MaterialCommunityIcons name="qrcode-scan" size={20} color={SgateColors.t1} />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
        backgroundColor: SgateColors.card,
    },
    avatarWrap: {
        width: 64,
        height: 64,
        borderRadius: 32,
        marginRight: 16,
    },
    avatarImage: {
        width: 64,
        height: 64,
        borderRadius: 32,
    },
    avatarFallback: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#6B7FAD',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarFallbackAdmin: {
        backgroundColor: SgateColors.gold,
    },
    avatarText: {
        fontSize: 24,
        fontFamily: SgateFonts.bold,
        color: '#FFFFFF',
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 20,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        marginBottom: 8,
    },
    idRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    // ── Resident: s-gate ID pill ──────────────────────────────────────────
    idPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SgateColors.surface,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    idLabel: {
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },
    idValue: {
        fontSize: 13,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        letterSpacing: 1,
    },
    idInfoBtn: {
        marginLeft: 6,
    },
    qrBtn: {
        marginLeft: 12,
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: SgateColors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Admin: Role badge ─────────────────────────────────────────────────
    adminBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SgateColors.goldPale,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    adminBadgeText: {
        fontSize: 12,
        fontFamily: SgateFonts.bold,
        color: SgateColors.goldDeep,
        textTransform: 'uppercase',
    },
});
