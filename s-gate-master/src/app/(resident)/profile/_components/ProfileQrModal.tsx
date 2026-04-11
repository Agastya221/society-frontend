import React from 'react';
import { Image, Modal, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Feather, Ionicons } from '@expo/vector-icons';
import type { User } from '../../../../types/api';

interface ProfileQrModalProps {
    visible: boolean;
    onClose: () => void;
    user: User;
}

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatGateId(id: string): string {
    const clean = id.replace(/-/g, '').slice(-6);
    return clean.slice(0, 3) + ' ' + clean.slice(3);
}

export function ProfileQrModal({ visible, onClose, user }: ProfileQrModalProps) {
    if (!user) return null;

    const name = user.name || 'Resident';
    const initials = getInitials(name);
    const gateId = formatGateId(user.id);
    const hasPhoto = !!user.photoUrl;

    const flatInfo = user.flat ? `${user.flat.number}, ${user.flat.block?.name || 'Block'}` : 'Flat Details Pending';
    const roleMap: Record<string, string> = {
        OWNER: 'Residing Owner',
        TENANT: 'Residing Tenant',
        FAMILY_MEMBER: 'Family Member',
    };
    const displayRole = roleMap[user.role] || user.role || 'Resident';

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black/60 justify-center items-center px-6">
                {/* Click outside to close */}
                <TouchableOpacity 
                    className="absolute inset-0" 
                    activeOpacity={1} 
                    onPress={onClose} 
                />

                <View className="w-full bg-[#F3F4F6] rounded-[24px] items-center pt-14 pb-8 px-6 shadow-xl relative top-5">
                    
                    {/* Close Button top right */}
                    <TouchableOpacity 
                        className="absolute top-4 right-4 p-2 bg-white rounded-full z-10" 
                        onPress={onClose}
                        activeOpacity={0.7}
                    >
                        <Feather name="x" size={20} color="#374151" />
                    </TouchableOpacity>

                    {/* Elevated Avatar overlapping top edge */}
                    <View className="absolute -top-12 z-20 w-24 h-24 rounded-full border-[4px] border-[#F3F4F6] shadow-lg bg-blue-500 items-center justify-center overflow-hidden">
                        {hasPhoto ? (
                            <Image source={{ uri: user.photoUrl! }} className="w-full h-full" />
                        ) : (
                            <Text className="text-3xl font-medium text-white">{initials}</Text>
                        )}
                    </View>

                    {/* Resident Info */}
                    <Text className="text-xl font-bold text-gray-900 mt-2">{name}</Text>
                    
                    <View className="flex-row items-center mt-2">
                        <Ionicons name="business" size={14} color="#6b7280" className="mr-1.5" />
                        <Text className="text-[15px] font-medium text-gray-600">{flatInfo}</Text>
                    </View>
                    
                    <View className="flex-row items-center mt-1">
                        <Ionicons name="home" size={14} color="#6b7280" className="mr-1.5" />
                        <Text className="text-[15px] font-medium text-gray-600">{displayRole}</Text>
                    </View>

                    {/* QR Code */}
                    <View className="bg-white p-4 rounded-3xl my-6 shadow-sm">
                        <QRCode
                            value={user.id}
                            size={180}
                            color="#000000"
                            backgroundColor="#ffffff"
                        />
                    </View>

                    {/* Resident ID Badge */}
                    <View className="bg-[#FFF8ED] rounded-full px-5 py-2.5 flex-row items-center mb-2">
                        <Text className="text-[#B45309] text-[13px] font-medium tracking-widest mr-2">RESIDENT ID</Text>
                        <Text className="text-gray-900 text-[15px] font-bold tracking-widest">{gateId}</Text>
                    </View>

                </View>
            </View>
        </Modal>
    );
}
