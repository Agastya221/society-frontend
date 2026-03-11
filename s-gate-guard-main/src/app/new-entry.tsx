import { addGatePass } from '@/data/mockGatePasses';
import { GatePassType } from '@/types/gatePass';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Animated,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';

const VISITOR_TYPES: GatePassType[] = ['Guest', 'Delivery', 'Worker', 'Cab'];

const TYPE_COLORS = {
  Guest: '#3B82F6',
  Delivery: '#F59E0B',
  Worker: '#8B5CF6',
  Cab: '#10B981',
};

const TYPE_ICONS = {
  Guest: 'person',
  Delivery: 'cube',
  Worker: 'construct',
  Cab: 'car',
};

export default function NewEntryScreen() {
  const router = useRouter();
  
  const [type, setType] = useState<GatePassType>('Guest');
  const [name, setName] = useState('');
  const [flat, setFlat] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleSubmit = () => {
    if (!name.trim() || !flat.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    setTimeout(() => {
      addGatePass({
        id: Date.now().toString(),
        type,
        title: name,
        description: notes || `${type} Entry`,
        requestedBy: 'Guard ME',
        flatNumber: flat,
        status: 'Pending',
        source: 'GUARD',
        createdAt: new Date().toISOString(),
      });
      
      setSubmitting(false);
      router.back();
    }, 800);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }}
        >
          {/* Visitor Type Selection */}
          <Text style={styles.sectionLabel}>VISITOR TYPE</Text>
          <View style={styles.typeGrid}>
            {VISITOR_TYPES.map((t) => (
              <Pressable
                key={t}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setType(t);
                }}
                style={({ pressed }) => [
                  styles.typeCard,
                  type === t && styles.typeCardActive,
                  type === t && { borderColor: TYPE_COLORS[t] },
                  pressed && styles.typeCardPressed,
                ]}
              >
                <View style={[
                  styles.typeIcon,
                  { backgroundColor: TYPE_COLORS[t] + '18' }
                ]}>
                  <Ionicons 
                    name={TYPE_ICONS[t] as any} 
                    size={24} 
                    color={type === t ? TYPE_COLORS[t] : '#6B7280'} 
                  />
                </View>
                <Text style={[
                  styles.typeLabel,
                  type === t && { color: TYPE_COLORS[t], fontWeight: '800' }
                ]}>
                  {t}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Form Section */}
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Visitor Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. John Doe, Uber Driver"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Flat Number</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 101, 402"
                placeholderTextColor="#9CA3AF"
                value={flat}
                onChangeText={setFlat}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Additional details..."
                placeholderTextColor="#9CA3AF"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Photo Placeholder */}
          <Pressable 
            style={({ pressed }) => [
              styles.photoCard,
              pressed && styles.photoCardPressed
            ]}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
          >
            <View style={styles.photoIcon}>
              <Ionicons name="camera" size={32} color="#6B7280" />
            </View>
            <Text style={styles.photoText}>Take Visitor Photo</Text>
            <Text style={styles.photoSubtext}>Optional</Text>
          </Pressable>

          {/* Submit Button */}
          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={({ pressed }) => [
              styles.submitButton,
              submitting && styles.submitButtonDisabled,
              pressed && !submitting && styles.submitButtonPressed
            ]}
          >
            {submitting ? (
              <Text style={styles.submitButtonText}>Submitting...</Text>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="white" />
                <Text style={styles.submitButtonText}>Submit Entry Request</Text>
              </>
            )}
          </Pressable>

        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 1.5,
    marginBottom: 14,
    marginLeft: 4,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  typeCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F3F4F6',
    ...Platform.select({
      ios: {
        shadowColor: '#1F2937',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  typeCardActive: {
    borderWidth: 2.5,
    backgroundColor: '#FAFBFC',
  },
  typeCardPressed: {
    transform: [{ scale: 0.96 }],
  },
  typeIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    letterSpacing: -0.2,
  },
  formCard: {
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
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    fontWeight: '500',
  },
  textArea: {
    height: 100,
    paddingTop: 16,
  },
  photoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    ...Platform.select({
      ios: {
        shadowColor: '#1F2937',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  photoCardPressed: {
    backgroundColor: '#FAFBFC',
    transform: [{ scale: 0.98 }],
  },
  photoIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  photoText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  photoSubtext: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  submitButtonPressed: {
    backgroundColor: '#2563EB',
    transform: [{ scale: 0.97 }],
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginLeft: 8,
  },
});
