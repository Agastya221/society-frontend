import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { MainLayout } from '../layouts/MainLayout';
import { Ionicons } from '@expo/vector-icons';

export function ProfileScreen() {
  return (
    <MainLayout
      headerProps={{
        variant: 'rapido',
        title: 'Profile'
      }}
      backgroundColor="#F4F5F7"
    >
      <View className="px-4 pt-6 pb-10">
        
        {/* Main Avatar Card */}
        <View className="bg-white rounded-[32px] p-6 items-center shadow-sm mb-6" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 3 }}>
          <View className="relative mb-4">
            <View className="w-[100px] h-[100px] rounded-full border-[3px] border-[#F9C900] bg-gray-100 items-center justify-center">
               <Ionicons name="person" size={40} color="#9CA3AF" />
            </View>
            <TouchableOpacity className="absolute bottom-0 right-0 w-8 h-8 bg-black rounded-full items-center justify-center border-2 border-white">
              <Ionicons name="pencil" size={16} color="#F9C900" />
            </TouchableOpacity>
          </View>
          
          <Text className="text-[26px] font-bold text-[#1A1A1A] mb-1">Javed Mia</Text>
          <Text className="text-[14px] font-medium text-[#6B7280] mb-4">Greenfield Heights • Unit 402</Text>
          
          <View className="bg-[#FFF8D6] px-4 py-2 rounded-full flex-row items-center">
            <Ionicons name="checkmark-circle" size={16} color="#000" className="mr-1.5" />
            <Text className="ml-1.5 text-black text-[12px] font-bold tracking-wider">PREMIUM RESIDENT</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View className="flex-row justify-between mb-8">
          <StatBox value="00" label="VISITORS" color="#1A1A1A" />
          <StatBox value="00" label="DELIVERIES" color="#1A1A1A" />
          <StatBox value="00" label="ALERTS" color="#E11D48" />
        </View>

        {/* Preferences Section */}
        <Text className="text-[12px] font-bold text-[#9CA3AF] tracking-widest mb-4 ml-2">PREFERENCES</Text>
        
        <PreferenceItem 
          icon="person-outline" 
          title="Account Info" 
          subtitle="Personal details and unit access" 
        />
        <PreferenceItem 
          icon="shield-checkmark-outline" 
          title="Security Settings" 
          subtitle="Passwords and biometrics" 
        />

      </View>
    </MainLayout>
  );
}

function StatBox({ value, label, color }: { value: string, label: string, color: string }) {
  return (
    <View 
      className="bg-white flex-1 mx-1.5 rounded-[24px] py-6 px-2 items-center justify-center shadow-sm" 
      style={{ shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 1 }}
    >
      <Text className="text-[32px] font-bold mb-1" style={{ color }}>{value}</Text>
      <Text className="text-[11px] font-bold text-[#6B7280] tracking-wider">{label}</Text>
    </View>
  );
}

function PreferenceItem({ icon, title, subtitle }: { icon: any, title: string, subtitle: string }) {
  return (
    <TouchableOpacity className="bg-white flex-row items-center p-5 rounded-[24px] mb-3 shadow-sm active:bg-gray-50" style={{ shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 1 }}>
      <View className="w-12 h-12 rounded-full bg-[#FFF8D6] items-center justify-center mr-4">
        <Ionicons name={icon} size={22} color="#1A1A1A" />
      </View>
      <View className="flex-1 justify-center">
        <Text className="text-[16px] font-bold text-[#1A1A1A] mb-0.5">{title}</Text>
        <Text className="text-[13px] text-[#6B7280]">{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );
}
