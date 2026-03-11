import React from 'react';
import { Modal, Text, TextInput, View } from 'react-native';
import { PrimaryButton } from './PrimaryButton';

interface ConfirmationModalProps {
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'primary';
    requireReason?: boolean;
    onConfirm: (reason?: string) => void;
    onCancel: () => void;
}

export function ConfirmationModal({ 
    visible, 
    title, 
    message, 
    confirmText = 'Confirm', 
    cancelText = 'Cancel', 
    variant = 'primary',
    requireReason = false,
    onConfirm, 
    onCancel 
}: ConfirmationModalProps) {
    const [reason, setReason] = React.useState('');

    return (
        <Modal transparent visible={visible} animationType="fade">
            <View className="flex-1 bg-black/50 justify-center items-center p-4">
                <View className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl p-6 shadow-xl">
                    <Text className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        {title}
                    </Text>
                    <Text className="text-gray-600 dark:text-gray-400 mb-6 leading-5">
                        {message}
                    </Text>

                    {requireReason && (
                        <TextInput
                            className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-3 mb-6 text-gray-900 dark:text-gray-100 h-24 text-start"
                            placeholder="Please provide a reason..."
                            placeholderTextColor="#9ca3af"
                            multiline
                            textAlignVertical="top"
                            value={reason}
                            onChangeText={setReason}
                        />
                    )}

                    <View className="flex-row gap-3">
                        <View className="flex-1">
                            <PrimaryButton 
                                title={cancelText} 
                                variant="outline" 
                                onPress={() => {
                                    setReason('');
                                    onCancel();
                                }} 
                            />
                        </View>
                        <View className="flex-1">
                            <PrimaryButton 
                                title={confirmText} 
                                variant={variant}
                                disabled={requireReason && !reason.trim()}
                                onPress={() => {
                                    onConfirm(reason);
                                    setReason('');
                                }} 
                            />
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
