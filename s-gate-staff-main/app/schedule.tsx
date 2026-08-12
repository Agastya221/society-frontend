import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius } from '../src/constants/theme';
import { api } from '../src/services/api';
import { StaffAssignment } from '../src/types/staff';

const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
const time = (value?: string) => value || 'Time not set';

export default function Schedule() {
  const [items, setItems] = useState<StaffAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    try { const response = await api.get('/staff-app/assignments'); setItems(response.data.data); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const scheduled = items.filter((item) => !item.workingDays?.length || item.workingDays.includes(today));
  return <ScrollView style={s.root} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.gold} />}>
    <View style={s.date}><Text style={s.dateLabel}>TODAY</Text><Text style={s.dateText}>{new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</Text></View>
    {loading ? <ActivityIndicator style={s.loader} color={Colors.gold} /> : scheduled.length ? scheduled.map((item, index) => <View key={item.id} style={s.card}>
      <View style={s.order}><Text style={s.orderText}>{index + 1}</Text></View><View style={s.info}><Text style={s.home}>{item.flat.block?.name} · {item.flat.flatNumber}</Text><Text style={s.hours}>{time(item.workStartTime)} – {time(item.workEndTime)}</Text></View><Ionicons name="chevron-forward" size={20} color={Colors.soft}/>
    </View>) : <View style={s.empty}><View style={s.icon}><Ionicons name="calendar-outline" size={35} color={Colors.soft}/></View><Text style={s.title}>No work scheduled</Text><Text style={s.text}>Your regular assigned homes will appear here in time order.</Text></View>}
  </ScrollView>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:Colors.bg},content:{padding:20,flexGrow:1},date:{backgroundColor:Colors.goldPale,borderRadius:Radius.md,padding:17,borderWidth:1,borderColor:'#F0D77B',marginBottom:16},dateLabel:{fontSize:10,fontWeight:'900',letterSpacing:1.5,color:'#A66E00'},dateText:{fontSize:18,fontWeight:'900',color:Colors.ink,marginTop:5},loader:{marginTop:50},card:{flexDirection:'row',alignItems:'center',backgroundColor:Colors.card,borderWidth:1,borderColor:Colors.border,borderRadius:Radius.md,padding:15,marginBottom:10},order:{width:42,height:42,borderRadius:14,backgroundColor:Colors.goldPale,alignItems:'center',justifyContent:'center'},orderText:{fontWeight:'900',fontSize:16,color:Colors.ink},info:{flex:1,marginLeft:13},home:{fontSize:16,fontWeight:'900',color:Colors.ink},hours:{fontSize:12,color:Colors.muted,marginTop:4},empty:{flex:1,alignItems:'center',justifyContent:'center',padding:30},icon:{width:74,height:74,borderRadius:24,backgroundColor:Colors.card,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:Colors.border},title:{fontSize:20,fontWeight:'900',color:Colors.ink,marginTop:18},text:{fontSize:13,lineHeight:20,textAlign:'center',color:Colors.muted,marginTop:7}});
