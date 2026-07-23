import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useMembers } from '../../src/modules/members/useMembers';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Plus, Search, Mail, Phone, Briefcase, MessageCircle, BarChart2, Edit2 } from 'lucide-react-native';
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
            <Card className="mb-4 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:border-indigo-100 transition-all">
              <View className="flex-row justify-between items-start mb-4">
                <TouchableOpacity 
                  onPress={() => router.push({ pathname: '/(admin)/member-analytics', params: { memberId: item.id } })}
                  className="flex-row items-center flex-1 mr-4"
                >
                  {/* Styled Avatar */}
                  <View className={`w-12 h-12 rounded-2xl items-center justify-center mr-4 font-bold ${getAvatarBg(item.fullName)}`}>
                    <Text className="font-extrabold text-base">{getInitials(item.fullName)}</Text>
                  </View>
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center flex-wrap gap-2">
                      <Text numberOfLines={1} className="text-lg font-bold text-slate-800 hover:text-indigo-600 truncate">
                        {item.fullName}
                      </Text>
                      {/* Renewal Status Badge */}
                      {(() => {
                        if (!item.joinDate) return null;
                        try {
                          const join = new Date(item.joinDate);
                          const anniversary = new Date(join);
                          anniversary.setFullYear(join.getFullYear() + 1);
                          const diffDays = Math.ceil((anniversary.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                          if (diffDays < 0) {
                            return (
                              <View className="flex-row items-center px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200/60">
                                <View className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5" />
                                <Text className="text-[11px] font-bold text-rose-700">Expired</Text>
                              </View>
                            );
                          } else if (diffDays <= 30) {
                            return (
                              <View className="flex-row items-center px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200/60">
                                <View className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
                                <Text className="text-[11px] font-bold text-amber-800">Renewal Due ({diffDays}d)</Text>
                              </View>
                            );
                          }
                          return (
                            <View className="flex-row items-center px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/60">
                              <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                              <Text className="text-[11px] font-bold text-emerald-700">Active</Text>
                            </View>
                          );
                        } catch (e) {
                          return null;
                        }
                      })()}
                    </View>
                    <Text numberOfLines={1} className="text-slate-500 text-sm mt-0.5 truncate">
                      {item.companyName}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Right Actions */}
                <View className="flex-row items-center gap-2">
                  <TouchableOpacity 
                    onPress={() => router.push({ pathname: '/(admin)/member-analytics', params: { memberId: item.id } })}
                    className="bg-indigo-50 hover:bg-indigo-100 p-2 px-3 rounded-xl border border-indigo-200 flex-row items-center"
                  >
                    <BarChart2 size={13} color="#4338ca" style={{ marginRight: 5 }} />
                    <Text className="text-xs font-extrabold text-indigo-700">Analytics 360°</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => router.push({ pathname: '/(admin)/add-member', params: { memberId: item.id } })}
                    className="bg-slate-50 hover:bg-slate-100 p-2 px-3 rounded-xl border border-slate-200 flex-row items-center"
                  >
                    <Edit2 size={13} color="#475569" style={{ marginRight: 4 }} />
                    <Text className="text-xs font-bold text-slate-600">Edit</Text>
                  </TouchableOpacity>
                </View>
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
                {item.joinDate && (
                  <View className="flex-row items-center px-2 mb-2 w-full sm:w-1/2 md:w-auto">
                    <Mail size={13} color="#94a3b8" />
                    <Text className="text-xs text-slate-500 ml-1.5">Joined: {item.joinDate}</Text>
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
