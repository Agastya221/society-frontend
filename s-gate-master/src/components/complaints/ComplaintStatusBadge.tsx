import { Text, View, StyleSheet } from 'react-native';
import { ComplaintStatus } from '../../services/complaints';
import { SgateFonts } from '../../constants/Sgate-theme';

interface ComplaintStatusBadgeProps {
    status: ComplaintStatus;
}

const CFG: Record<string, { bg: string; text: string }> = {
    OPEN:        { bg: '#EAF2FF', text: '#2F6FED' },
    IN_PROGRESS: { bg: '#FFF6D6', text: '#E5A500' },
    RESOLVED:    { bg: '#E6F7ED', text: '#1F9D55' },
    CLOSED:      { bg: '#F2F2F2', text: '#777777' },
};

export function ComplaintStatusBadge({ status }: ComplaintStatusBadgeProps) {
    const c = CFG[status] ?? CFG.OPEN;
    return (
        <View style={[S.badge, { backgroundColor: c.bg }]}>
            <Text style={[S.text, { color: c.text }]}>{status.replace('_', ' ')}</Text>
        </View>
    );
}

const S = StyleSheet.create({
    badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
    text: { fontSize: 10, fontFamily: SgateFonts.bold, letterSpacing: 0.5 },
});
