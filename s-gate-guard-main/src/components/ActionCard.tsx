import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface ActionCardProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  color?: string; // Icon text color class, e.g. 'text-blue-600'
  bg?: string;    // Background color class, e.g. 'bg-blue-50'
  borderColor?: string;
  badge?: number;
  fullWidth?: boolean;
}

export function ActionCard({ 
  title, 
  icon, 
  onPress, 
  color = 'text-gray-700 dark:text-gray-200', 
  bg = 'bg-white dark:bg-gray-800', 
  borderColor = 'border-gray-200 dark:border-gray-700',
  badge,
  fullWidth = false 
}: ActionCardProps) {
  
  return (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={onPress}
      className={`
        ${fullWidth ? 'w-full flex-row items-center px-6 py-5' : 'w-[47%] p-5 flex-col items-center justify-center h-40'}
        rounded-2xl shadow-sm border ${bg} ${borderColor}
      `}
    >
      {/* Icon Wrapper */}
      <View className={`
        ${fullWidth ? 'mr-4' : 'mb-3'} 
        p-3 rounded-xl bg-opacity-20 
        ${color.includes('red') ? 'bg-red-100 dark:bg-red-900' : 
          color.includes('blue') ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700'}
      `}>
        <Ionicons name={icon} size={fullWidth ? 28 : 32} className={color} style={{ color: color.includes('red') ? '#DC2626' : color.includes('blue') ? '#2563EB' : '#374151' }} /> 
        {/* Note: NativeWind text color might not apply to Icon directly depending on version, redundant style prop ensures color */}
      </View>

      {/* Title */}
      <View className="flex-1">
        <Text className={`font-bold text-gray-800 dark:text-gray-100 ${fullWidth ? 'text-lg' : 'text-center text-base leading-5'}`}>
          {title}
        </Text>
        {fullWidth && color.includes('red') && (
           <Text className="text-red-500 text-xs mt-0.5">Tap to Report Incident</Text>
        )}
      </View>

      {/* Badge or Arrow */}
      {fullWidth ? (
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      ) : (
        badge && badge > 0 ? (
          <View className="absolute top-3 right-3 bg-red-500 rounded-full w-6 h-6 items-center justify-center border border-white dark:border-gray-800">
            <Text className="text-white text-xs font-bold">{badge}</Text>
          </View>
        ) : null
      )}
    </TouchableOpacity>
  );
}
