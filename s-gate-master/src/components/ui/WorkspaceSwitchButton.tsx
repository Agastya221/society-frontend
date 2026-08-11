import React from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import { useGateStore } from '@/store/useGateStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { switchResidentContext } from '@/services/profile.service';
import { AppAlert } from '@/components/ui/AppAlert';
import { SgateColors, SgateFonts, SgateRadius } from '@/constants/Sgate-theme';

interface WorkspaceSwitchButtonProps {
  variant?: 'header' | 'profile';
}

export function WorkspaceSwitchButton({ variant = 'header' }: WorkspaceSwitchButtonProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    role,
    userContexts,
    switchingWorkspace,
    setSwitchingWorkspace,
    login,
  } = useAuthStore();

  // Determine active and target roles
  const currentIsAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

  // Filter contexts to see if we have alternative roles
  const residentContexts = userContexts.filter(c => c.role === 'RESIDENT');
  const adminContexts = userContexts.filter(c => c.role === 'ADMIN' || c.role === 'SUPER_ADMIN');

  const hasResident = residentContexts.length > 0;
  const hasAdmin = adminContexts.length > 0;

  // Render nothing if user doesn't have dual role capabilities
  if (!hasResident || !hasAdmin) {
    return null;
  }

  const handleSwitch = async () => {
    // Find target context based on current role
    let targetContext = null;
    if (currentIsAdmin) {
      // Find first Resident context
      targetContext = residentContexts[0];
    } else {
      // Find first Admin context
      targetContext = adminContexts[0];
    }

    if (!targetContext) {
      AppAlert.show(
        'Switch Error',
        `No alternate workspace found for the role: ${currentIsAdmin ? 'RESIDENT' : 'ADMIN'}`
      );
      return;
    }

    setSwitchingWorkspace(true);

    try {
      // 1. Invoke Switch Context API
      const result = await switchResidentContext(targetContext.membershipId);

      // 2. Reset Zustand Stores to clear stale workspace/society/flat data
      useGateStore.getState().reset();
      useProfileStore.getState().reset();
      useNotificationStore.getState().reset();

      // 3. Invalidate workspace-dependent React Query caches (primarily onboarding)
      await queryClient.invalidateQueries({ queryKey: ['onboarding'] });

      // 4. Update Global Auth state with new JWT, User role and Contexts
      await login(
        result.accessToken,
        result.refreshToken,
        result.user,
        result.appType,
        false,
        null,
        result.contexts?.contexts ?? userContexts
      );

      // 5. Navigate to the new workspace root
      const nextIsAdmin = result.user?.role === 'ADMIN' || result.user?.role === 'SUPER_ADMIN';
      const targetRoute = nextIsAdmin ? '/(admin)' : '/(resident)/home';
      router.replace(targetRoute as any);

    } catch (error: any) {
      console.error('Failed to switch workspace:', error);
      AppAlert.show(
        'Workspace Switch Failed',
        error?.response?.data?.message || 'We could not switch your workspace right now. Please verify your internet connection.'
      );
    } finally {
      setSwitchingWorkspace(false);
    }
  };

  const targetRoleLabel = currentIsAdmin ? 'Resident Workspace' : 'Admin Workspace';

  if (variant === 'profile') {
    return (
      <>
        <TouchableOpacity
          style={styles.profileRow}
          activeOpacity={0.7}
          onPress={handleSwitch}
          disabled={switchingWorkspace}
        >
          <View style={styles.profileRowLeft}>
            <View style={styles.profileIconContainer}>
              <MaterialCommunityIcons
                name="account-convert-outline"
                size={22}
                color={SgateColors.goldDeep}
              />
            </View>
            <View>
              <Text style={styles.profileRowTitle}>Switch Workspace</Text>
              <Text style={styles.profileRowSubtitle}>
                Switch to {targetRoleLabel}
              </Text>
            </View>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color={SgateColors.t4}
          />
        </TouchableOpacity>

        {/* Global switching spinner modal */}
        <Modal
          visible={switchingWorkspace}
          transparent
          animationType="fade"
        >
          <View style={styles.spinnerOverlay}>
            <View style={styles.spinnerCard}>
              <ActivityIndicator size="large" color={SgateColors.gold} />
              <Text style={styles.spinnerTitle}>Switching Workspace...</Text>
              <Text style={styles.spinnerSubtitle}>Configuring context environment</Text>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  // Header variant
  return (
    <>
      <TouchableOpacity
        style={styles.headerButton}
        activeOpacity={0.7}
        onPress={handleSwitch}
        disabled={switchingWorkspace}
      >
        <MaterialCommunityIcons
          name={currentIsAdmin ? "home-outline" : "shield-account-outline"}
          size={16}
          color={SgateColors.t1}
          style={styles.headerIcon}
        />
        <Text style={styles.headerButtonText}>
          {currentIsAdmin ? 'Resident View' : 'Admin View'}
        </Text>
      </TouchableOpacity>

      {/* Global switching spinner modal */}
      <Modal
        visible={switchingWorkspace}
        transparent
        animationType="fade"
      >
        <View style={styles.spinnerOverlay}>
          <View style={styles.spinnerCard}>
            <ActivityIndicator size="large" color={SgateColors.gold} />
            <Text style={styles.spinnerTitle}>Switching Workspace...</Text>
            <Text style={styles.spinnerSubtitle}>Configuring context environment</Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  headerIcon: {
    marginRight: 4,
  },
  headerButtonText: {
    fontSize: 12,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: SgateColors.card,
    borderBottomWidth: 1,
    borderBottomColor: SgateColors.borderSoft,
  },
  profileRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  profileIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: SgateColors.goldPale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileRowTitle: {
    fontSize: 14,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
  },
  profileRowSubtitle: {
    fontSize: 12,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t3,
    marginTop: 2,
  },
  spinnerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 15, 20, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerCard: {
    width: 240,
    padding: 24,
    borderRadius: SgateRadius.lg,
    backgroundColor: SgateColors.charcoal,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#2D313E',
  },
  spinnerTitle: {
    fontSize: 15,
    fontFamily: SgateFonts.bold,
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  spinnerSubtitle: {
    fontSize: 11,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t4,
    marginTop: 6,
    textAlign: 'center',
  },
});
