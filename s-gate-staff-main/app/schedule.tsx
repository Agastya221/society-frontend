import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius } from '../src/constants/theme';
import { api } from '../src/services/api';
import { StaffAssignment, StaffBooking, worksToday } from '../src/types/staff';

const time = (value?: string) => value || 'Time not set';
const home = (flat: StaffAssignment['flat']) => `${flat.block?.name ? `${flat.block.name} · ` : ''}${flat.flatNumber}`;
// Calendar day in the device's timezone, so "today" matches what the staff member sees.
const dayKey = (value: string | Date) => { const d = new Date(value); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const ACCEPTED: StaffBooking['status'][] = ['CONFIRMED', 'IN_PROGRESS'];
const byDateThenTime = (a: StaffBooking, b: StaffBooking) => dayKey(a.bookingDate).localeCompare(dayKey(b.bookingDate)) || a.startTime.localeCompare(b.startTime);

export default function Schedule() {
  const [items, setItems] = useState<StaffAssignment[]>([]);
  const [bookings, setBookings] = useState<StaffBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    // Accepted one-off bookings come from the work-requests list; a failure there
    // shouldn't hide the regular schedule.
    const [assignments, booked] = await Promise.allSettled([api.get('/staff-app/assignments'), api.get('/staff-app/bookings')]);
    if (assignments.status === 'fulfilled') { setItems(assignments.value.data.data ?? []); setFailed(false); } else setFailed(true);
    if (booked.status === 'fulfilled') setBookings(booked.value.data.data ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  // The pull spinner needs its own state: `loading` is only for the first load, and
  // onRefresh never set it, so the spinner vanished as soon as the finger lifted.
  const refresh = useCallback(async () => { setRefreshing(true); try { await load(); } finally { setRefreshing(false); } }, [load]);

  const todayKey = dayKey(new Date());
  const accepted = bookings.filter((b) => ACCEPTED.includes(b.status));
  const todayBooked = accepted.filter((b) => dayKey(b.bookingDate) === todayKey).sort(byDateThenTime);
  const upcoming = accepted.filter((b) => dayKey(b.bookingDate) > todayKey).sort(byDateThenTime);
  const scheduled = items.filter((item) => worksToday(item.workingDays));
  const hasToday = scheduled.length > 0 || todayBooked.length > 0;

  return <ScrollView style={s.root} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.gold} colors={[Colors.gold]} />}>
    <View style={s.date}><Text style={s.dateLabel}>TODAY</Text><Text style={s.dateText}>{new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</Text></View>
    {loading ? <ActivityIndicator style={s.loader} color={Colors.gold} /> : <>
      {hasToday ? <>
        {scheduled.map((item, index) => <View key={item.id} style={s.card}>
          <View style={s.order}><Text style={s.orderText}>{index + 1}</Text></View><View style={s.info}><Text style={s.home}>{home(item.flat)}</Text><Text style={s.hours}>{time(item.workStartTime)} – {time(item.workEndTime)}</Text></View>
        </View>)}
        {todayBooked.map((b) => <BookingCard key={b.id} booking={b} />)}
      </> : <View style={[s.empty, upcoming.length > 0 && s.emptyCompact]}><View style={s.icon}><Ionicons name={failed ? 'cloud-offline-outline' : 'calendar-outline'} size={35} color={Colors.soft}/></View><Text style={s.title}>{failed ? 'Could not load schedule' : 'No work scheduled today'}</Text><Text style={s.text}>{failed ? 'Check your connection and pull down to try again.' : 'Your regular assigned homes will appear here in time order.'}</Text></View>}
      {upcoming.length > 0 && <>
        <Text style={s.section}>UPCOMING BOOKED WORK</Text>
        {upcoming.map((b) => <BookingCard key={b.id} booking={b} showDate />)}
      </>}
    </>}
  </ScrollView>;
}

function BookingCard({ booking, showDate }: { booking: StaffBooking; showDate?: boolean }) {
  const d = new Date(booking.bookingDate);
  return <View style={s.card}>
    {showDate
      ? <View style={s.dateBox}><Text style={s.dateDay}>{d.getDate()}</Text><Text style={s.dateMonth}>{d.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()}</Text></View>
      : <View style={[s.order, s.bookedIcon]}><Ionicons name="briefcase-outline" size={19} color={Colors.ink} /></View>}
    <View style={s.info}>
      <Text style={s.home}>{booking.workType}</Text>
      <Text style={s.hours}>{home(booking.flat)} · {showDate ? `${d.toLocaleDateString('en-IN', { weekday: 'short' })}, ` : ''}{booking.startTime} – {booking.endTime}</Text>
    </View>
    <View style={s.badge}><Text style={s.badgeText}>{booking.status === 'IN_PROGRESS' ? 'IN PROGRESS' : 'BOOKED'}</Text></View>
  </View>;
}

const s=StyleSheet.create({root:{flex:1,backgroundColor:Colors.bg},content:{padding:20,flexGrow:1},date:{backgroundColor:Colors.goldPale,borderRadius:Radius.md,padding:17,borderWidth:1,borderColor:'#F0D77B',marginBottom:16},dateLabel:{fontSize:10,fontWeight:'900',letterSpacing:1.5,color:'#A66E00'},dateText:{fontSize:18,fontWeight:'900',color:Colors.ink,marginTop:5},loader:{marginTop:50},card:{flexDirection:'row',alignItems:'center',backgroundColor:Colors.card,borderWidth:1,borderColor:Colors.border,borderRadius:Radius.md,padding:15,marginBottom:10},order:{width:42,height:42,borderRadius:14,backgroundColor:Colors.goldPale,alignItems:'center',justifyContent:'center'},bookedIcon:{backgroundColor:Colors.greenPale},orderText:{fontWeight:'900',fontSize:16,color:Colors.ink},info:{flex:1,marginLeft:13},home:{fontSize:16,fontWeight:'900',color:Colors.ink},hours:{fontSize:12,color:Colors.muted,marginTop:4},badge:{paddingHorizontal:8,paddingVertical:5,borderRadius:9,backgroundColor:Colors.greenPale,marginLeft:8},badgeText:{fontSize:9,fontWeight:'900',color:Colors.ink},dateBox:{width:42,height:46,borderRadius:14,backgroundColor:Colors.ink,alignItems:'center',justifyContent:'center'},dateDay:{fontSize:17,fontWeight:'900',color:Colors.card},dateMonth:{fontSize:8,fontWeight:'900',letterSpacing:1,color:Colors.gold,marginTop:1},section:{fontSize:11,fontWeight:'900',letterSpacing:1.5,color:Colors.soft,marginTop:18,marginBottom:12,marginLeft:2},empty:{flex:1,alignItems:'center',justifyContent:'center',padding:30},emptyCompact:{flex:0,paddingVertical:24},icon:{width:74,height:74,borderRadius:24,backgroundColor:Colors.card,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:Colors.border},title:{fontSize:20,fontWeight:'900',color:Colors.ink,marginTop:18},text:{fontSize:13,lineHeight:20,textAlign:'center',color:Colors.muted,marginTop:7}});
