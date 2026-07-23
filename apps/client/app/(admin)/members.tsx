import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useMembers } from '../../src/modules/members/useMembers';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Plus, Search, Mail, Phone, Briefcase, MessageCircle, BarChart2, Edit2, Calendar } from 'lucide-react-native';
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
          <Text style={{ fontSize: 26, fontWeight: '800', color: '#0d5984', letterSpacing: -0.5 }}>Members Directory</Text>
          <Text className="text-slate-500 text-sm mt-0.5">Manage member registry & performance intelligence</Text>
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
            <Card className="mb-4 bg-white border border-slate-200/80 p-4 sm:p-5 rounded-2xl shadow-sm hover:border-[#c6def0] transition-all">
              {/* Header block: Responsive stacking for Mobile vs Desktop */}
              <View className="flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                {/* Member Info Block */}
                <TouchableOpacity 
                  onPress={() => router.push({ pathname: '/(admin)/member-analytics', params: { memberId: item.id } })}
                  className="flex-row items-center flex-1"
                  activeOpacity={0.85}
                >
                  {/* Styled Avatar */}
                  <View className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl items-center justify-center mr-3 sm:mr-4 font-bold shrink-0 ${getAvatarBg(item.fullName)}`}>
                    <Text className="font-black text-base sm:text-lg">{getInitials(item.fullName)}</Text>
                  </View>
                  
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center flex-wrap gap-2">
                      <Text numberOfLines={1} className="text-base sm:text-lg font-black text-slate-900 hover:text-[#0d5984] truncate">
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
                              <View className="flex-row items-center px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200/80">
                                <View className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5" />
                                <Text className="text-xs font-extrabold text-rose-700">Expired</Text>
                              </View>
                            );
                          } else if (diffDays <= 30) {
                            return (
                              <View className="flex-row items-center px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200/80">
                                <View className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
                                <Text className="text-xs font-extrabold text-amber-800">Renewal Due ({diffDays}d)</Text>
                              </View>
                            );
                          }
                          return (
                            <View className="flex-row items-center px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80">
                              <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                              <Text className="text-xs font-extrabold text-emerald-700">Active</Text>
                            </View>
                          );
                        } catch (e) {
                          return null;
                        }
                      })()}
                    </View>
                    <Text numberOfLines={1} className="text-slate-600 text-xs sm:text-sm mt-0.5 font-semibold truncate">
                      {item.companyName || 'Member'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Right Actions: Full Width / Wrap on Mobile */}
                <View className="flex-row items-center justify-start sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <TouchableOpacity 
                    onPress={() => router.push({ pathname: '/(admin)/member-analytics', params: { memberId: item.id } })}
                    style={{ backgroundColor: '#f0f7fb', borderColor: '#c6def0', borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}
                  >
                    <BarChart2 size={14} color="#0d5984" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 12, fontWeight: '900', color: '#0d5984' }}>Analytics 360°</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => router.push({ pathname: '/(admin)/add-member', params: { memberId: item.id } })}
                    className="bg-slate-100 hover:bg-slate-200/80 p-2 px-3 rounded-xl border border-slate-300/80 flex-row items-center"
                  >
                    <Edit2 size={14} color="#334155" style={{ marginRight: 5 }} />
                    <Text className="text-xs font-extrabold text-slate-700">Edit</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Cohesive detail badges: Inline row with tight horizontal spacing */}
              <View className="flex-row flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-100 pt-3">
                {item.businessCategory && (
                  <View className="flex-row items-center">
                    <Briefcase size={14} color="#0d5984" style={{ marginRight: 6 }} />
                    <Text numberOfLines={1} className="text-xs text-slate-700 font-semibold truncate">{item.businessCategory}</Text>
                  </View>
                )}
                {item.mobileNumber && (
                  <View className="flex-row items-center">
                    <Phone size={14} color="#0d5984" style={{ marginRight: 6 }} />
                    <Text numberOfLines={1} className="text-xs text-slate-700 font-semibold truncate">{item.mobileNumber}</Text>
                  </View>
                )}
                {item.joinDate && (
                  <View className="flex-row items-center">
                    <Calendar size={14} color="#0d5984" style={{ marginRight: 6 }} />
                    <Text numberOfLines={1} className="text-xs text-slate-600 font-semibold truncate">Joined: {item.joinDate}</Text>
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
