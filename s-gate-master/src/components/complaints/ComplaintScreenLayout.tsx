import React, { ReactNode } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SgateColors } from '../../constants/Sgate-theme';

interface ComplaintScreenLayoutProps {
    headerContent: ReactNode;
    children: ReactNode;
}

export function ComplaintScreenLayout({ headerContent, children }: ComplaintScreenLayoutProps) {
    return (
        <View style={S.root}>
            <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
            
            <View style={S.headerBg}>
                <SafeAreaView edges={['top']}>
                    {headerContent}
                </SafeAreaView>
            </View>
            
            {/* FIXED SPACING: 14px gap between header and content that never scrolls away */}
            <View style={{ height: 14 }} />
            
            <View style={S.contentWrapper}>
                {children}
            </View>
        </View>
    );
}

const S = StyleSheet.create({
    root: { flex: 1, backgroundColor: SgateColors.bg },
    headerBg: { 
        backgroundColor: '#FFFFFF', 
        borderBottomWidth: 1, 
        borderBottomColor: 'rgba(0,0,0,0.04)' 
    },
    contentWrapper: { flex: 1 },
});
