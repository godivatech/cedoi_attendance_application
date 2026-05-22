import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useUpcomingMeetings } from '../../src/modules/meetings/useMeetings';
import { Card } from '../../src/components/ui/Card';
import { Calendar, MapPin, Users, ChevronRight, Clock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { formatDate } from '../../src/utils/date';

export default function StaffToday() {
  const { meetings, loading } = useUpcomingMeetings();
  const router = useRouter();

  if (loading) {
    return (
      <View style={{ backgroundColor: '#f8fafc' }} className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  const todaysMeeting = meetings[0];

  return (
    <ScrollView style={{ backgroundColor: '#f8fafc' }} className="flex-1">
      {/* Header */}
      <View className="px-6 pt-8 pb-4">
        <Text className="text-3xl font-extrabold text-slate-800 tracking-tight">Today's Meeting</Text>
        <Text className="text-slate-500 text-sm mt-1 font-medium">{formatDate(new Date())}</Text>
      </View>

      {todaysMeeting ? (
        <View className="px-6">
          {/* Meeting Card */}
          <View style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3, overflow: 'hidden', marginBottom: 20 }}>
            {/* Status Banner */}
            <View style={{ backgroundColor: todaysMeeting.status === 'ONGOING' ? '#059669' : '#4f46e5', paddingVertical: 10, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)', marginRight: 8 }} />
              <Text style={{ color: 'white', fontWeight: '800', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                {todaysMeeting.status === 'ONGOING' ? 'In Progress' : todaysMeeting.status}
              </Text>
            </View>

            <View style={{ padding: 24 }}>
              <Text style={{ fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 16, lineHeight: 30 }}>
                {todaysMeeting.title}
              </Text>

              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                    <Calendar size={16} color="#4f46e5" />
                  </View>
                  <View>
                    <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Date</Text>
                    <Text style={{ color: '#334155', fontSize: 14, fontWeight: '600', marginTop: 1 }}>{formatDate(todaysMeeting.date)}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                    <Clock size={16} color="#4f46e5" />
                  </View>
                  <View>
                    <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Time</Text>
                    <Text style={{ color: '#334155', fontSize: 14, fontWeight: '600', marginTop: 1 }}>{todaysMeeting.startTime} – {todaysMeeting.endTime}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                    <MapPin size={16} color="#4f46e5" />
                  </View>
                  <View>
                    <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Venue</Text>
                    <Text style={{ color: '#334155', fontSize: 14, fontWeight: '600', marginTop: 1 }}>{todaysMeeting.venue}</Text>
                  </View>
                </View>
              </View>

              {/* Stats Row */}
              <View style={{ flexDirection: 'row', marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderColor: '#f1f5f9', gap: 12 }}>
                <View style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: 16, alignItems: 'center' }}>
                  <Text style={{ fontSize: 28, fontWeight: '800', color: '#4f46e5' }}>{todaysMeeting.metrics?.totalAttendees || 0}</Text>
                  <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '600', marginTop: 2 }}>Checked In</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: 16, alignItems: 'center' }}>
                  <Text style={{ fontSize: 28, fontWeight: '800', color: '#059669' }}>₹{todaysMeeting.metrics?.totalCollected || 0}</Text>
                  <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '600', marginTop: 2 }}>Collected</Text>
                </View>
              </View>
            </View>

            {/* Check-in CTA */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={{ margin: 16, marginTop: 0, backgroundColor: '#4f46e5', borderRadius: 14, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
              onPress={() => router.push({
                pathname: '/(staff)/check-in',
                params: { meetingId: todaysMeeting.id }
              })}
            >
              <Users size={20} color="white" />
              <Text style={{ color: 'white', fontWeight: '800', fontSize: 15, marginLeft: 10 }}>Start Member Check-in</Text>
              <ChevronRight size={18} color="rgba(255,255,255,0.7)" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View className="px-6">
          <Card className="items-center py-16 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <Calendar size={52} color="#e2e8f0" />
            <Text className="text-slate-400 mt-5 text-center font-semibold text-base">No meetings scheduled for today.</Text>
            <Text className="text-slate-300 mt-2 text-center text-sm">Check back later or contact your admin.</Text>
          </Card>
        </View>
      )}
    </ScrollView>
  );
}
