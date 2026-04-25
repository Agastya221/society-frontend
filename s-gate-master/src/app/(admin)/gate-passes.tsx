import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Modal, RefreshControl, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppLoader } from '@/components/ui/AppLoader';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SourceBadge } from '../../components/SourceBadge';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { approveGatePass, GatePass, getAllGatePasses, rejectGatePass } from '../../services/gatePass';

export default function GatePassesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [passes, setPasses] = useState<GatePass[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [rejectId, setRejectId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    const loadPasses = useCallback(async () => {
        try {
            const data = await getAllGatePasses();
            setPasses(data);
        } catch (error) {
            console.error('Failed to load gate passes:', error);
            Alert.alert('Error', 'Failed to load gate passes');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadPasses();
        }, [loadPasses])
    );

    const onRefresh = () => {
        setIsRefreshing(true);
        loadPasses();
    };

    const handleStatusUpdate = async (id: string, status: 'Approved' | 'Rejected') => {
        try {
            if (status === 'Approved') {
                await approveGatePass(id);
                Alert.alert('Success', 'Gate pass approved successfully');
            } else {
                if (!rejectReason.trim()) {
                    Alert.alert('Error', 'Please provide a reason for rejection');
                    return;
                }
                await rejectGatePass(id, rejectReason);
                Alert.alert('Success', 'Gate pass rejected');
            }
            
            // Refresh list
            loadPasses();

            if (status === 'Rejected') {
                setRejectId(null);
                setRejectReason('');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || `Failed to ${status.toLowerCase()} gate pass`);
        }
    };

    const getTypeColor = (type: string) => {
        switch (type.toLowerCase()) {
            case 'guest': return 'text-amber-700 bg-amber-50 border border-amber-100';
            case 'worker': return 'text-blue-700 bg-blue-50 border border-blue-100';
            case 'material': return 'text-purple-700 bg-purple-50 border border-purple-100';
            case 'material_in': return 'text-purple-700 bg-purple-50 border border-purple-100';
            case 'material_out': return 'text-orange-700 bg-orange-50 border border-orange-100';
            default: return 'text-indigo-700 bg-indigo-50 border border-indigo-100';
        }
    };

    const renderHeader = () => (
        <Animated.View 
            entering={FadeInDown.delay(100).springify()} 
            className="flex-row justify-between items-end px-5 pb-4"
            style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                right: 0, 
                zIndex: 10,
                paddingTop: insets.top + 10,
                backgroundColor: '#f8fafc', 
                borderBottomWidth: 1,
                borderBottomColor: '#f1f5f9'
            }}
        >
            <View>
                <Text className="text-3xl font-bold text-slate-900 tracking-tight">Gate Passes</Text>
                <Text className="text-slate-500 font-medium mt-1">Manage entry approvals</Text>
            </View>
        </Animated.View>
    );

    if (isLoading && !isRefreshing) {
        return (
            <AppLoader />
        );
    }

    return (
        <View className="flex-1 bg-slate-50">
             <LinearGradient
                colors={['#f8fafc', '#f1f5f9', '#e2e8f0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
            />
            
            {renderHeader()}
            
            <FlatList
                data={passes}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 20, paddingTop: insets.top + 70 + 20, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#4f46e5" />
                }
                ListEmptyComponent={
                    <View className="items-center justify-center py-20 mt-20">
                        <Feather name="inbox" size={48} color="#cbd5e1" />
                        <Text className="text-slate-400 mt-4 text-center font-medium">No gate passes found</Text>
                    </View>
                }
                renderItem={({ item, index }) => (
                    <Animated.View entering={FadeInDown.delay(200 + (index * 50)).springify()}>
                        <View className="bg-white/80 border border-white/60 mb-4 p-5 rounded-3xl shadow-sm">
                            <View className="flex-row justify-between items-start mb-4">
                                <View className="flex-row gap-2">
                                    <View className={`px-2.5 py-1 rounded-lg self-start ${getTypeColor(item.type)}`}>
                                        <Text className="font-bold text-[10px] uppercase tracking-wide">{item.type.replace('_', ' ')}</Text>
                                    </View>
                                    <SourceBadge source={item.societyId ? "RESIDENT" : "ADMIN"} />
                                </View>
                                <StatusBadge status={item.status} />
                            </View>

                            <View className="mb-5">
                                {item.title ? (
                                    <Text className="text-lg font-bold text-slate-900 mb-1">{item.title}</Text>
                                ) : null}
                                
                                {item.requestedBy && (
                                    <Text className={`font-bold text-slate-900 ${item.title ? 'text-sm' : 'text-xl mb-1'}`}>
                                        {item.requestedBy.name}
                                    </Text>
                                )}
                                
                                <View className="flex-row items-center gap-2 mt-1.5 flex-wrap">
                                    {item.flat ? (
                                        <>
                                            <Feather name="home" size={14} className="text-slate-400" />
                                            <Text className="text-slate-500 text-sm font-medium">
                                                {item.flat.block?.name || ''} {item.flat.flatNumber}
                                            </Text>
                                            <Text className="text-slate-300">•</Text>
                                        </>
                                    ) : null}
                                    <Feather name="clock" size={14} className="text-slate-400" />
                                    <Text className="text-slate-500 text-sm font-medium">
                                        {new Date(item.validFrom).toLocaleDateString()}
                                    </Text>
                                </View>

                                {item.description ? (
                                    <Text className="text-slate-600 text-sm mt-3 bg-slate-50/80 p-3 rounded-xl border border-slate-100 leading-relaxed">
                                        {item.description}
                                    </Text>
                                ) : null}
                            </View>

                            {/* Rejection Reason Display NOTE: Backend might not return rejection reason in list view, adjust if needed */}
                            {item.status === 'REJECTED' && (
                                <View className="mb-4 bg-red-50 p-3 rounded-xl border border-red-100">
                                    <Text className="text-red-800 text-xs font-bold uppercase mb-1">Status</Text>
                                    <Text className="text-red-600 text-sm">Pass has been rejected.</Text>
                                </View>
                            )}

                            {item.status === 'PENDING' && (
                                <View className="flex-row gap-3 pt-4 border-t border-slate-100">
                                    <TouchableOpacity
                                        onPress={() => setRejectId(item.id)}
                                        className="flex-1 bg-red-50 py-3 rounded-xl border border-red-100 items-center justify-center active:bg-red-100"
                                    >
                                        <Text className="text-red-600 font-bold text-sm">Reject</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity
                                        onPress={() => handleStatusUpdate(item.id, 'Approved')}
                                        className="flex-1 bg-indigo-600 py-3 rounded-xl shadow-lg shadow-indigo-200 items-center justify-center active:bg-indigo-700"
                                    >
                                        <Text className="text-white font-bold text-sm">Approve</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </Animated.View>
                )}
            />

            <Modal visible={!!rejectId} transparent animationType="fade">
                <View className="flex-1 bg-slate-900/40 backdrop-blur-sm items-center justify-center p-6">
                    <View className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
                        <Text className="text-xl font-bold mb-2 text-slate-900">Reject Request</Text>
                        <Text className="text-slate-500 mb-6 text-sm">Please provide a reason for this rejection.</Text>

                        <TextInput
                            className="bg-slate-50 p-4 rounded-2xl text-slate-900 mb-4 h-32 border border-slate-200"
                            multiline
                            textAlignVertical="top"
                            placeholder="Reason for rejection..."
                            placeholderTextColor="#94a3b8"
                            value={rejectReason}
                            onChangeText={setRejectReason}
                        />

                        <View className="flex-row gap-3">
                            <TouchableOpacity 
                                onPress={() => {
                                    setRejectId(null);
                                    setRejectReason('');
                                }} 
                                className="flex-1 py-3.5 rounded-xl bg-slate-100 items-center"
                            >
                                <Text className="font-semibold text-slate-600">Cancel</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                onPress={() => rejectId && handleStatusUpdate(rejectId, 'Rejected')}
                                disabled={!rejectReason.trim()}
                                className={`flex-1 py-3.5 rounded-xl items-center ${
                                    !rejectReason.trim() 
                                        ? 'bg-slate-200 opacity-50' 
                                        : 'bg-red-600 shadow-lg shadow-red-200'
                                }`}
                            >
                                <Text className={`font-bold ${
                                    !rejectReason.trim() 
                                        ? 'text-slate-400' 
                                        : 'text-white'
                                }`}>
                                    Reject
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
