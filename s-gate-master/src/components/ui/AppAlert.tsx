import React, { createContext, useContext, useState, useCallback } from 'react';
import { Modal, Text, View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
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
}

interface AppAlertContextType {
    show: (title: string, message: string, buttons?: AlertButton[]) => void;
}

const AppAlertContext = createContext<AppAlertContextType | undefined>(undefined);

export const AppAlert = {
    show: (title: string, message: string, buttons?: AlertButton[]) => {
        if (alertInstance) {
            alertInstance(title, message, buttons);
        } else {
            console.warn('AppAlertProvider not found. Call AppAlert.show after mounting the provider.');
        }
    }
};

let alertInstance: (title: string, message: string, buttons?: AlertButton[]) => void;

export function AppAlertProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<AlertState>({
        visible: false,
        title: '',
        message: '',
        buttons: [],
    });

    const show = useCallback((title: string, message: string, buttons: AlertButton[] = [{ text: 'OK' }]) => {
        setState({
            visible: true,
            title,
            message,
            buttons,
        });
    }, []);

    alertInstance = show;

    const hide = () => {
        setState(prev => ({ ...prev, visible: false }));
    };

    const handleButtonPress = (onPress?: () => void) => {
        hide();
        if (onPress) {
            setTimeout(onPress, 100); // Small delay to allow modal to close smoothly
        }
    };

    return (
        <AppAlertContext.Provider value={{ show }}>
            {children}
            <Modal
                transparent
                visible={state.visible}
                animationType="fade"
                onRequestClose={hide}
            >
                <View style={styles.overlay}>
                    <View style={styles.container}>
                        <View style={styles.content}>
                            <Text style={styles.title}>{state.title}</Text>
                            <Text style={styles.message}>{state.message}</Text>
                        </View>
                        
                        <View style={styles.buttonContainer}>
                            {state.buttons.map((btn, index) => {
                                const isDestructive = btn.style === 'destructive';
                                const isCancel = btn.style === 'cancel';
                                
                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.button,
                                            index > 0 && styles.buttonBorder,
                                            state.buttons.length > 2 && styles.verticalButton
                                        ]}
                                        onPress={() => handleButtonPress(btn.onPress)}
                                        activeOpacity={0.6}
                                    >
                                        <Text style={[
                                            styles.buttonText,
                                            isDestructive && styles.destructiveText,
                                            isCancel && styles.cancelText,
                                            !isDestructive && !isCancel && styles.primaryText
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
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    container: {
        width: '100%',
        maxWidth: 320,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    content: {
        padding: 24,
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t2,
        textAlign: 'center',
        lineHeight: 20,
    },
    buttonContainer: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: SgateColors.borderSoft,
    },
    button: {
        flex: 1,
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonBorder: {
        borderLeftWidth: 1,
        borderLeftColor: SgateColors.borderSoft,
    },
    buttonText: {
        fontSize: 16,
        fontFamily: SgateFonts.semibold,
    },
    primaryText: {
        color: SgateColors.goldDeep,
    },
    destructiveText: {
        color: '#EF4444',
    },
    cancelText: {
        color: SgateColors.t3,
    },
    verticalButton: {
        flex: 0,
        width: '100%',
        borderLeftWidth: 0,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    }
});
