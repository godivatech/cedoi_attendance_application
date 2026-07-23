import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useUpcomingMeetings } from '../../src/modules/meetings/useMeetings';
import { Card } from '../../src/components/ui/Card';
import { Calendar, MapPin, Users, ChevronRight, Clock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { formatDate } from '../../src/utils/date';
import { BRAND_COLORS } from '../../src/theme/colors';

export default function StaffToday() {
  const { meetings, loading } = useUpcomingMeetings();
  const router = useRouter();

  if (loading) {
    return (
      <View style={{ backgroundColor: BRAND_COLORS.canvasBg }} className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
      </View>
    );
  }

  const todaysMeeting = meetings[0];

  return (
    <ScrollView style={{ backgroundColor: BRAND_COLORS.canvasBg }} className="flex-1">
      {/* Header */}
      <View className="px-6 pt-8 pb-4">
        <Text style={{ fontSize: 26, fontWeight: '800', color: BRAND_COLORS.primary, letterSpacing: -0.5 }}>Today's Meeting</Text>
        <Text className="text-slate-500 text-sm mt-1 font-medium">{formatDate(new Date())}</Text>
      </View>

      {todaysMeeting ? (
        <View className="px-6">
          {/* Meeting Card with Official CEDOI Brand Palette */}
          <View style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: BRAND_COLORS.border, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 3, overflow: 'hidden', marginBottom: 20 }}>
            {/* Status Banner */}
            <View style={{ backgroundColor: BRAND_COLORS.primary, paddingVertical: 12, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: todaysMeeting.status === 'ONGOING' ? '#10b981' : BRAND_COLORS.secondary, marginRight: 10 }} />
              <Text style={{ color: 'white', fontWeight: '800', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                {todaysMeeting.status === 'ONGOING' ? 'In Progress' : todaysMeeting.status}
              </Text>
            </View>

            <View style={{ padding: 24 }}>
              <Text style={{ fontSize: 24, fontWeight: '800', color: BRAND_COLORS.textHeading, marginBottom: 16, lineHeight: 30 }}>
                {todaysMeeting.title}
              </Text>

              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: BRAND_COLORS.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
                    <Calendar size={18} color={BRAND_COLORS.primary} />
                  </View>
                  <View>
                    <Text style={{ color: BRAND_COLORS.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Date</Text>
                    <Text style={{ color: BRAND_COLORS.textHeading, fontSize: 14, fontWeight: '600', marginTop: 1 }}>{formatDate(todaysMeeting.date)}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: BRAND_COLORS.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
                    <Clock size={18} color={BRAND_COLORS.primary} />
                  </View>
                  <View>
                    <Text style={{ color: BRAND_COLORS.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Time</Text>
                    <Text style={{ color: BRAND_COLORS.textHeading, fontSize: 14, fontWeight: '600', marginTop: 1 }}>{todaysMeeting.startTime} – {todaysMeeting.endTime}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: BRAND_COLORS.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
                    <MapPin size={18} color={BRAND_COLORS.primary} />
                  </View>
                  <View>
                    <Text style={{ color: BRAND_COLORS.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Venue</Text>
                    <Text style={{ color: BRAND_COLORS.textHeading, fontSize: 14, fontWeight: '600', marginTop: 1 }}>{todaysMeeting.venue}</Text>
                  </View>
                </View>
              </View>

              {/* Stats Row */}
              <View style={{ flexDirection: 'row', marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderColor: BRAND_COLORS.border, gap: 12 }}>
                <View style={{ flex: 1, backgroundColor: BRAND_COLORS.primaryLight, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: BRAND_COLORS.primaryBorder }}>
                  <Text style={{ fontSize: 28, fontWeight: '800', color: BRAND_COLORS.primary }}>{todaysMeeting.metrics?.totalAttendees || 0}</Text>
                  <Text style={{ fontSize: 11, color: BRAND_COLORS.primary, fontWeight: '700', marginTop: 2 }}>Checked In</Text>
                </View>

                <View style={{ flex: 1, backgroundColor: BRAND_COLORS.accentLight, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: BRAND_COLORS.accentBorder }}>
                  <Text style={{ fontSize: 28, fontWeight: '800', color: BRAND_COLORS.accentText }}>₹{todaysMeeting.metrics?.totalCollected || 0}</Text>
                  <Text style={{ fontSize: 11, color: BRAND_COLORS.accentText, fontWeight: '700', marginTop: 2 }}>Collected</Text>
                </View>
              </View>
            </View>

            {/* Check-in CTA Button (Brand Deep Ocean Blue #0d5984) */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={{ margin: 20, marginTop: 0, backgroundColor: BRAND_COLORS.primary, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
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
