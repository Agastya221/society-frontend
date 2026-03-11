import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface DashboardCardProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accentColor?: 'blue' | 'purple' | 'orange' | 'green' | 'red';
  badgeCount?: number;
  isWide?: boolean;
}

export function DashboardCard({ 
  title, 
  icon, 
  onPress, 
  accentColor = 'blue', 
  badgeCount,
  isWide = false
}: DashboardCardProps) {
  
  // Color mapping for more controlled design system
  const colors = {
    blue:   { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', icon: '#2563EB' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', icon: '#9333EA' },
    orange: { bg: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', icon: '#EA580C' },
    green:  { bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', icon: '#16A34A' },
    red:    { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', icon: '#DC2626' },
  };

  const theme = colors[accentColor];

  return (
    <TouchableOpacity 
      onPress={onPress}
      activeOpacity={0.7}
      className={`
        bg-white dark:bg-gray-800 
        rounded-2xl 
        p-4 
        shadow-sm 
        border border-gray-100 dark:border-gray-700
        ${isWide ? 'w-full flex-row items-center mb-4' : 'w-[48%] mb-4 h-36 justify-between'}
      `}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3, // Android shadow
      }}
    >
      {/* Icon Container */}
      <View className={`
        ${theme.bg} 
        rounded-xl 
        items-center justify-center
        ${isWide ? 'w-12 h-12 mr-4' : 'w-12 h-12'}
      `}>
        <Ionicons name={icon} size={24} color={theme.icon} />
      </View>

      {/* Content */}
      <View className="flex-1 justify-center relative">
         <Text className={`
           font-bold text-gray-800 dark:text-gray-100 
           ${isWide ? 'text-lg' : 'text-base mt-2'}
         `}>
           {title}
         </Text>
         
         {isWide && accentColor === 'red' && (
           <Text className="text-red-500 text-xs mt-0.5 font-medium">Tap to Report Incident</Text>
         )}
      </View>

      {/* Badge or Wide Arrow */}
      {isWide ? (
         <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      ) : (
        badgeCount && badgeCount > 0 ? (
          <View className="absolute top-0 right-0 bg-red-500 rounded-full min-w-[24px] h-6 px-1.5 items-center justify-center border-2 border-white dark:border-gray-800">
            <Text className="text-white text-[10px] font-bold">{badgeCount}</Text>
          </View>
        ) : null
      )}

    </TouchableOpacity>
  );
}
