import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useAuthStore } from '../../src/store/authStore';
import { useDashboardMetrics } from '../../src/modules/dashboard/useDashboardMetrics';
import { useAllMeetings } from '../../src/modules/meetings/useAllMeetings';
import { useMembers } from '../../src/modules/members/useMembers';
import { Card } from '../../src/components/ui/Card';
import { Users, Calendar, IndianRupee, TrendingUp, Plus, UserPlus, ClipboardList, ChevronRight } from 'lucide-react-native';
import { formatRupees } from '../../src/utils/currency';
import { useRouter } from 'expo-router';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const { totalMembers, totalMeetings, totalRevenue, loading: metricsLoading } = useDashboardMetrics();
  const { meetings, loading: meetingsLoading } = useAllMeetings();
  const { members, loading: membersLoading } = useMembers();
  const router = useRouter();

  const loading = metricsLoading || meetingsLoading || membersLoading;

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

    // Recent members (sort by createdAt and limit to 3)
    const recentMembers = [...members]
      .sort((a: any, b: any) => {
        const aTime = (a as any).createdAt?.seconds || 0;
        const bTime = (b as any).createdAt?.seconds || 0;
        return bTime - aTime;
      })
      .slice(0, 3);

    recentMembers.forEach((member) => {
      activities.push({
        id: `member-${member.id}`,
        type: 'member',
        title: 'New Member Registered',
        detail: `${member.fullName} (${member.companyName})`,
        date: member.joinDate || 'Recently',
        timestamp: (member as any).createdAt?.seconds || 0,
      });
    });

    // Sort combined activities by timestamp desc
    return activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  };

  if (loading) {
    return (
      <View style={{ backgroundColor: '#f8fafc' }} className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const activities = getRecentActivities();

  return (
    <ScrollView style={{ backgroundColor: '#f8fafc' }} className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
      {/* Premium Header/Greeting Section */}
      <View className="mb-8 flex-row justify-between items-center">
        <View>
          <Text className="text-3xl font-extrabold text-slate-800 tracking-tight">
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Admin'} 👋
          </Text>
          <Text className="text-slate-500 mt-1 text-sm font-medium">
            Here's what's happening at CEDOI today.
          </Text>
        </View>
      </View>

      {/* Metrics Grid */}
      <View className="flex-row flex-wrap -mx-2 mb-8">
        <View className="w-full sm:w-1/2 lg:w-1/4 px-2 mb-4">
          <Card className="p-5 border-t-4 border-t-blue-500 relative overflow-hidden bg-white shadow-sm rounded-2xl">
            <View className="flex-row justify-between items-start mb-4">
              <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Members</Text>
              <View className="bg-blue-50 p-2.5 rounded-xl">
                <Users size={18} color="#3b82f6" />
              </View>
            </View>
            <Text className="text-3xl font-extrabold text-slate-800">{totalMembers}</Text>
            <Text className="text-slate-400 text-xs mt-2 font-medium">Active registrations</Text>
          </Card>
        </View>

        <View className="w-full sm:w-1/2 lg:w-1/4 px-2 mb-4">
          <Card className="p-5 border-t-4 border-t-purple-500 relative overflow-hidden bg-white shadow-sm rounded-2xl">
            <View className="flex-row justify-between items-start mb-4">
              <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Meetings</Text>
              <View className="bg-purple-50 p-2.5 rounded-xl">
                <Calendar size={18} color="#a855f7" />
              </View>
            </View>
            <Text className="text-3xl font-extrabold text-slate-800">{totalMeetings}</Text>
            <Text className="text-slate-400 text-xs mt-2 font-medium">Scheduled & completed</Text>
          </Card>
        </View>

        <View className="w-full sm:w-1/2 lg:w-1/4 px-2 mb-4">
          <Card className="p-5 border-t-4 border-t-emerald-500 relative overflow-hidden bg-white shadow-sm rounded-2xl">
            <View className="flex-row justify-between items-start mb-4">
              <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Revenue</Text>
              <View className="bg-emerald-50 p-2.5 rounded-xl">
                <IndianRupee size={18} color="#10b981" />
              </View>
            </View>
            <Text className="text-3xl font-extrabold text-slate-800">{formatRupees(totalRevenue)}</Text>
            <Text className="text-slate-400 text-xs mt-2 font-medium">Collections to date</Text>
          </Card>
        </View>

        <View className="w-full sm:w-1/2 lg:w-1/4 px-2 mb-4">
          <Card className="p-5 border-t-4 border-t-amber-500 relative overflow-hidden bg-white shadow-sm rounded-2xl">
            <View className="flex-row justify-between items-start mb-4">
              <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider">Avg. Attendance</Text>
              <View className="bg-amber-50 p-2.5 rounded-xl">
                <TrendingUp size={18} color="#f59e0b" />
              </View>
            </View>
            <Text className="text-3xl font-extrabold text-slate-800">84%</Text>
            <Text className="text-slate-400 text-xs mt-2 font-medium">Member turn-out rate</Text>
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
                {activities.map((activity, index) => (
                  <View 
                    key={activity.id} 
                    className={`flex-row items-center py-3 ${
                      index !== activities.length - 1 ? 'border-b border-slate-100' : ''
                    }`}
                  >
                    <View className={`w-10 h-10 rounded-xl flex items-center justify-center mr-4 ${
                      activity.type === 'meeting' 
                        ? 'bg-purple-50' 
                        : 'bg-blue-50'
                    }`}>
                      {activity.type === 'meeting' ? (
                        <Calendar size={18} color="#a855f7" />
                      ) : (
                        <UserPlus size={18} color="#3b82f6" />
                      )}
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="text-sm font-bold text-slate-700">
                        {activity.title}
                      </Text>
                      <Text className="text-xs text-slate-400 truncate mt-0.5">
                        {activity.detail}
                      </Text>
                    </View>
                    <Text className="text-xs font-semibold text-slate-400 ml-4">
                      {activity.date}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View className="items-center py-8">
                <Text className="text-slate-400">No recent activity detected.</Text>
              </View>
            )}
          </Card>
        </View>

        {/* Quick Actions Panel */}
        <View className="w-full lg:w-80 mb-8">
          <Text className="text-xl font-bold text-slate-800 mb-4">Quick Actions</Text>
          <View className="space-y-3">
            <Pressable
              onPress={() => router.push('/(admin)/create-meeting')}
              className="flex-row items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:bg-slate-50 hover:scale-[1.03] active:scale-[0.97] hover:shadow-md hover:border-slate-200 transition-all duration-300"
            >
              <View className="flex-row items-center">
                <View className="bg-blue-500 p-2.5 rounded-xl mr-3.5 shadow-sm shadow-blue-500/10">
                  <Plus size={18} color="#ffffff" />
                </View>
                <View>
                  <Text className="font-bold text-slate-700 text-sm">Create Meeting</Text>
                  <Text className="text-xs text-slate-400 font-normal">Schedule networking</Text>
                </View>
              </View>
              <ChevronRight size={16} color="#94a3b8" />
            </Pressable>

            <Pressable
              onPress={() => router.push('/(admin)/add-member')}
              className="flex-row items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:bg-slate-50 hover:scale-[1.03] active:scale-[0.97] hover:shadow-md hover:border-slate-200 transition-all duration-300"
            >
              <View className="flex-row items-center">
                <View className="bg-indigo-500 p-2.5 rounded-xl mr-3.5 shadow-sm shadow-indigo-500/10">
                  <UserPlus size={18} color="#ffffff" />
                </View>
                <View>
                  <Text className="font-bold text-slate-700 text-sm">Register Member</Text>
                  <Text className="text-xs text-slate-400 font-normal">Add attendees & guests</Text>
                </View>
              </View>
              <ChevronRight size={16} color="#94a3b8" />
            </Pressable>

            <Pressable
              onPress={() => router.push('/(admin)/reports')}
              className="flex-row items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:bg-slate-50 hover:scale-[1.03] active:scale-[0.97] hover:shadow-md hover:border-slate-200 transition-all duration-300"
            >
              <View className="flex-row items-center">
                <View className="bg-emerald-500 p-2.5 rounded-xl mr-3.5 shadow-sm shadow-emerald-500/10">
                  <ClipboardList size={18} color="#ffffff" />
                </View>
                <View>
                  <Text className="font-bold text-slate-700 text-sm">Financial Reports</Text>
                  <Text className="text-xs text-slate-400 font-normal">View collections</Text>
                </View>
              </View>
              <ChevronRight size={16} color="#94a3b8" />
            </Pressable>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
