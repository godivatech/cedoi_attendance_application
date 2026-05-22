import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useUpcomingMeetings } from '../../src/modules/meetings/useMeetings';
import { Card } from '../../src/components/ui/Card';
import { Calendar, MapPin, Users, QrCode, Search } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { formatDate } from '../../src/utils/date';
import { showAlert } from '../../src/utils/platformAlert';

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
    <ScrollView style={{ backgroundColor: '#f8fafc' }} className="flex-1 p-6">
      <View className="mb-6 mt-2">
        <Text className="text-3xl font-extrabold text-slate-800 tracking-tight">Today's Meeting</Text>
        <Text className="text-slate-500 text-sm mt-1 font-medium">{formatDate(new Date())}</Text>
      </View>

      {todaysMeeting ? (
        <View>
          <Card className="mb-6 p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <View className="flex-row justify-between items-start mb-4">
              <View className="flex-1 pr-4">
                <Text className="text-2xl font-extrabold text-slate-800 leading-snug">{todaysMeeting.title}</Text>
                <View className={`mt-3 px-3 py-1 rounded-full self-start ${
                  todaysMeeting.status === 'ONGOING' 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                }`}>
                  <Text className={`text-[10px] font-extrabold tracking-wide uppercase ${
                    todaysMeeting.status === 'ONGOING' ? 'text-emerald-700' : 'text-indigo-700'
                  }`}>
                    {todaysMeeting.status}
                  </Text>
                </View>
              </View>
            </View>

            <View className="space-y-4 mb-6 border-t border-b border-slate-50 py-4 my-2">
              <View className="flex-row items-center">
                <Calendar size={18} color="#94a3b8" />
                <Text className="ml-3 text-slate-600 font-medium text-sm">
                  {formatDate(todaysMeeting.date)} • {todaysMeeting.startTime}
                </Text>
              </View>
              <View className="flex-row items-center">
                <MapPin size={18} color="#94a3b8" />
                <Text className="ml-3 text-slate-600 font-medium text-sm">{todaysMeeting.venue}</Text>
              </View>
              <View className="flex-row items-center">
                <Users size={18} color="#94a3b8" />
                <Text className="ml-3 text-slate-600 font-medium text-sm">
                  {todaysMeeting.metrics?.totalAttendees || 0} checked in so far
                </Text>
              </View>
            </View>

            <View className="flex-row space-x-4 mt-2">
              <TouchableOpacity 
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 p-4 rounded-xl flex-row justify-center items-center shadow-md shadow-indigo-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                onPress={() => router.push({
                  pathname: '/(staff)/check-in',
                  params: { meetingId: todaysMeeting.id }
                })}
              >
                <Search color="white" size={18} />
                <Text className="text-white font-bold ml-2 text-sm">Search & Check-in</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="bg-slate-100 hover:bg-slate-200 p-4 rounded-xl flex-row justify-center items-center border border-slate-200/50 hover:scale-[1.05] active:scale-[0.95] transition-all duration-200"
                onPress={() => showAlert('Scanner', 'QR code scanner feature is coming soon!')}
              >
                <QrCode color="#475569" size={18} />
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      ) : (
        <Card className="items-center py-12 bg-white border border-slate-100 rounded-2xl shadow-sm">
          <Calendar size={48} color="#cbd5e1" />
          <Text className="text-slate-400 mt-4 text-center font-semibold">No meetings scheduled for today.</Text>
        </Card>
      )}
    </ScrollView>
  );
}
