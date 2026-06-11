import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useMembers } from '../../src/modules/members/useMembers';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Plus, Search, Mail, Phone, Briefcase } from 'lucide-react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';

export default function AdminMembers() {
  const [searchTerm, setSearchTerm] = useState('');
  const { members, loading } = useMembers(searchTerm);
  const router = useRouter();

  // Helper to get initials for avatar
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Helper to get colored background for avatar based on name length
  const getAvatarBg = (name: string) => {
    const colors = [
      'bg-indigo-100 text-indigo-700',
      'bg-purple-100 text-purple-700',
      'bg-emerald-100 text-emerald-700',
      'bg-amber-100 text-amber-700',
      'bg-pink-100 text-pink-700',
    ];
    return colors[name.length % colors.length];
  };

  return (
    <View style={{ backgroundColor: '#f8fafc' }} className="flex-1 p-4 sm:p-6">
      {/* Header */}
      <View className="flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 mb-6">
        <View>
          <Text className="text-3xl font-extrabold text-slate-800 tracking-tight">Members</Text>
          <Text className="text-slate-500 text-sm mt-0.5">Manage directory & registrations</Text>
        </View>
        <View className="mt-4 sm:mt-0 self-start sm:self-auto">
          <Button 
            label="Add Member" 
            size="md"
            onPress={() => router.push('/(admin)/add-member')} 
            className="shadow-sm"
          />
        </View>
      </View>

      {/* Real Functional Search Input */}
      <View className="mb-6 flex-row items-center px-4 bg-white border border-slate-200 rounded-xl shadow-sm h-11">
        <Search size={18} color="#94a3b8" />
        <TextInput
          className="flex-1 ml-3 text-slate-800 py-0 text-sm h-full"
          placeholder="Search members by name, company, or phone..."
          placeholderTextColor="#94a3b8"
          value={searchTerm}
          onChangeText={setSearchTerm}
          clearButtonMode="while-editing"
        />
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Card className="mb-4 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
              <View className="flex-row justify-between items-start mb-4">
                <View className="flex-row items-center flex-1 mr-4">
                  {/* Styled Avatar */}
                  <View className={`w-12 h-12 rounded-2xl items-center justify-center mr-4 font-bold ${getAvatarBg(item.fullName)}`}>
                    <Text className="font-extrabold text-base">{getInitials(item.fullName)}</Text>
                  </View>
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center flex-wrap">
                      <Text numberOfLines={1} className="text-lg font-bold text-slate-800 mr-2 truncate">
                        {item.fullName}
                      </Text>
                    </View>
                    <Text numberOfLines={1} className="text-slate-500 text-sm mt-0.5 truncate">
                      {item.companyName}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity 
                  onPress={() => router.push({ pathname: '/(admin)/add-member', params: { memberId: item.id } })}
                  className="bg-slate-50 hover:bg-slate-100 p-2 px-3.5 rounded-xl border border-slate-100 hover:scale-[1.05] active:scale-[0.95] transition-all duration-200"
                >
                  <Text className="text-xs font-bold text-slate-600">Edit</Text>
                </TouchableOpacity>
              </View>

              {/* Grid detail badges */}
              <View className="flex-row flex-wrap border-t border-slate-100 pt-4 -mx-2">
                {item.businessCategory && (
                  <View className="flex-row items-center px-2 mb-2 w-full sm:w-1/2 md:w-auto">
                    <Briefcase size={13} color="#94a3b8" />
                    <Text numberOfLines={1} className="text-xs text-slate-500 ml-1.5 truncate">{item.businessCategory}</Text>
                  </View>
                )}
                {item.mobileNumber && (
                  <View className="flex-row items-center px-2 mb-2 w-full sm:w-1/2 md:w-auto">
                    <Phone size={13} color="#94a3b8" />
                    <Text className="text-xs text-slate-500 ml-1.5">{item.mobileNumber}</Text>
                  </View>
                )}
                {item.email && (
                  <View className="flex-row items-center px-2 mb-2 w-full sm:w-1/2 md:w-auto">
                    <Mail size={13} color="#94a3b8" />
                    <Text numberOfLines={1} className="text-xs text-slate-500 ml-1.5 truncate">{item.email}</Text>
                  </View>
                )}
              </View>
            </Card>
          )}
          ListEmptyComponent={() => (
            <Card className="items-center p-8 bg-white border border-slate-100 rounded-2xl shadow-sm">
              <Text className="text-slate-500 text-center py-4 font-medium">
                No members found matching "{searchTerm}"
              </Text>
            </Card>
          )}
        />
      )}
    </View>
  );
}
