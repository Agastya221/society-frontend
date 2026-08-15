import { OTPWidget } from '@msg91comm/sendotp-react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '../src/constants/theme';
import { MSG91_TOKEN_AUTH, MSG91_WIDGET_ID } from '../src/constants/msg91';
import { api } from '../src/services/api';
import { useAuth } from '../src/store/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function Login() {
  const signIn = useAuth((s) => s.signIn);
  const [phone, setPhone] = useState(''); const [otp, setOtp] = useState(''); const [reqId, setReqId] = useState('');
  const [step, setStep] = useState<'phone'|'otp'>('phone'); const [loading, setLoading] = useState(false);
  useEffect(() => { OTPWidget.initializeWidget(MSG91_WIDGET_ID, MSG91_TOKEN_AUTH); }, []);
  const continueLogin = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) return Alert.alert('Enter your 10-digit mobile number');
    setLoading(true);
    try {
      if (step === 'phone') {
        const sent = await OTPWidget.sendOTP({ identifier: `91${cleaned}` });
        if (sent?.type === 'error' || sent?.success === false) throw new Error('Could not send OTP');
        setReqId(sent?.reqId ?? sent?.message ?? ''); setStep('otp'); return;
      }
      if (otp.length !== 6) return Alert.alert('Enter the 6-digit OTP');
      const verified = await OTPWidget.verifyOTP({ reqId, otp });
      const success = verified?.message?.toUpperCase() === 'SUCCESS' || verified?.type === 'success';
      if (!success) throw new Error('Incorrect OTP');
      const widgetToken = typeof verified?.message === 'string' && verified.message.startsWith('eyJ') ? verified.message : verified?.reqId ?? reqId;
      const res = await api.post('/staff-app/auth/otp/verify', { widgetToken });
      const data = res.data.data;
      await signIn(data.accessToken, data.refreshToken, data.staff);
    } catch (error: any) {
      Alert.alert('Account not ready', error.response?.data?.message ?? 'Ask your society admin to register and verify this number.');
    } finally { setLoading(false); }
  };
  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView
        style={s.keyboardRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.brand}><View style={s.logo}><Ionicons name="shield-checkmark" size={34} color={Colors.ink} /></View><Text style={s.brandName}>S-GATE</Text><Text style={s.brandType}>STAFF</Text></View>
          <View style={s.copy}><Text style={s.kicker}>YOUR WORK. ONE PLACE.</Text><Text style={s.title}>{step==='phone'?'Welcome to your staff app.':'Verify your number.'}</Text><Text style={s.body}>{step==='phone'?'See your homes, timings, gate pass and new work requests.':`Enter the security code sent to +91 ${phone}.`}</Text></View>
          <View style={s.form}><Text style={s.label}>{step==='phone'?'MOBILE NUMBER':'6-DIGIT OTP'}</Text><View style={s.inputRow}>{step==='phone'&&<Text style={s.prefix}>+91</Text>}<TextInput autoFocus={step === 'otp'} value={step==='phone'?phone:otp} onChangeText={step==='phone'?setPhone:setOtp} keyboardType="number-pad" maxLength={step==='phone'?10:6} placeholder={step==='phone'?'Enter mobile number':'Enter OTP'} placeholderTextColor={Colors.soft} style={s.input} /></View>{step==='otp'&&<Pressable onPress={()=>{setStep('phone');setOtp('')}}><Text style={s.change}>Change mobile number</Text></Pressable>}<Pressable style={s.button} onPress={continueLogin} disabled={loading}>{loading ? <ActivityIndicator color={Colors.ink} /> : <><Text style={s.buttonText}>{step==='phone'?'Send OTP':'Verify and sign in'}</Text><Ionicons name="arrow-forward" size={20} color={Colors.ink} /></>}</Pressable><Text style={s.help}>Use the same number registered by your resident or society admin.</Text></View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  root:{flex:1,backgroundColor:Colors.bg}, keyboardRoot:{flex:1}, content:{flexGrow:1,padding:24},
  brand:{marginTop:24},logo:{width:62,height:62,borderRadius:20,backgroundColor:Colors.gold,alignItems:'center',justifyContent:'center',marginBottom:14},brandName:{fontSize:30,fontWeight:'900',color:Colors.ink},brandType:{fontSize:13,fontWeight:'800',letterSpacing:4,color:Colors.soft},copy:{marginTop:64},kicker:{fontSize:12,fontWeight:'900',letterSpacing:2,color:'#D39200'},title:{fontSize:39,lineHeight:44,fontWeight:'900',color:Colors.ink,marginTop:10},body:{fontSize:16,lineHeight:24,color:Colors.muted,marginTop:12},form:{marginTop:'auto',paddingBottom:24},label:{fontSize:11,fontWeight:'900',letterSpacing:1.5,color:Colors.muted,marginBottom:9},inputRow:{height:58,backgroundColor:Colors.card,borderRadius:Radius.md,borderWidth:1,borderColor:Colors.border,flexDirection:'row',alignItems:'center'},prefix:{fontSize:16,fontWeight:'800',paddingHorizontal:16,borderRightWidth:1,borderRightColor:Colors.border},input:{flex:1,fontSize:16,fontWeight:'700',paddingHorizontal:14,color:Colors.ink},change:{fontSize:12,fontWeight:'800',color:Colors.muted,marginTop:10},button:{height:58,borderRadius:Radius.md,backgroundColor:Colors.gold,marginTop:14,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10},buttonText:{fontSize:16,fontWeight:'900',color:Colors.ink},help:{fontSize:12,lineHeight:18,textAlign:'center',color:Colors.soft,marginTop:14}
});
