import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, FlatList, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import { MOCK_NOTICES, Notice } from '../../data';

const PRIORITIES: Notice['priority'][] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const TYPES: Notice['type'][] = ['NOTICE', 'ANNOUNCEMENT'];

export default function NoticesScreen() {
    const [notices, setNotices] = useState<Notice[]>(MOCK_NOTICES);
    const [isModalVisible, setModalVisible] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const insets = useSafeAreaInsets();

    // Form State
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [priority, setPriority] = useState<Notice['priority']>('LOW');
    const [type, setType] = useState<Notice['type']>('NOTICE');

    const resetForm = () => {
        setTitle('');
        setDesc('');
        setPriority('LOW');
        setType('NOTICE');
        setEditingId(null);
    };

    const handleEdit = (notice: Notice) => {
        setTitle(notice.title);
        setDesc(notice.description);
        setPriority(notice.priority);
        setType(notice.type);
        setEditingId(notice.id);
        setModalVisible(true);
    };

    const handleDelete = (id: string) => {
        Alert.alert('Delete Notice', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Delete', 
                style: 'destructive', 
                onPress: () => setNotices(prev => prev.filter(n => n.id !== id)) 
            }
        ]);
    };

    const handleSave = () => {
        if (!title.trim() || !desc.trim()) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }

        const now = new Date().toISOString();

        if (editingId) {
            setNotices(prev => prev.map(n => n.id === editingId ? {
                ...n,
                title,
                description: desc,
                priority,
                type,
                updatedAt: now,
                date: new Date().toLocaleDateString() // Update display date too
            } : n));
        } else {
            const newNotice: Notice = {
                id: Date.now().toString(),
                title,
                description: desc,
                priority,
                type,
                target: 'All', // Default for now
                createdAt: now,
                updatedAt: now,
                date: new Date().toLocaleDateString()
            };
            setNotices([newNotice, ...notices]);
        }
        setModalVisible(false);
        resetForm();
    };

    return (
        <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
            <FlatList
                data={notices}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 + insets.bottom }}
                ListHeaderComponent={
                    <PrimaryButton
                        title="+ Create New Notice"
                        onPress={() => { resetForm(); setModalVisible(true); }}
                        className="mb-6"
                    />
                }
                renderItem={({ item }) => (
                    <Card className="mb-4">
                        <View className="flex-row justify-between mb-2">
                            <View className="flex-row gap-2">
                                <View className={`px-2 py-0.5 rounded ${item.type === 'ANNOUNCEMENT' ? 'bg-purple-100' : 'bg-gray-100'}`}>
                                    <Text className={`text-xs font-bold ${item.type === 'ANNOUNCEMENT' ? 'text-purple-700' : 'text-gray-700'}`}>
                                        {item.type}
                                    </Text>
                                </View>
                                <PriorityBadge priority={item.priority} />
                            </View>
                            <View className="flex-row gap-2">
                                <TouchableOpacity onPress={() => handleEdit(item)}>
                                    <Feather name="edit-2" size={18} color="#71717a" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                                    <Feather name="trash-2" size={18} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        </View>
                        
                        <Text className="text-lg font-bold text-zinc-900 dark:text-white mb-2">{item.title}</Text>
                        <Text className="text-zinc-600 dark:text-zinc-300 mb-3 leading-5">{item.description}</Text>
                        
                        <View className="border-t border-zinc-100 dark:border-zinc-800 pt-2 mt-2">
                            <Text className="text-zinc-400 text-xs">Created: {new Date(item.createdAt).toLocaleString()}</Text>
                            {item.updatedAt !== item.createdAt && (
                                <Text className="text-zinc-400 text-xs text-italic">Edited: {new Date(item.updatedAt).toLocaleString()}</Text>
                            )}
                        </View>
                    </Card>
                )}
            />

            <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet">
                <View 
                    style={{ paddingBottom: insets.bottom }}
                    className="flex-1 bg-zinc-50 dark:bg-zinc-950 p-6"
                >
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-2xl font-bold text-zinc-900 dark:text-white">
                            {editingId ? 'Edit Notice' : 'New Notice'}
                        </Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Feather name="x" size={24} color="#71717a" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text className="font-medium mb-2 text-zinc-700 dark:text-zinc-300">Title</Text>
                        <TextInput
                            className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 mb-4 text-zinc-900 dark:text-white"
                            placeholder="Notice Title"
                            value={title}
                            onChangeText={setTitle}
                            placeholderTextColor="#a1a1aa"
                        />

                        <Text className="font-medium mb-2 text-zinc-700 dark:text-zinc-300">Description</Text>
                        <TextInput
                            className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 mb-6 h-32 text-zinc-900 dark:text-white"
                            multiline
                            textAlignVertical="top"
                            placeholder="Details..."
                            value={desc}
                            onChangeText={setDesc}
                            placeholderTextColor="#a1a1aa"
                        />

                        <Text className="font-medium mb-2 text-zinc-700 dark:text-zinc-300">Type</Text>
                        <View className="flex-row gap-3 mb-6">
                            {TYPES.map(t => (
                                <TouchableOpacity
                                    key={t}
                                    onPress={() => setType(t)}
                                    className={`px-4 py-2 rounded-lg border ${type === t ? 'bg-zinc-900 border-zinc-900 dark:bg-white dark:border-white' : 'border-zinc-300 dark:border-zinc-700'}`}
                                >
                                    <Text className={type === t ? 'text-white dark:text-black font-bold' : 'text-zinc-600 dark:text-zinc-400'}>
                                        {t}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text className="font-medium mb-2 text-zinc-700 dark:text-zinc-300">Priority</Text>
                        <View className="flex-row flex-wrap gap-2 mb-8">
                            {PRIORITIES.map(p => (
                                <TouchableOpacity
                                    key={p}
                                    onPress={() => setPriority(p)}
                                    className={`px-3 py-2 rounded-lg border ${priority === p ? 'border-blue-600 bg-blue-50' : 'border-zinc-300'}`}
                                >
                                    <Text className={priority === p ? 'text-blue-700 font-bold' : 'text-zinc-600'}>
                                        {p}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <PrimaryButton 
                            title={editingId ? "Update Notice" : "Publish Notice"} 
                            onPress={handleSave} 
                        />
                         <View className="h-10" />
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

function PriorityBadge({ priority }: { priority: Notice['priority'] }) {
    let bg = 'bg-gray-100';
    let text = 'text-gray-700';

    if (priority === 'URGENT') { bg = 'bg-red-100'; text = 'text-red-700'; }
    else if (priority === 'HIGH') { bg = 'bg-orange-100'; text = 'text-orange-700'; }
    else if (priority === 'MEDIUM') { bg = 'bg-yellow-100'; text = 'text-yellow-700'; }
    else if (priority === 'LOW') { bg = 'bg-blue-100'; text = 'text-blue-700'; }

    return (
        <View className={`px-2 py-0.5 rounded ${bg}`}>
            <Text className={`text-xs font-bold ${text}`}>{priority}</Text>
        </View>
    );
}
