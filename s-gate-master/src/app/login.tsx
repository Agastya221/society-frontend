import { authService } from "@/services/authService";
import { useAuthStore } from "@/store/useAuthStore";
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from "react-native-safe-area-context";

export default function Login() {
    const router = useRouter();
    const login = useAuthStore((state) => state.login);
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const validateForm = (): boolean => {
        if (!identifier.trim()) {
            setError("Please enter your phone number or email");
            return false;
        }
        if (!password.trim()) {
            setError("Please enter your password");
            return false;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            return false;
        }
        setError("");
        return true;
    };

    const handleLogin = async () => {
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            const response = await authService.login({
                identifier: identifier.trim(),
                password: password,
            });

            const authToken = response.data.accessToken || response.data.token;

            if (response.success && authToken && response.data.user) {
                await login(
                    authToken,
                    response.data.user,
                    response.data.appType
                );
            } else {
                setError(response.message || "Login failed. Please try again.");
                setPassword("");
            }
        } catch (err: any) {
            setError(err.message || "An error occurred. Please try again.");
            setPassword("");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View className="flex-1">
            {/* Blue Gradient Background */}
            <LinearGradient
                colors={['#1e3a8a', '#1e40af', '#3b82f6', '#60a5fa']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
            />

            {/* Decorative Elements */}
            <View className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <View className="absolute -top-20 -right-20 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl" />
                <View className="absolute top-40 -left-20 w-60 h-60 bg-blue-300/20 rounded-full blur-3xl" />
                <View className="absolute bottom-20 right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-2xl" />
            </View>

            <SafeAreaView className="flex-1" edges={['top']}>
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    <ScrollView 
                        className="flex-1"
                        contentContainerStyle={{ flexGrow: 1 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <View className="flex-1 px-6 justify-center pb-24">
                            {/* Logo/Illustration Section */}
                            <Animated.View 
                                entering={FadeInUp.delay(100).springify()}
                                className="items-center mb-8"
                            >
                                <View className="relative items-center justify-center mb-6 h-48 w-48">
                                    {/* Prominent Shield Icon (No Background Box) */}
                                    <Feather 
                                        name="shield" 
                                        size={100} 
                                        color="white" 
                                    />
                                    
                                    {/* Glowing Pulse Effect behind shield */}
                                    <View className="absolute inset-0 bg-blue-400/40 blur-3xl rounded-full -z-10" />
                                </View>
                                
                                <Text className="text-white text-3xl font-bold tracking-tight mb-2">
                                    S-Gate Security
                                </Text>
                                <Text className="text-blue-100 text-base text-center font-medium">
                                    Your Community's Digital Guardian
                                </Text>
                            </Animated.View>

                            {/* Login Form */}
                            <Animated.View 
                                entering={FadeInDown.delay(200).springify()}
                                className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/40"
                            >
                                <Text className="text-2xl font-bold text-slate-800 mb-2">Welcome Back</Text>
                                <Text className="text-slate-500 mb-6">Sign in to access your account</Text>

                                {error ? (
                                    <Animated.View 
                                        entering={FadeInDown.springify()}
                                        className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex-row items-center gap-3"
                                    >
                                        <Feather name="alert-circle" size={20} color="#dc2626" />
                                        <Text className="text-red-600 text-sm flex-1">{error}</Text>
                                    </Animated.View>
                                ) : null}

                                <View className="gap-4 mb-6">
                                    {/* Email/Phone Input */}
                                    <View>
                                        <Text className="text-slate-700 font-semibold mb-2 text-sm">Phone or Email</Text>
                                        <View className="bg-slate-50 border-2 border-slate-200 rounded-xl px-2 py-1 flex-row items-center gap-3">
                                            <Feather name="user" size={20} color="#64748b" />
                                            <TextInput
                                                className="flex-1 text-slate-900 text-base"
                                                placeholder="Enter phone number or email"
                                                placeholderTextColor="#94a3b8"
                                                value={identifier}
                                                onChangeText={(text) => {
                                                    setIdentifier(text);
                                                    setError("");
                                                }}
                                                autoCapitalize="none"
                                                keyboardType="email-address"
                                                editable={!isLoading}
                                            />
                                        </View>
                                    </View>

                                    {/* Password Input */}
                                    <View>
                                        <Text className="text-slate-700 font-semibold mb-2 text-sm">Password</Text>
                                        <View className="bg-slate-50 border-2 border-slate-200 rounded-xl px-2 py-1 flex-row items-center gap-3">
                                            <Feather name="lock" size={20} color="#64748b" />
                                            <TextInput
                                                className="flex-1 text-slate-900 text-base"
                                                placeholder="Enter your password"
                                                placeholderTextColor="#94a3b8"
                                                value={password}
                                                onChangeText={(text) => {
                                                    setPassword(text);
                                                    setError("");
                                                }}
                                                secureTextEntry={!showPassword}
                                                editable={!isLoading}
                                            />
                                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                                <Feather className="pr-2" name={showPassword ? "eye-off" : "eye"} size={20} color="#64748b" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>

                                {/* Login Button */}
                                <TouchableOpacity 
                                    onPress={handleLogin}
                                    disabled={isLoading}
                                    className="overflow-hidden rounded-xl shadow-lg"
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={['#3b82f6', '#2563eb', '#1d4ed8']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        className="py-4 items-center"
                                    >
                                        {isLoading ? (
                                            <View className="flex-row items-center gap-2">
                                                <ActivityIndicator size="small" color="#ffffff" />
                                                <Text className="text-white font-bold text-base">Logging in...</Text>
                                            </View>
                                        ) : (
                                            <View className="flex-row items-center gap-2">
                                                <Text className="text-white font-bold text-base">Sign In</Text>
                                                <Feather name="arrow-right" size={20} color="#ffffff" />
                                            </View>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>

                                {/* Additional Links */}
                                <View className="mt-4 items-center">
                                    <TouchableOpacity>
                                        <Text className="text-blue-600 text-sm font-semibold">Forgot Password?</Text>
                                    </TouchableOpacity>
                                </View>
                            </Animated.View>

                            {/* Footer */}
                            <Animated.View 
                                entering={FadeInDown.delay(400).springify()}
                                className="mt-8 items-center"
                            >
                                <View className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                                    <Text className="text-white text-xs font-medium">
                                        Secured by S-Gate Technology
                                    </Text>
                                </View>
                            </Animated.View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}
