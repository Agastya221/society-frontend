import { SgateColors } from '@/constants/Sgate-theme';
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
        <View className="flex-row items-end gap-2 p-3 bg-white border-t border-gray-100">
            <TextInput
                className="font-sora flex-1 bg-gray-100 rounded-2xl px-4 py-3 min-h-[44px] max-h-24 text-gray-900"
                placeholder="Write a comment..."
                placeholderTextColor={SgateColors.t3}
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
                        : 'bg-gray-200'
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
