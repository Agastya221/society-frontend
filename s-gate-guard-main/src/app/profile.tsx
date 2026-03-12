import api from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Animated,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';

interface GuardProfile {
    name: string;
    id: string;
    phone: string;
    email: string;
    gate: string;
    shift: string;
    status: string;
    joinDate: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const { user, logout } = useAuthStore();
  const [profile, setProfile] = useState<GuardProfile>({
    name: user?.name ?? 'Guard',
    id: user?.id ?? '—',
    phone: user?.phone ?? '—',
    email: user?.email ?? '—',
    gate: 'Not Assigned',
    shift: 'Not Assigned',
    status: 'ACTIVE',
    joinDate: '—',
  });

  React.useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  // Fetch latest profile from API
  useEffect(() => {
    api.get('/api/v1/auth/guard-app/profile')
      .then((res) => {
        const u = res.data?.data?.user ?? res.data?.data;
        if (!u) return;
        setProfile({
          name: u.name ?? profile.name,
          id: u.id ?? profile.id,
          phone: u.phone ?? profile.phone,
          email: u.email ?? profile.email,
          gate: u.gate ?? u.assignedGate ?? 'Not Assigned',
          shift: u.shift ?? u.shiftTiming ?? 'Not Assigned',
          status: u.isActive ? 'ACTIVE' : 'INACTIVE',
          joinDate: u.createdAt
            ? new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            : '—',
        });
      })
      .catch(() => {}); // Falls back to store data silently
  }, []);

  const guard = profile;

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            // Navigation will be handled by _layout.tsx
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={48} color="#3B82F6" />
              </View>
              <View style={styles.statusIndicator}>
                <View style={styles.statusDot} />
              </View>
            </View>
            
            <Text style={styles.guardName}>{guard.name}</Text>
            <Text style={styles.guardId}>{guard.id}</Text>
            
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{guard.status}</Text>
            </View>
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.sectionLabel}>ASSIGNMENT DETAILS</Text>
            
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="location" size={20} color="#3B82F6" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Assigned Gate</Text>
                <Text style={styles.infoValue}>{guard.gate}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="time" size={20} color="#3B82F6" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Shift Timing</Text>
                <Text style={styles.infoValue}>{guard.shift}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="mail" size={20} color="#3B82F6" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email Address</Text>
                <Text style={styles.infoValue}>{guard.email}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="call" size={20} color="#3B82F6" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Contact Number</Text>
                <Text style={styles.infoValue}>{guard.phone}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="calendar" size={20} color="#3B82F6" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Joined On</Text>
                <Text style={styles.infoValue}>{guard.joinDate}</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionButtonPressed,
            ]}
          >
            <Ionicons name="settings-outline" size={22} color="#374151" />
            <Text style={styles.actionButtonText}>App Settings</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionButtonPressed,
            ]}
          >
            <Ionicons name="help-circle-outline" size={22} color="#374151" />
            <Text style={styles.actionButtonText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </Pressable>

          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && styles.logoutButtonPressed,
            ]}
          >
            <Ionicons name="log-out-outline" size={22} color="#DC2626" />
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </Pressable>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#1F2937',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 4,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
  },
  guardName: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1F2937',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  guardId: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 12,
  },
  statusBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 1,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...Platform.select({
      ios: {
        shadowColor: '#1F2937',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -0.2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 16,
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionButtonPressed: {
    backgroundColor: '#F9FAFB',
    transform: [{ scale: 0.98 }],
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  logoutButton: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
  },
  logoutButtonPressed: {
    backgroundColor: '#FEE2E2',
    transform: [{ scale: 0.98 }],
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#DC2626',
  },
});
