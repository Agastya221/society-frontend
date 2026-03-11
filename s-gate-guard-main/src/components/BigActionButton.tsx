import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface BigActionButtonProps {
  title: string;
  iconName: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
  count?: number;
}

export function BigActionButton({ title, iconName, color, onPress, count }: BigActionButtonProps) {
  return (
    <TouchableOpacity 
      activeOpacity={0.8}
      onPress={onPress}
      className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex-1 min-w-[45%] m-2 items-center justify-center h-40"
    >
      <View className={`p-4 rounded-full mb-3 ${color} bg-opacity-10`}>
        <Ionicons name={iconName} size={32} color={color.replace('bg-', 'text-').replace('-100', '-600')} />
      </View>
      <Text className="text-gray-900 dark:text-white font-bold text-lg text-center leading-5">{title}</Text>
      {count !== undefined && count > 0 && (
        <View className="absolute top-2 right-2 bg-red-500 rounded-full w-6 h-6 items-center justify-center">
          <Text className="text-white text-xs font-bold">{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
