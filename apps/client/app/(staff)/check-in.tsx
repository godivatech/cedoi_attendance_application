import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useMembers } from '../../src/modules/members/useMembers';
import { Card } from '../../src/components/ui/Card';
import { Search, X, CheckCircle2 } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function CheckInSearchScreen() {
  const [searchTerm, setSearchTerm] = useState('');
  const { members, loading } = useMembers(searchTerm);
  const router = useRouter();
  const { meetingId } = useLocalSearchParams<{ meetingId: string }>();

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
    >
      <View className="p-4 bg-white border-b border-slate-100 shadow-sm">
        <View className="flex-row items-center bg-slate-50 border border-slate-200/50 px-4 rounded-xl">
          <Search size={18} color="#94a3b8" />
          <TextInput
            className="flex-1 p-3 text-slate-800 text-sm"
            placeholder="Search by name, company, or mobile..."
            placeholderTextColor="#94a3b8"
            value={searchTerm}
            onChangeText={setSearchTerm}
            autoFocus
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <X size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity 
            className="px-4 py-1.5"
            onPress={() => router.push({
              pathname: '/(staff)/member-detail',
              params: { memberId: item.id, meetingId }
            })}
          >
            <Card className="flex-row items-center p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:bg-slate-50">
              <View className="flex-1 min-w-0 mr-4">
                <Text className="text-lg font-bold text-slate-800 truncate">{item.fullName}</Text>
                <Text className="text-slate-400 text-xs mt-0.5 font-medium truncate">{item.companyName}</Text>
              </View>
              <CheckCircle2 size={20} color="#cbd5e1" />
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <Card className="mx-4 mt-4 items-center p-8 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <Text className="text-slate-500 font-medium">No members found.</Text>
          </Card>
        )}
      />
    </KeyboardAvoidingView>
  );
}
