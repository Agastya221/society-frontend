import { getGatePasses } from '@/data/mockGatePasses';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Pressable,
    ScrollView,
    StatusBar,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '../components/GlassCard';

const AnimatedPressable = Animated.createAnimatedComponent(TouchableOpacity);

type ActionCardProps = {
  title: string;
  icon: any;
  color: string;
  onPress: () => void;
  badge?: number;
  wide?: boolean;
  delay?: number;
};

function ActionCard({ title, icon, color, onPress, badge, wide = false, delay = 0 }: ActionCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(0.96);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <AnimatedPressable
      entering={FadeInDown.delay(delay).springify()}
      style={[animatedStyle, { width: wide ? '100%' : '48%', marginBottom: 16 }]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
    >
      <GlassCard 
        className={wide ? "flex-row items-center p-5 gap-4 min-h-[80px]" : "p-5 min-h-[152px]"}
      >
        <View 
          className={wide ? "h-14 w-14 rounded-2xl items-center justify-center" : "h-14 w-14 rounded-2xl items-center justify-center mb-4"}
          style={{ backgroundColor: color + '18' }}
        >
          <Ionicons name={icon} size={wide ? 24 : 28} color={color} />
        </View>
        
        <View className="flex-1">
          <Text className="text-base font-extrabold text-slate-900 tracking-tight leading-5">
            {title}
          </Text>
          {wide && title === 'Emergencies' && (
            <Text className="text-xs font-bold mt-1" style={{ color }}>Tap to Report Incident</Text>
          )}
        </View>

        {!wide && badge !== undefined && badge > 0 ? (
          <View className="absolute top-3 right-3 bg-red-500 min-w-[26px] h-[26px] rounded-full items-center justify-center px-2 border-2 border-white shadow-lg">
            <Text className="text-white text-xs font-black">{badge}</Text>
          </View>
        ) : null}

        {wide ? <Ionicons name="chevron-forward" size={20} color="#9CA3AF" /> : null}
      </GlassCard>
    </AnimatedPressable>
  );
}

export default function GuardDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const passes = getGatePasses();
    setPendingCount(passes.filter(p => p.status === 'Pending').length);
  }, []);

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      {/* Gradient Background */}
      <LinearGradient
        colors={['#f8fafc', '#f1f5f9', '#e2e8f0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />
      
      {/* Ambient Background Glows */}
      <View className="absolute top-0 left-0 w-full h-[500px] overflow-hidden pointer-events-none">
        <View className="absolute -top-[100px] -right-[100px] w-[400px] h-[400px] bg-blue-200/40 rounded-full blur-3xl opacity-60" />
        <View className="absolute top-[100px] -left-[50px] w-[300px] h-[300px] bg-indigo-200/40 rounded-full blur-3xl opacity-50" />
      </View>

      {/* Header */}
      <Animated.View 
        entering={FadeInDown.delay(100).springify()}
        className="bg-transparent px-5 pb-5 pt-3"
        style={{ paddingTop: insets.top + 12 }}
      >
        <View className="flex-row justify-between items-start mb-5">
          <View>
            <Text className="text-[10px] font-extrabold text-blue-600 tracking-widest mb-1.5">GUARD DASHBOARD</Text>
            <Text className="text-4xl font-black text-slate-900 tracking-tight mb-0.5">Gate A</Text>
            <Text className="text-base font-semibold text-slate-600">Main Entrance</Text>
          </View>
          
          <View className="bg-slate-100 px-4 py-2 rounded-full flex-row items-center border border-slate-200">
            <View className="w-2 h-2 rounded-full bg-green-500 mr-2" />
            <Text className="text-[10px] font-extrabold text-slate-700 tracking-wide">SHIFT: DAY</Text>
          </View>
        </View>

        {/* Status Card */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Pressable 
            onPress={() => router.push('/approvals')}
            className="active:opacity-90"
          >
            <GlassCard className={`flex-row items-center p-5 ${pendingCount > 0 ? 'border-l-4 border-l-blue-500 bg-blue-50/50' : 'border-l-4 border-l-green-500 bg-green-50/50'}`}>
              <View className="flex-row items-center flex-1 gap-4">
                <View 
                  className="p-3 rounded-full"
                  style={{ backgroundColor: pendingCount > 0 ? '#DBEAFE' : '#D1FAE5' }}
                >
                  <Ionicons 
                    name={pendingCount > 0 ? "time" : "checkmark-circle"} 
                    size={20} 
                    color={pendingCount > 0 ? "#2563EB" : "#16A34A"} 
                  />
                </View>
                <View>
                  <Text className="text-xl font-extrabold text-blue-900 tracking-tight">
                    {pendingCount > 0 ? pendingCount : 'No'} Pending
                  </Text>
                  <Text className="text-sm font-semibold text-blue-600 mt-0.5">
                    {pendingCount === 1 ? 'Approval Request' : 'Approval Requests'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#60A5FA" />
            </GlassCard>
          </Pressable>
        </Animated.View>
      </Animated.View>

      {/* Main Content */}
      <ScrollView 
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 ml-1">Quick Actions</Text>
        
        <View className="flex-row flex-wrap justify-between">
          <ActionCard 
            title="New Entry" 
            icon="add-circle" 
            color="#2563EB"
            onPress={() => router.push('/new-entry')}
            delay={300}
          />

          <ActionCard 
            title="Today's Entries" 
            icon="list-circle" 
            color="#16A34A"
            onPress={() => router.push('/today-entries')}
            delay={400}
          />

          <ActionCard 
            title="Approvals" 
            icon="time" 
            color="#F59E0B"
            badge={pendingCount}
            onPress={() => router.push('/approvals')}
            delay={500}
          />

          <ActionCard 
            title="Staff Scan" 
            icon="qr-code" 
            color="#8B5CF6"
            onPress={() => router.push('/staff-scan')}
            delay={600}
          />

          <ActionCard 
            title="My Profile" 
            icon="person-circle" 
            color="#06B6D4"
            onPress={() => router.push('/profile')}
            delay={700}
          />

          <ActionCard 
            title="Emergencies" 
            icon="warning" 
            color="#EF4444"
            wide={true}
            onPress={() => router.push('/emergencies')}
            delay={800}
          />
        </View>
      </ScrollView>

      {/* FAB */}
      <Animated.View entering={FadeInDown.delay(900).springify()}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            router.push('/new-entry');
          }}
          activeOpacity={0.85}
          className="absolute bottom-7 right-5 w-[68px] h-[68px] rounded-full bg-blue-600 items-center justify-center shadow-2xl"
          style={{
            shadowColor: '#3B82F6',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.5,
            shadowRadius: 20,
            elevation: 12,
          }}
        >
          <Ionicons name="add" size={32} color="white" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}
