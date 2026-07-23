import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { useMembers } from '../../src/modules/members/useMembers';
import { Search, X, UserCheck, UserX, Clock, ChevronRight } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../src/services/firebase';

export default function CheckInSearchScreen() {
  const [searchTerm, setSearchTerm] = useState('');
  const { members, loading } = useMembers(searchTerm);
  const router = useRouter();
  const { meetingId } = useLocalSearchParams<{ meetingId: string }>();

  // Live meeting metadata
  const [meetingInfo, setMeetingInfo] = useState<{ title?: string; date?: string; startTime?: string } | null>(null);

  // Live attendance map: memberId -> paymentStatus
  const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!meetingId) return;

    // Fetch meeting details (title, date, startTime)
    const unsubMeeting = onSnapshot(doc(db, 'meetings', meetingId), (d) => {
      if (d.exists()) {
        const data = d.data();
        setMeetingInfo({
          title: data.title || 'General Meeting',
          date: data.date || '',
          startTime: data.startTime || ''
        });
      }
    });

    const unsubAttendance = onSnapshot(
      collection(db, `meetings/${meetingId}/attendance`),
      (snap) => {
        const map: Record<string, string> = {};
        snap.forEach(d => { map[d.id] = d.data().paymentStatus; });
        setAttendanceMap(map);
      }
    );
    return () => {
      unsubMeeting();
      unsubAttendance();
    };
  }, [meetingId]);

  const presentCount = Object.values(attendanceMap).filter(val => val !== 'ABSENT').length;
  const absentCount = Object.values(attendanceMap).filter(val => val === 'ABSENT').length;
  const pendingCount = Math.max(0, members.length - (presentCount + absentCount));

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
      <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f1f5f9', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#0d5984', letterSpacing: -0.5 }}>Member Check-in</Text>
          <View style={{ backgroundColor: '#f0f7fb', borderColor: '#c6def0', borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#0d5984' }}>{presentCount} present</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, height: 46, marginBottom: 14 }}>
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

        {/* Smart Live Meeting Info Box */}
        <View style={{ backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 14, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' }} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#15803d', textTransform: 'uppercase', letterSpacing: 0.5 }}>Active Meeting</Text>
              </View>
              <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>
                {meetingInfo?.title || 'General Meeting'}
              </Text>
            </View>

            {meetingInfo?.date || meetingInfo?.startTime ? (
              <View style={{ alignItems: 'flex-end', backgroundColor: '#f0f7fb', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: '#c6def0' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>{meetingInfo.date || 'Today'}</Text>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#0d5984' }}>{meetingInfo.startTime || '09:00 AM'}</Text>
              </View>
            ) : null}
          </View>

          {/* Stat Cards Grid */}
          <View style={{ flexDirection: 'row', gap: 8, borderTopWidth: 1, borderColor: '#e2e8f0', paddingTop: 12 }}>
            <View style={{ flex: 1, backgroundColor: '#f0f7fb', paddingVertical: 10, paddingHorizontal: 6, borderRadius: 12, borderWidth: 1, borderColor: '#c6def0', alignItems: 'center' }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#0d5984', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total</Text>
              <Text style={{ fontSize: 17, fontWeight: '900', color: '#0f172a', marginTop: 2 }}>{members.length}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#f0fdf4', paddingVertical: 10, paddingHorizontal: 6, borderRadius: 12, borderWidth: 1, borderColor: '#bbf7d0', alignItems: 'center' }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#166534', textTransform: 'uppercase', letterSpacing: 0.5 }}>Present</Text>
              <Text style={{ fontSize: 17, fontWeight: '900', color: '#15803d', marginTop: 2 }}>{presentCount}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#fef2f2', paddingVertical: 10, paddingHorizontal: 6, borderRadius: 12, borderWidth: 1, borderColor: '#fecaca', alignItems: 'center' }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#991b1b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Absent</Text>
              <Text style={{ fontSize: 17, fontWeight: '900', color: '#b91c1c', marginTop: 2 }}>{absentCount}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#fffbeb', paddingVertical: 10, paddingHorizontal: 6, borderRadius: 12, borderWidth: 1, borderColor: '#fde68a', alignItems: 'center' }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#92400e', textTransform: 'uppercase', letterSpacing: 0.5 }}>Pending</Text>
              <Text style={{ fontSize: 17, fontWeight: '900', color: '#b45309', marginTop: 2 }}>{pendingCount}</Text>
            </View>
          </View>
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
                    (() => {
                      let badgeBg = '#d1fae5';
                      let badgeTextColor = '#059669';
                      let badgeIcon = <UserCheck size={13} color="#059669" />;
                      let label = 'Present · Paid';

                      if (status === 'PENDING') {
                        badgeBg = '#fff7ed';
                        badgeTextColor = '#ea580c';
                        badgeIcon = <Clock size={13} color="#ea580c" />;
                        label = 'Present · Pending';
                      } else if (status === 'WAIVED') {
                        badgeBg = '#eff6ff';
                        badgeTextColor = '#1d4ed8';
                        badgeIcon = <UserCheck size={13} color="#1d4ed8" />;
                        label = 'Present · Waived';
                      }

                      return (
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: badgeBg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, marginRight: 8 }}>
                          {badgeIcon}
                          <Text style={{ fontSize: 11, fontWeight: '700', color: badgeTextColor, marginLeft: 4 }}>
                            {label}
                          </Text>
                        </View>
                      );
                    })()
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
