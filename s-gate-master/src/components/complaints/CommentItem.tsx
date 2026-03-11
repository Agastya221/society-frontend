import { Text, View } from 'react-native';
import { ComplaintComment } from '../../mocks/types';

interface CommentItemProps {
    comment: ComplaintComment;
    isCurrentUser: boolean;
}

export function CommentItem({ comment, isCurrentUser }: CommentItemProps) {
    const isAdmin = comment.role === 'ADMIN';

    return (
        <View className={`flex-row mb-4 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
            <View 
                className={`max-w-[85%] rounded-2xl p-3 ${
                    isCurrentUser 
                        ? 'bg-indigo-600 rounded-br-none' 
                        : isAdmin 
                            ? 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-bl-none'
                            : 'bg-gray-100 dark:bg-zinc-800 rounded-bl-none'
                }`}
            >
                <View className="flex-row items-center gap-2 mb-1">
                    <Text className={`text-xs font-bold ${
                        isCurrentUser 
                            ? 'text-indigo-100' 
                            : isAdmin 
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-gray-700 dark:text-gray-300'
                    }`}>
                        {comment.author}
                    </Text>
                    {isAdmin && (
                        <View className="bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded">
                            <Text className="text-[8px] font-bold text-red-600 dark:text-red-400">ADMIN</Text>
                        </View>
                    )}
                </View>

                <Text className={`text-sm ${
                    isCurrentUser ? 'text-white' : 'text-gray-800 dark:text-gray-100'
                }`}>
                    {comment.message}
                </Text>
                
                <Text className={`text-[10px] mt-1 text-right ${
                    isCurrentUser ? 'text-indigo-200' : 'text-gray-400'
                }`}>
                    {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        </View>
    );
}
