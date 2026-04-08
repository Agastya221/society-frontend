import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export type AppHeaderVariant = 'default' | 'profile' | 'transparent' | 'rapido';

export interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  rightIcon?: React.ReactNode;
  variant?: AppHeaderVariant;
  onLayoutHeight?: (height: number) => void;
  avatarUrl?: string; // specific for some variants like rapido
}

export function AppHeader({
  title,
  subtitle,
  showBackButton = false,
  rightIcon,
  variant = 'default',
  onLayoutHeight,
  avatarUrl
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const [headerHeight, setHeaderHeight] = useState(0);

  const paddingTop = Platform.OS === 'android' ? Math.max(insets.top, 30) : Math.max(insets.top, 20);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const isProfile = variant === 'profile';
  const isTransparent = variant === 'transparent';
  const isRapido = variant === 'rapido';

  // Base classes for the container
  let containerClasses = "absolute top-0 left-0 right-0 z-50 w-full";
  
  if (isProfile) {
    containerClasses += " bg-white rounded-b-[24px]";
  } else if (isRapido) {
    containerClasses += " bg-[#F9C900]"; // Rapido Yellow
  } else if (!isTransparent) {
    containerClasses += " bg-[#F5F7FA]";
  }

  return (
    <View 
      className={containerClasses}
      style={{
        paddingTop: paddingTop,
        shadowColor: isProfile || isRapido ? '#000' : 'transparent',
        shadowOffset: { width: 0, height: isRapido ? 2 : 4 },
        shadowOpacity: isProfile ? 0.05 : (isRapido ? 0.05 : 0),
        shadowRadius: isRapido ? 4 : 12,
        elevation: isProfile || isRapido ? 3 : 0,
      }}
      onLayout={(e) => {
        const height = e.nativeEvent.layout.height;
        if (height !== headerHeight) {
          setHeaderHeight(height);
          onLayoutHeight?.(height);
        }
      }}
    >
      {/* Default and Transparent Variant Content */}
      {(!isProfile && !isRapido) && (
        <View className="flex-row items-center justify-between px-4 pb-4 pt-2 min-h-[60px]">
          <View className="flex-row items-center flex-1">
            {showBackButton && (
              <TouchableOpacity onPress={handleBack} className="mr-3 w-10 h-10 items-center justify-center rounded-full bg-black/5 active:bg-black/10">
                <Ionicons name="chevron-back" size={24} color="#111827" />
              </TouchableOpacity>
            )}
            <View className="flex-1 justify-center">
              {title && (
                <Text className="text-[20px] font-bold text-[#111827] mb-0.5" numberOfLines={1}>
                  {title}
                </Text>
              )}
              {subtitle && (
                <Text className="text-[14px] text-[#6B7280]" numberOfLines={1}>
                  {subtitle}
                </Text>
              )}
            </View>
          </View>
          {rightIcon && (
            <View className="ml-3">
              {rightIcon}
            </View>
          )}
        </View>
      )}

      {/* Profile Variant Content */}
      {isProfile && (
        <View className="px-5 pb-6 pt-3 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <View className="w-[64px] h-[64px] rounded-full bg-emerald-100 items-center justify-center mr-4 border-2 border-emerald-50">
               <Image 
                 source={{ uri: avatarUrl }}
                 className="w-full h-full rounded-full"
               />
            </View>
            <View className="flex-1 justify-center">
              <Text className="text-[24px] font-bold text-[#111827] mb-1" numberOfLines={1}>
                {title || 'User Name'}
              </Text>
              <View className="flex-row items-center">
                <View className="bg-emerald-100/80 px-2 py-0.5 rounded-md mr-2">
                  <Text className="text-[#10B981] text-[12px] font-bold">Premium Resident</Text>
                </View>
                {subtitle && (
                  <Text className="text-[14px] font-medium text-[#6B7280] flex-1" numberOfLines={1}>
                    {subtitle}
                  </Text>
                )}
              </View>
            </View>
          </View>
          <TouchableOpacity className="w-10 h-10 items-center justify-center rounded-full bg-gray-50 border border-gray-100 active:bg-gray-200">
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
      )}

      {/* Rapido Variant Content */}
      {isRapido && (
        <View className="flex-row items-center justify-between px-4 pb-4 pt-2 min-h-[60px]">
          <View className="flex-row items-center flex-1">
            <View className="w-10 h-10 rounded-full mr-3 bg-black/10 items-center justify-center overflow-hidden border border-black/5">
              {avatarUrl ? (
                 <Image 
                   source={{ uri: avatarUrl }}
                   className="w-full h-full"
                 />
              ) : (
                 <Ionicons name="person" size={20} color="#1A1A1A" opacity={0.5} />
              )}
            </View>
            <Text className="text-[20px] font-bold text-[#1A1A1A] mb-0.5" numberOfLines={1}>
              {title}
            </Text>
          </View>
          
          {rightIcon ? (
            <View className="ml-3">
              {rightIcon}
            </View>
          ) : (
            <TouchableOpacity className="p-2 relative">
              <Ionicons name="notifications-outline" size={24} color="#1A1A1A" />
              <View className="w-2.5 h-2.5 rounded-full bg-red-500 absolute top-2 right-2 border-[1.5px] border-[#F9C900]" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
