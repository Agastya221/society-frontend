import React, { createContext, useCallback, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SgateColors, SgateFonts } from '../../constants/Sgate-theme';

interface AlertButton {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

interface AlertState {
    visible: boolean;
    title: string;
    message: string;
    buttons: AlertButton[];
    options?: { cancelable?: boolean };
    tag?: string;
}

interface AppAlertContextType {
    show: (title: string, message: string, buttons?: AlertButton[], options?: { cancelable?: boolean; tag?: string }) => void;
}

const AppAlertContext = createContext<AppAlertContextType | undefined>(undefined);

export const AppAlert = {
    show: (title: string, message: string, buttons?: AlertButton[], options?: { cancelable?: boolean; tag?: string }) => {
        if (alertInstance) {
            alertInstance(title, message, buttons, options);
        } else {
            console.warn('AppAlertProvider not found. Call AppAlert.show after mounting the provider.');
        }
    },
    /**
     * Hide the current alert.
     * If a tag is provided, only hide the alert if it matches the tag.
     * This prevents unrelated alerts from being dismissed.
     */
    hide: (tag?: string) => {
        if (hideInstance) {
            hideInstance(tag);
        }
    }
};

let alertInstance: (title: string, message: string, buttons?: AlertButton[], options?: { cancelable?: boolean; tag?: string }) => void;
let hideInstance: (tag?: string) => void;

export function AppAlertProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<AlertState>({
        visible: false,
        title: '',
        message: '',
        buttons: [],
    });

    const show = useCallback((title: string, message: string, buttons: AlertButton[] = [{ text: 'OK' }], options?: { cancelable?: boolean; tag?: string }) => {
        setState({
            visible: true,
            title,
            message,
            buttons,
            options,
            tag: options?.tag,
        });
    }, []);

    alertInstance = show;

    const hide = (tag?: string) => {
        setState(prev => {
            // If a tag is specified, only hide if the current alert has that same tag
            if (tag && prev.tag !== tag) return prev;
            return { ...prev, visible: false };
        });
    };

    hideInstance = hide;

    const handleButtonPress = (onPress?: () => void) => {
        hide();
        if (onPress) {
            setTimeout(onPress, 100); // Small delay to allow modal to close smoothly
        }
    };

    const isCancelable = state.options?.cancelable !== false;

    // Determine alert icon based on title keywords
    const getAlertIcon = () => {
        const t = state.title.toLowerCase();
        if (t.includes('error') || t.includes('failed')) return { name: 'alert-circle' as const, color: SgateColors.red };
        if (t.includes('success')) return { name: 'check-circle' as const, color: SgateColors.green };
        if (t.includes('permission') || t.includes('required')) return { name: 'shield' as const, color: SgateColors.gold };
        if (t.includes('warning') || t.includes('large')) return { name: 'alert-triangle' as const, color: SgateColors.gold };
        return { name: 'info' as const, color: SgateColors.gold };
    };

    const alertIcon = getAlertIcon();

    return (
        <AppAlertContext.Provider value={{ show }}>
            {children}
            <Modal
                transparent
                visible={state.visible}
                animationType="fade"
                onRequestClose={() => {
                    if (isCancelable) hide();
                }}
            >
                <View style={styles.overlay}>
                    <View style={styles.container}>
                        {/* Icon Header */}
                        <View style={styles.iconHeader}>
                            <View style={[styles.iconCircle, { backgroundColor: `${alertIcon.color}15` }]}>
                                <Feather name={alertIcon.name} size={28} color={alertIcon.color} />
                            </View>
                        </View>

                        {/* Content */}
                        <View style={styles.content}>
                            <Text style={styles.title}>{state.title}</Text>
                            <Text style={styles.message}>{state.message}</Text>
                        </View>

                        {/* Buttons */}
                        <View style={[
                            styles.buttonContainer,
                            state.buttons.length > 2 && styles.buttonContainerVertical,
                        ]}>
                            {state.buttons.map((btn, index) => {
                                const isDestructive = btn.style === 'destructive';
                                const isCancel = btn.style === 'cancel';
                                const isPrimary = !isDestructive && !isCancel;

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.button,
                                            isPrimary && styles.primaryButton,
                                            isDestructive && styles.destructiveButton,
                                            isCancel && styles.cancelButton,
                                            state.buttons.length > 2 && styles.verticalButton,
                                            state.buttons.length <= 2 && index > 0 && { marginLeft: 10 },
                                        ]}
                                        onPress={() => handleButtonPress(btn.onPress)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[
                                            styles.buttonText,
                                            isPrimary && styles.primaryButtonText,
                                            isDestructive && styles.destructiveButtonText,
                                            isCancel && styles.cancelButtonText,
                                        ]}>
                                            {btn.text}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </View>
            </Modal>
        </AppAlertContext.Provider>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(13, 15, 20, 0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    container: {
        width: '100%',
        maxWidth: 320,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
    },
    iconHeader: {
        alignItems: 'center',
        paddingTop: 28,
        paddingBottom: 4,
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        paddingHorizontal: 24,
        paddingBottom: 24,
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: -0.2,
    },
    message: {
        fontSize: 14,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        textAlign: 'center',
        lineHeight: 21,
    },
    buttonContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingBottom: 20,
        gap: 10,
    },
    buttonContainerVertical: {
        flexDirection: 'column',
    },
    button: {
        flex: 1,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    primaryButton: {
        backgroundColor: SgateColors.gold,
    },
    destructiveButton: {
        backgroundColor: SgateColors.redBg,
    },
    cancelButton: {
        backgroundColor: SgateColors.surface,
    },
    verticalButton: {
        flex: 0,
        width: '100%',
    },
    buttonText: {
        fontSize: 15,
        fontFamily: SgateFonts.bold,
    },
    primaryButtonText: {
        color: SgateColors.t1,
    },
    destructiveButtonText: {
        color: SgateColors.red,
    },
    cancelButtonText: {
        color: SgateColors.t3,
    },
});
