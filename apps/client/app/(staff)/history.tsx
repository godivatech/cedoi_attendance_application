import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useUpcomingMeetings } from '../../src/modules/meetings/useMeetings';
import { Card } from '../../src/components/ui/Card';
import { Calendar, Users } from 'lucide-react-native';

export default function StaffHistory() {
  const { meetings, loading } = useUpcomingMeetings();

  if (loading) {
    return (
      <View style={{ backgroundColor: '#f8fafc' }} className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: '#f8fafc' }} className="flex-1 p-6">
      <Text className="text-2xl font-extrabold text-slate-800 mb-6">Meeting History</Text>
      
      <FlatList
        data={meetings}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Card className="mb-4 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
            <Text className="text-lg font-bold text-slate-800 leading-snug">{item.title}</Text>
            <View className="flex-row items-center mt-2 border-t border-slate-50 pt-2">
              <View className="flex-row items-center">
                <Calendar size={14} color="#94a3b8" />
                <Text className="text-slate-500 text-xs ml-1.5 font-medium">{item.date}</Text>
              </View>
              <View className="flex-row items-center ml-6">
                <Users size={14} color="#94a3b8" />
                <Text className="text-slate-500 text-xs ml-1.5 font-medium">{item.metrics?.totalAttendees || 0} attended</Text>
              </View>
            </View>
          </Card>
        )}
        ListEmptyComponent={() => (
          <Card className="items-center p-8 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <Text className="text-slate-500 text-center font-medium">No past meetings found.</Text>
          </Card>
        )}
      />
    </View>
  );
}
