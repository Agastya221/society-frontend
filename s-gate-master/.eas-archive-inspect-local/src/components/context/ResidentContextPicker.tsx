import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import type { ResidentContext, ResidentContextRequest } from '@/services/profile.service';

const BRAND_YELLOW = '#FFD60A';
const BRAND_YELLOW_BG = '#FFFBE6';

interface ResidentContextPickerProps {
    visible: boolean;
    contexts: ResidentContext[];
    requests?: ResidentContextRequest[];
    activeContext: ResidentContext | null;
    isLoading: boolean;
    switchingContextId: string | null;
    onClose: () => void;
    onRefresh: () => void;
    onSwitch: (context: ResidentContext) => void;
    onRequestPress?: (request: ResidentContextRequest) => void;
    onAddAnother: () => void;
    variant?: 'dropdown' | 'sheet';
    topOffset?: number;
    title?: string;
    subtitle?: string;
}

function contextMeta(context: ResidentContext): string {
    if (context.role === 'ADMIN' || context.role === 'SUPER_ADMIN') return 'Society admin';
    if (context.residentType === 'TENANT') return 'Tenant';
    if (context.residentType === 'OWNER' && context.isLivingHere === false) return 'Non-residing owner';
    if (context.residentType === 'OWNER') return 'Owner - Living here';
    return context.role;
}

function roleIcon(context: ResidentContext) {
    return context.role === 'ADMIN' || context.role === 'SUPER_ADMIN'
        ? 'shield-home'
        : 'home-city-outline';
}

function requestStatusMeta(status: string) {
    switch (status) {
        case 'PENDING_APPROVAL':
            return { label: 'Pending approval', color: '#996300', bg: BRAND_YELLOW_BG };
        case 'RESUBMIT_REQUESTED':
            return { label: 'Needs resubmit', color: SgateColors.red, bg: SgateColors.redBg };
        case 'REJECTED':
            return { label: 'Rejected', color: SgateColors.red, bg: SgateColors.redBg };
        case 'DRAFT':
        case 'PENDING_DOCS':
            return { label: 'Incomplete', color: SgateColors.t3, bg: SgateColors.surface };
        default:
            return { label: status.replace(/_/g, ' ').toLowerCase(), color: SgateColors.t3, bg: SgateColors.surface };
    }
}

function requestMeta(request: ResidentContextRequest): string {
    const type = request.residentType === 'TENANT'
        ? 'Tenant'
        : request.isLivingHere === false
            ? 'Non-residing owner'
            : 'Owner - Living here';
    return `${type} request`;
}

export function ResidentContextPicker({
    visible,
    contexts,
    requests = [],
    activeContext,
    isLoading,
    switchingContextId,
    onClose,
    onRefresh,
    onSwitch,
    onRequestPress,
    onAddAnother,
    variant = 'sheet',
    topOffset = 96,
    title = 'Your Homes',
    subtitle = 'Switch society, flat, or role',
}: ResidentContextPickerProps) {
    const isDropdown = variant === 'dropdown';

    return (
        <Modal
            visible={visible}
            transparent
            animationType={isDropdown ? 'fade' : 'slide'}
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <View style={[S.root, isDropdown ? S.dropdownRoot : S.sheetRoot]}>
                <Pressable style={S.backdrop} onPress={onClose} />
                <View
                    style={[
                        S.panel,
                        isDropdown ? [S.dropdownPanel, { top: topOffset }] : S.sheetPanel,
                    ]}
                >
                    {!isDropdown && <View style={S.handle} />}

                    <View style={S.header}>
                        <View style={S.headerText}>
                            <Text style={S.title}>{title}</Text>
                            <Text style={S.subtitle}>{subtitle}</Text>
                        </View>
                        <TouchableOpacity style={S.iconBtn} onPress={onRefresh} disabled={isLoading}>
                            {isLoading ? (
                                <ActivityIndicator size="small" color={SgateColors.t3} />
                            ) : (
                                <MaterialCommunityIcons name="refresh" size={18} color={SgateColors.t2} />
                            )}
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={S.list}
                        contentContainerStyle={S.listContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {contexts.length === 0 && requests.length === 0 && !isLoading ? (
                            <View style={S.empty}>
                                <MaterialCommunityIcons name="home-search-outline" size={26} color={SgateColors.t4} />
                                <Text style={S.emptyText}>No approved homes found yet</Text>
                            </View>
                        ) : (
                            contexts.map((context) => {
                                const active =
                                    activeContext?.membershipId === context.membershipId ||
                                    context.isActiveContext;
                                const switching = switchingContextId === context.membershipId;

                                return (
                                    <TouchableOpacity
                                        key={context.membershipId}
                                        style={[S.contextRow, active && S.contextRowActive]}
                                        activeOpacity={0.75}
                                        disabled={switching || isLoading}
                                        onPress={() => onSwitch(context)}
                                    >
                                        <View style={[S.homeIcon, active && S.homeIconActive]}>
                                            <MaterialCommunityIcons
                                                name={roleIcon(context)}
                                                size={22}
                                                color={active ? SgateColors.gold : SgateColors.t3}
                                            />
                                        </View>
                                        <View style={S.contextInfo}>
                                            <Text style={S.contextLabel} numberOfLines={1}>{context.label}</Text>
                                            <Text style={S.contextSociety} numberOfLines={1}>{context.societyName}</Text>
                                            <Text style={S.contextMeta} numberOfLines={1}>{contextMeta(context)}</Text>
                                        </View>
                                        {switching ? (
                                            <ActivityIndicator size="small" color={SgateColors.gold} />
                                        ) : active ? (
                                            <View style={S.activeCheck}>
                                                <MaterialCommunityIcons name="check" size={14} color={SgateColors.t1} />
                                            </View>
                                        ) : (
                                            <MaterialCommunityIcons name="chevron-right" size={20} color={SgateColors.t4} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })
                        )}

                        {requests.map((request) => {
                            const meta = requestStatusMeta(request.status);

                            return (
                                <TouchableOpacity
                                    key={request.requestId}
                                    style={[S.contextRow, S.requestRow]}
                                    activeOpacity={0.75}
                                    onPress={() => onRequestPress?.(request)}
                                    disabled={!onRequestPress}
                                >
                                    <View style={S.homeIcon}>
                                        <MaterialCommunityIcons
                                            name="clock-outline"
                                            size={22}
                                            color={meta.color}
                                        />
                                    </View>
                                    <View style={S.contextInfo}>
                                        <Text style={S.contextLabel} numberOfLines={1}>{request.label}</Text>
                                        <Text style={S.contextSociety} numberOfLines={1}>{request.societyName}</Text>
                                        <Text style={S.contextMeta} numberOfLines={1}>{requestMeta(request)}</Text>
                                    </View>
                                    <View style={[S.statusBadge, { backgroundColor: meta.bg }]}>
                                        <Text style={[S.statusText, { color: meta.color }]} numberOfLines={1}>
                                            {meta.label}
                                        </Text>
                                    </View>
                                    <MaterialCommunityIcons name="chevron-right" size={18} color={SgateColors.t4} />
                                </TouchableOpacity>
                            );
                        })}

                        <TouchableOpacity style={S.addRow} activeOpacity={0.75} onPress={onAddAnother}>
                            <View style={S.addIcon}>
                                <MaterialCommunityIcons name="plus" size={20} color={SgateColors.t1} />
                            </View>
                            <View style={S.contextInfo}>
                                <Text style={S.addTitle}>Add Flat/Villa/Office</Text>
                                <Text style={S.addSubtitle}>Join another approved society or flat</Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={20} color={SgateColors.t4} />
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const S = StyleSheet.create({
    root: {
        flex: 1,
    },
    dropdownRoot: {
        justifyContent: 'flex-start',
    },
    sheetRoot: {
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(13,15,20,0.32)',
    },
    panel: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
    },
    dropdownPanel: {
        position: 'absolute',
        left: 20,
        right: 20,
        maxHeight: 430,
        borderRadius: 22,
        paddingTop: 16,
        paddingBottom: 16,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.14,
        shadowRadius: 24,
        elevation: 10,
    },
    sheetPanel: {
        maxHeight: '78%',
        borderTopLeftRadius: 26,
        borderTopRightRadius: 26,
        paddingTop: 10,
        paddingBottom: 22,
    },
    handle: {
        width: 42,
        height: 4,
        borderRadius: 2,
        backgroundColor: SgateColors.border,
        alignSelf: 'center',
        marginBottom: 18,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    headerText: {
        flex: 1,
        minWidth: 0,
    },
    title: {
        fontSize: 19,
        fontFamily: SgateFonts.extrabold,
        color: SgateColors.t1,
    },
    subtitle: {
        marginTop: 3,
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },
    iconBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: SgateColors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
    },
    list: {
        flexGrow: 0,
    },
    listContent: {
        paddingBottom: 8,
        gap: 10,
    },
    contextRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        backgroundColor: '#FFFFFF',
    },
    contextRowActive: {
        borderColor: '#FFE39A',
        backgroundColor: BRAND_YELLOW_BG,
    },
    requestRow: {
        opacity: 0.96,
    },
    homeIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: SgateColors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    homeIconActive: {
        backgroundColor: '#FFFFFF',
    },
    contextInfo: {
        flex: 1,
        minWidth: 0,
    },
    contextLabel: {
        fontSize: 14,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
    },
    contextSociety: {
        marginTop: 2,
        fontSize: 12,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t2,
    },
    contextMeta: {
        marginTop: 2,
        fontSize: 11,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },
    activeCheck: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: BRAND_YELLOW,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusBadge: {
        maxWidth: 116,
        borderRadius: 999,
        paddingHorizontal: 9,
        paddingVertical: 5,
    },
    statusText: {
        fontSize: 10,
        fontFamily: SgateFonts.semibold,
        textTransform: 'capitalize',
    },
    addRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: 18,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: SgateColors.border,
        backgroundColor: '#FAFAFA',
    },
    addIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: BRAND_YELLOW,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addTitle: {
        fontSize: 14,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
    },
    addSubtitle: {
        marginTop: 2,
        fontSize: 11,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },
    empty: {
        alignItems: 'center',
        gap: 8,
        paddingVertical: 22,
    },
    emptyText: {
        fontSize: 12,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t3,
    },
});
