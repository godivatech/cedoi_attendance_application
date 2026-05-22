import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { useMembers } from '../../src/modules/members/useMembers';
import { Search, X, UserCheck, UserX, Clock, ChevronRight } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../src/services/firebase';

export default function CheckInSearchScreen() {
  const [searchTerm, setSearchTerm] = useState('');
  const { members, loading } = useMembers(searchTerm);
  const router = useRouter();
  const { meetingId } = useLocalSearchParams<{ meetingId: string }>();

  // Live attendance map: memberId -> paymentStatus
  const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!meetingId) return;
    const unsub = onSnapshot(
      collection(db, `meetings/${meetingId}/attendance`),
      (snap) => {
        const map: Record<string, string> = {};
        snap.forEach(d => { map[d.id] = d.data().paymentStatus; });
        setAttendanceMap(map);
      }
    );
    return () => unsub();
  }, [meetingId]);

  const checkedInCount = Object.values(attendanceMap).filter(val => val !== 'ABSENT').length;

  const getStatusInfo = (memberId: string) => {
    if (!(memberId in attendanceMap)) return null;
    return attendanceMap[memberId]; // PAID, PENDING, WAIVED, ABSENT
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
    >
      {/* Header */}
      <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f1f5f9', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#0f172a' }}>Member Check-in</Text>
          <View style={{ backgroundColor: '#eff6ff', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#4f46e5' }}>{checkedInCount} present</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, height: 46 }}>
          <Search size={16} color="#94a3b8" />
          <TextInput
            style={{ flex: 1, paddingHorizontal: 10, fontSize: 14, color: '#334155' }}
            placeholder="Search by name, company, mobile..."
            placeholderTextColor="#94a3b8"
            value={searchTerm}
            onChangeText={setSearchTerm}
            autoFocus
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <X size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => {
            const status = getStatusInfo(item.id);
            const isAbsent = status === 'ABSENT';
            const isPresent = status !== null && status !== undefined && !isAbsent;

            let cardBorderColor = '#f1f5f9';
            let avatarBg = '#f1f5f9';
            let avatarColor = '#94a3b8';

            if (isPresent) {
              cardBorderColor = '#d1fae5';
              avatarBg = '#d1fae5';
              avatarColor = '#059669';
            } else if (isAbsent) {
              cardBorderColor = '#fee2e2';
              avatarBg = '#fee2e2';
              avatarColor = '#ef4444';
            }

            return (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push({
                  pathname: '/(staff)/member-detail',
                  params: { memberId: item.id, meetingId }
                })}
              >
                <View style={{
                  backgroundColor: '#fff',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: cardBorderColor,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  shadowColor: '#0f172a',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 6,
                  elevation: 1,
                }}>
                  {/* Avatar Circle */}
                  <View style={{
                    width: 44, height: 44, borderRadius: 22,
                    backgroundColor: avatarBg,
                    justifyContent: 'center', alignItems: 'center', marginRight: 14
                  }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: avatarColor }}>
                      {item.fullName.charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  {/* Info */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#0f172a' }}>{item.fullName}</Text>
                    <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '500', marginTop: 2 }}>{item.companyName}</Text>
                  </View>

                  {/* Status Badge */}
                  {isPresent ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#d1fae5', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, marginRight: 8 }}>
                      <UserCheck size={13} color="#059669" />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#059669', marginLeft: 4 }}>
                        {status === 'PENDING' ? 'Present · Pending' : status === 'WAIVED' ? 'Present · Waived' : 'Present · Paid'}
                      </Text>
                    </View>
                  ) : isAbsent ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fee2e2', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, marginRight: 8 }}>
                      <UserX size={13} color="#ef4444" />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#ef4444', marginLeft: 4 }}>
                        Absent
                      </Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' }}>
                      <Clock size={13} color="#94a3b8" />
                      <Text style={{ fontSize: 11, fontWeight: '600', color: '#94a3b8', marginLeft: 4 }}>Not marked</Text>
                    </View>
                  )}

                  <ChevronRight size={16} color="#cbd5e1" />
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={() => (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <UserX size={40} color="#e2e8f0" />
              <Text style={{ color: '#94a3b8', fontWeight: '600', marginTop: 12 }}>No members found</Text>
            </View>
          )}
        />
      )}
    </KeyboardAvoidingView>
  );
}
