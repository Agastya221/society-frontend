import { GatePassStatus } from '@/types/gatePass';
import React from 'react';
import { Text, View } from 'react-native';

interface StatusBadgeProps {
  status: GatePassStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  let bgClass = 'bg-gray-100';
  let textClass = 'text-gray-800';

  switch (status) {
    case 'Pending':
      bgClass = 'bg-yellow-100';
      textClass = 'text-yellow-800';
      break;
    case 'Approved':
      bgClass = 'bg-green-100';
      textClass = 'text-green-800';
      break;
    case 'Rejected':
      bgClass = 'bg-red-100';
      textClass = 'text-red-800';
      break;
  }

  return (
    <View className={`px-2 py-1 rounded-full ${bgClass} self-start`}>
      <Text className={`text-xs font-medium ${textClass}`}>
        {status.toUpperCase()}
      </Text>
    </View>
  );
}
