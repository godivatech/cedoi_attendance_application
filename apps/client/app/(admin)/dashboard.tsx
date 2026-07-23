import React, { useMemo } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useAuthStore } from '../../src/store/authStore';
import { useDashboardMetrics } from '../../src/modules/dashboard/useDashboardMetrics';
import { useAllMeetings } from '../../src/modules/meetings/useAllMeetings';
import { useMembers } from '../../src/modules/members/useMembers';
import { Card } from '../../src/components/ui/Card';
import { Users, Calendar, IndianRupee, TrendingUp, Plus, UserPlus, ClipboardList, ChevronRight, AlertCircle } from 'lucide-react-native';
import { formatRupees } from '../../src/utils/currency';
import { useRouter } from 'expo-router';
import { BRAND_COLORS } from '../../src/theme/colors';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const { totalMembers, totalMeetings, totalRevenue, loading: metricsLoading } = useDashboardMetrics();
  const { meetings, loading: meetingsLoading } = useAllMeetings();
  const { members, loading: membersLoading } = useMembers();
  const router = useRouter();

  const loading = metricsLoading || meetingsLoading || membersLoading;

  const renewalStats = useMemo(() => {
    let expired = 0;
    let dueSoon = 0;
    const now = new Date();
    (members || []).forEach(m => {
      if (m.joinDate) {
        try {
          const join = new Date(m.joinDate);
          const anniversary = new Date(join);
          anniversary.setFullYear(join.getFullYear() + 1);
          const diffDays = Math.ceil((anniversary.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays < 0) expired++;
          else if (diffDays <= 30) dueSoon++;
        } catch (e) {}
      }
    });
    return { expired, dueSoon };
  }, [members]);

  // Get current greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Compile real activity from recently added members and scheduled meetings
  const getRecentActivities = () => {
    const activities: any[] = [];
    
    // Recent meetings (limit to 3)
    meetings.slice(0, 3).forEach((meeting) => {
      activities.push({
        id: `meeting-${meeting.id}`,
        type: 'meeting',
        title: 'Meeting Scheduled',
        detail: `"${meeting.title}" at ${meeting.venue}`,
        date: meeting.date,
        timestamp: (meeting as any).createdAt?.seconds || new Date(meeting.date).getTime() / 1000 || 0,
      });
    });

    // Recent members (limit to 3)
    members.slice(0, 3).forEach((member) => {
      activities.push({
        id: `member-${member.id}`,
        type: 'member',
        title: 'New Member Joined',
        detail: `${member.fullName} (${member.companyName})`,
        date: member.joinDate || 'Recently',
        timestamp: (member as any).createdAt?.seconds || new Date(member.joinDate || Date.now()).getTime() / 1000 || 0,
      });
    });

    // Sort chronologically (newest first)
    return activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  };

  if (loading) {
    return (
      <View style={{ backgroundColor: BRAND_COLORS.canvasBg }} className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
      </View>
    );
  }

  const activities = getRecentActivities();

  const getDisplayName = () => {
    if (!user?.name) return 'Admin';
    const firstWord = user.name.split(' ')[0];
    return firstWord === 'Super' ? 'Admin' : firstWord;
  };

  return (
    <ScrollView style={{ backgroundColor: BRAND_COLORS.canvasBg }} className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
      {/* Premium Header/Greeting Section */}
      <View className="mb-8 flex-row justify-between items-center">
        <View>
          <Text className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            {getGreeting()}, {getDisplayName()}
          </Text>
          <Text className="text-slate-500 mt-1 text-sm font-medium">
            Here's what's happening at CEDOI today.
          </Text>
        </View>
      </View>

      {/* Official Brand Palette Metrics Grid */}
      <View className="flex-row flex-wrap -mx-2 mb-8">
        {/* Metric 1: Total Members (Primary Deep Ocean Blue #0d5984) */}
        <View className="w-1/2 lg:w-1/4 px-2 mb-4">
          <Card className="p-4 sm:p-5 relative overflow-hidden bg-white shadow-sm rounded-2xl" style={{ borderTopWidth: 4, borderTopColor: BRAND_COLORS.primary }}>
            <View className="flex-row justify-between items-start mb-4">
              <Text className="text-slate-600 text-xs sm:text-sm font-extrabold uppercase tracking-wider">Total Members</Text>
              <View className="p-2.5 rounded-xl" style={{ backgroundColor: BRAND_COLORS.primaryLight }}>
                <Users size={18} color={BRAND_COLORS.primary} />
              </View>
            </View>
            <Text className="text-2xl sm:text-3xl font-extrabold" style={{ color: BRAND_COLORS.primary }}>{totalMembers}</Text>
            <Text className="text-slate-600 text-xs mt-2 font-semibold">Active registrations</Text>
          </Card>
        </View>

        {/* Metric 2: Total Meetings (Secondary Sky Accent #67bed9) */}
        <View className="w-1/2 lg:w-1/4 px-2 mb-4">
          <Card className="p-4 sm:p-5 relative overflow-hidden bg-white shadow-sm rounded-2xl" style={{ borderTopWidth: 4, borderTopColor: BRAND_COLORS.secondary }}>
            <View className="flex-row justify-between items-start mb-4">
              <Text className="text-slate-600 text-xs sm:text-sm font-extrabold uppercase tracking-wider">Total Meetings</Text>
              <View className="p-2.5 rounded-xl" style={{ backgroundColor: BRAND_COLORS.secondaryLight }}>
                <Calendar size={18} color={BRAND_COLORS.secondaryHover} />
              </View>
            </View>
            <Text className="text-2xl sm:text-3xl font-extrabold text-slate-800">{totalMeetings}</Text>
            <Text className="text-slate-600 text-xs mt-2 font-semibold">Scheduled & completed</Text>
          </Card>
        </View>

        {/* Metric 3: Total Revenue (Warm Amber #ec861a) */}
        <View className="w-1/2 lg:w-1/4 px-2 mb-4">
          <Card className="p-4 sm:p-5 relative overflow-hidden bg-white shadow-sm rounded-2xl" style={{ borderTopWidth: 4, borderTopColor: BRAND_COLORS.accent }}>
            <View className="flex-row justify-between items-start mb-4">
              <Text className="text-slate-600 text-xs sm:text-sm font-extrabold uppercase tracking-wider">Total Revenue</Text>
              <View className="p-2.5 rounded-xl" style={{ backgroundColor: BRAND_COLORS.accentLight }}>
                <IndianRupee size={18} color={BRAND_COLORS.accent} />
              </View>
            </View>
            <Text className="text-2xl sm:text-3xl font-extrabold" style={{ color: BRAND_COLORS.accentText }}>{formatRupees(totalRevenue)}</Text>
            <Text className="text-slate-600 text-xs mt-2 font-semibold">Collections to date</Text>
          </Card>
        </View>

        {/* Metric 4: Avg Attendance (Success Emerald #10b981) */}
        <View className="w-1/2 lg:w-1/4 px-2 mb-4">
          <Card className="p-4 sm:p-5 relative overflow-hidden bg-white shadow-sm rounded-2xl" style={{ borderTopWidth: 4, borderTopColor: BRAND_COLORS.success }}>
            <View className="flex-row justify-between items-start mb-4">
              <Text className="text-slate-600 text-xs sm:text-sm font-extrabold uppercase tracking-wider">Avg. Attendance</Text>
              <View className="p-2.5 rounded-xl" style={{ backgroundColor: BRAND_COLORS.successLight }}>
                <TrendingUp size={18} color={BRAND_COLORS.success} />
              </View>
            </View>
            <Text className="text-2xl sm:text-3xl font-extrabold text-slate-800">84%</Text>
            <Text className="text-slate-600 text-xs mt-2 font-semibold">Member turn-out rate</Text>
          </Card>
        </View>
      </View>

      {/* Main Section Grid: Activities & Quick Actions */}
      <View className="flex-col lg:flex-row lg:space-x-6">
        {/* Recent Activity Feed */}
        <View className="flex-1 mb-8">
          <Text className="text-xl font-bold text-slate-800 mb-4">Recent Activity</Text>
          <Card className="p-4 bg-white shadow-sm rounded-2xl">
            {activities.length > 0 ? (
              <View className="space-y-4">
                {activities.map((item, index) => (
                  <View key={item.id} className={`flex-row items-center py-2 ${index !== activities.length - 1 ? 'border-b border-slate-100' : ''}`}>
                    <View className="p-3 rounded-xl mr-4" style={{ backgroundColor: item.type === 'meeting' ? BRAND_COLORS.primaryLight : BRAND_COLORS.accentLight }}>
                      {item.type === 'meeting' ? (
                        <Calendar size={18} color={BRAND_COLORS.primary} />
                      ) : (
                        <Users size={18} color={BRAND_COLORS.accent} />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-slate-800">{item.title}</Text>
                      <Text className="text-xs text-slate-500 mt-0.5">{item.detail}</Text>
                    </View>
                    <Text className="text-xs text-slate-400 font-medium">{item.date}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View className="py-8 items-center justify-center">
                <Text className="text-slate-400 text-sm">No recent activities found</Text>
              </View>
            )}
          </Card>
        </View>

        {/* Quick Actions Panel */}
        <View className="w-full lg:w-80">
          <Text className="text-xl font-bold text-slate-800 mb-4">Quick Actions</Text>
          <View className="space-y-3">
            <Pressable
              onPress={() => router.push('/(admin)/create-meeting')}
              className="p-4 bg-white rounded-2xl border border-slate-100 flex-row items-center justify-between shadow-sm active:scale-[0.98] transition-transform"
            >
              <View className="flex-row items-center">
                <View className="p-2.5 rounded-xl mr-3" style={{ backgroundColor: BRAND_COLORS.primaryLight }}>
                  <Plus size={20} color={BRAND_COLORS.primary} />
                </View>
                <View>
                  <Text className="text-sm font-bold text-slate-800">Create Meeting</Text>
                  <Text className="text-xs text-slate-600">Schedule a new session</Text>
                </View>
              </View>
              <ChevronRight size={18} color="#94a3b8" />
            </Pressable>

            <Pressable
              onPress={() => router.push('/(admin)/add-member')}
              className="p-4 bg-white rounded-2xl border border-slate-100 flex-row items-center justify-between shadow-sm active:scale-[0.98] transition-transform"
            >
              <View className="flex-row items-center">
                <View className="p-2.5 rounded-xl mr-3" style={{ backgroundColor: BRAND_COLORS.secondaryLight }}>
                  <UserPlus size={20} color={BRAND_COLORS.secondaryHover} />
                </View>
                <View>
                  <Text className="text-sm font-bold text-slate-800">Add New Member</Text>
                  <Text className="text-xs text-slate-600">Register new attendance profile</Text>
                </View>
              </View>
              <ChevronRight size={18} color="#94a3b8" />
            </Pressable>

            <Pressable
              onPress={() => router.push('/(admin)/dues')}
              className="p-4 bg-white rounded-2xl border border-slate-100 flex-row items-center justify-between shadow-sm active:scale-[0.98] transition-transform"
            >
              <View className="flex-row items-center">
                <View className="p-2.5 rounded-xl mr-3" style={{ backgroundColor: BRAND_COLORS.accentLight }}>
                  <ClipboardList size={20} color={BRAND_COLORS.accent} />
                </View>
                <View>
                  <Text className="text-sm font-bold text-slate-800">Dues & Payment Hub</Text>
                  <Text className="text-xs text-slate-600">Collect fees & send reminders</Text>
                </View>
              </View>
              <ChevronRight size={18} color="#94a3b8" />
            </Pressable>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
