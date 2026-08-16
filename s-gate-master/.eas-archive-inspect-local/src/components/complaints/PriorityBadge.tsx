import { Text, View, StyleSheet } from 'react-native';
import { ComplaintUrgency } from '../../services/complaints';
import { SgateFonts } from '../../constants/Sgate-theme';

interface PriorityBadgeProps {
    priority: ComplaintUrgency;
}

const CFG: Record<string, { bg: string; text: string }> = {
    LOW:      { bg: '#E6F7ED', text: '#1F9D55' },
    MEDIUM:   { bg: '#FFF6D6', text: '#E5A500' },
    HIGH:     { bg: '#FFE5E5', text: '#D92D20' },
    CRITICAL: { bg: '#FFE5E5', text: '#D92D20' },
};

export function PriorityBadge({ priority }: PriorityBadgeProps) {
    const c = CFG[priority] ?? CFG.MEDIUM;
    return (
        <View style={[S.badge, { backgroundColor: c.bg }]}>
            <Text style={[S.text, { color: c.text }]}>{priority} PRIORITY</Text>
        </View>
    );
}

const S = StyleSheet.create({
    badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
    text: { fontSize: 10, fontFamily: SgateFonts.bold, letterSpacing: 0.5 },
});
