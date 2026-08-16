import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { TextInput, TouchableOpacity, View } from 'react-native';

interface AddCommentInputProps {
    onSend: (message: string) => void;
}

export function AddCommentInput({ onSend }: AddCommentInputProps) {
    const [message, setMessage] = useState('');

    const handleSend = () => {
        if (!message.trim()) return;
        onSend(message);
        setMessage('');
    };

    return (
        <View className="flex-row items-end gap-2 p-3 bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800">
            <TextInput
                className="flex-1 bg-gray-100 dark:bg-zinc-800 rounded-2xl px-4 py-3 min-h-[44px] max-h-24 text-gray-900 dark:text-white"
                placeholder="Write a comment..."
                placeholderTextColor="#9ca3af"
                multiline
                value={message}
                onChangeText={setMessage}
            />
            <TouchableOpacity 
                onPress={handleSend}
                disabled={!message.trim()}
                className={`h-11 w-11 rounded-full items-center justify-center ${
                    message.trim() 
                        ? 'bg-indigo-600' 
                        : 'bg-gray-200 dark:bg-zinc-700'
                }`}
            >
                <Ionicons 
                    name="send" 
                    size={20} 
                    color={message.trim() ? 'white' : '#9ca3af'} 
                    style={{ marginLeft: 2 }}
                />
            </TouchableOpacity>
        </View>
    );
}
