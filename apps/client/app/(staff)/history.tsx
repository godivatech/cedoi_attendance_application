import React, { useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Pressable, Modal, TextInput } from 'react-native';
import { useAllMeetings } from '../../src/modules/meetings/useAllMeetings';
import { useMembers } from '../../src/modules/members/useMembers';
import { Calendar, Users, IndianRupee, X, Search as SearchIcon, CheckCircle2, AlertCircle, UserX, Clock, Zap, FileText } from 'lucide-react-native';
import { collection, query, getDocs, doc, writeBatch, increment } from 'firebase/firestore';
import { db } from '../../src/services/firebase';
import { formatDate } from '../../src/utils/date';
import { formatRupees } from '../../src/utils/currency';
import { showAlert } from '../../src/utils/platformAlert';

export default function StaffHistory() {
  const { meetings, loading } = useAllMeetings();
  const { members } = useMembers('');
  const totalMembersCount = members ? members.length : 0;

  // Attendee Modal States
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [attendeesSearch, setAttendeesSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'PRESENT' | 'PENDING' | 'ABSENT'>('ALL');

  const handleViewAttendees = async (meeting: any) => {
    setSelectedMeeting(meeting);
    setLoadingAttendees(true);
    setAttendeesSearch('');
    setActiveTab('ALL');
    try {
      const q = query(collection(db, `meetings/${meeting.id}/attendance`));
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAttendees(list);
    } catch (error) {
      console.error('Error fetching attendees:', error);
      showAlert('Error', 'Failed to fetch attendee records');
    } finally {
      setLoadingAttendees(false);
    }
  };

  const handleMarkPaid = async (attendeeId: string) => {
    showAlert(
      'Confirm Payment Resolution',
      `Resolve pending entry fee of ₹${selectedMeeting.entryFee || 500}?`,
      [
        {
          text: 'Pay via UPI',
          onPress: () => submitPaymentResolution(attendeeId, 'UPI')
        },
        {
          text: 'Pay via Cash',
          onPress: () => submitPaymentResolution(attendeeId, 'CASH')
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const submitPaymentResolution = async (attendeeId: string, mode: 'CASH' | 'UPI') => {
    if (!selectedMeeting) return;
    try {
      const batch = writeBatch(db);
      const attendanceRef = doc(db, `meetings/${selectedMeeting.id}/attendance`, attendeeId);
      const meetingRef = doc(db, 'meetings', selectedMeeting.id);

      const fee = selectedMeeting.entryFee || 500;

      batch.update(attendanceRef, {
        paymentStatus: 'PAID',
        paymentMode: mode,
        amountCollected: fee,
      });

      batch.update(meetingRef, {
        'metrics.totalCollected': increment(fee),
      });

      await batch.commit();

      // Update local state
      setAttendees(prev => prev.map(a => a.id === attendeeId ? { ...a, paymentStatus: 'PAID', paymentMode: mode, amountCollected: fee } : a));
      showAlert('Success', 'Payment status updated successfully!');
    } catch (error: any) {
      console.error(error);
      showAlert('Error', 'Failed to resolve payment: ' + error.message);
    }
  };

  // Helper counts for tabs
  const allCount = attendees.length;
  const presentCount = attendees.filter(a => a.paymentStatus !== 'ABSENT').length;
  const pendingCount = attendees.filter(a => a.paymentStatus === 'PENDING').length;
  const absentCount = attendees.filter(a => a.paymentStatus === 'ABSENT').length;

  const filteredAttendees = attendees.filter(a => {
    const term = attendeesSearch.toLowerCase();
    const matchesSearch =
      (a.memberSnapshot?.fullName || '').toLowerCase().includes(term) ||
      (a.memberSnapshot?.companyName || '').toLowerCase().includes(term);

    if (!matchesSearch) return false;

    if (activeTab === 'PRESENT') {
      return a.paymentStatus !== 'ABSENT';
    }
    if (activeTab === 'PENDING') {
      return a.paymentStatus === 'PENDING';
    }
    if (activeTab === 'ABSENT') {
      return a.paymentStatus === 'ABSENT';
    }
    return true;
  });

  // Search state for meeting history
  const [meetingSearch, setMeetingSearch] = useState('');

  // Check if a meeting date is today
  const isToday = (dateStr?: string) => {
    if (!dateStr) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    return dateStr === todayStr;
  };

  const filteredMeetings = meetings.filter(m => {
    const term = meetingSearch.toLowerCase();
    return (m.title || '').toLowerCase().includes(term) || (m.date || '').toLowerCase().includes(term);
  });

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  const tabs = [
    { key: 'ALL', label: 'All', count: allCount },
    { key: 'PRESENT', label: 'Present', count: presentCount },
    { key: 'PENDING', label: 'Unpaid', count: pendingCount },
    { key: 'ABSENT', label: 'Absent', count: absentCount },
  ] as const;

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc', padding: 20 }}>
      {/* Header & Title */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#0f172a' }}>Meeting History</Text>
        <Text style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Track live attendance & view past meeting ledgers</Text>
      </View>

      {/* Quick Search Bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, height: 44, marginBottom: 16, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 }}>
        <SearchIcon size={16} color="#94a3b8" />
        <TextInput
          style={{ flex: 1, paddingHorizontal: 10, fontSize: 14, color: '#334155' }}
          placeholder="Search meetings by title or date..."
          placeholderTextColor="#94a3b8"
          value={meetingSearch}
          onChangeText={setMeetingSearch}
        />
        {meetingSearch.length > 0 && (
          <TouchableOpacity onPress={() => setMeetingSearch('')}>
            <X size={16} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredMeetings}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const live = isToday(item.date);
          const totalAttended = item.metrics?.totalAttendees || 0;
          const totalCollected = item.metrics?.totalCollected || 0;

          return (
            <View style={{
              marginBottom: 16,
              backgroundColor: '#fff',
              borderColor: live ? '#cbd5e1' : '#f1f5f9',
              borderWidth: live ? 1.5 : 1,
              borderRadius: 16,
              elevation: 2,
              shadowColor: '#0f172a',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
              padding: 18
            }}>
              {/* Top Status & Title Row */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: '#0f172a', lineHeight: 22 }}>{item.title}</Text>
                </View>

                {/* Status Badge */}
                {live ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e', marginRight: 6 }} />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#15803d', textTransform: 'uppercase' }}>Live Today</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                    <CheckCircle2 size={12} color="#64748b" style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>Completed</Text>
                  </View>
                )}
              </View>

              {/* Date, Time & Stats Row */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', itemsCenter: 'center', gap: 14, borderTopWidth: 1, borderColor: '#f8fafc', paddingTop: 12, marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Calendar size={14} color="#94a3b8" />
                  <Text style={{ color: '#64748b', fontSize: 12, marginLeft: 6, fontWeight: '600' }}>{formatDate(item.date)}</Text>
                </View>

                {item.startTime ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Clock size={14} color="#94a3b8" />
                    <Text style={{ color: '#4f46e5', fontSize: 12, marginLeft: 6, fontWeight: '700' }}>{item.startTime}</Text>
                  </View>
                ) : null}

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Users size={14} color="#94a3b8" />
                  <Text style={{ color: '#64748b', fontSize: 12, marginLeft: 6, fontWeight: '600' }}>
                    {totalMembersCount > 0 ? `${totalAttended} / ${totalMembersCount} Attended` : `${totalAttended} Attended`}
                  </Text>
                </View>

                {totalCollected > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <IndianRupee size={13} color="#166534" />
                    <Text style={{ color: '#166534', fontSize: 12, marginLeft: 2, fontWeight: '700' }}>
                      {formatRupees(totalCollected)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Action Buttons Row */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {live ? (
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: '/(staff)/check-in', params: { meetingId: item.id } })}
                    style={{ flex: 1, backgroundColor: '#4f46e5', paddingVertical: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Zap size={14} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>Open Check-In</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  onPress={() => handleViewAttendees(item)}
                  style={{ flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' }}
                >
                  <FileText size={14} color="#334155" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#334155', fontWeight: '700', fontSize: 13 }}>View Ledger</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={() => (
          <View style={{ alignItems: 'center', padding: 32, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9' }}>
            <Text style={{ color: '#64748b', textAlign: 'center', fontWeight: '500' }}>No meetings found matching "{meetingSearch}".</Text>
          </View>
        )}
      />

      {/* Attendee Ledger Modal */}
      {selectedMeeting && (
        <Modal
          visible={!!selectedMeeting}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setSelectedMeeting(null)}
        >
          <View style={{ flex: 1, backgroundColor: '#f8fafc', padding: 24 }}>
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <View style={{ flex: 1, marginRight: 16 }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#1e293b', letterSpacing: -0.3 }}>{selectedMeeting.title}</Text>
                <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '600', marginTop: 4 }}>
                  {formatDate(selectedMeeting.date)} • {selectedMeeting.venue}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedMeeting(null)}
                style={{ backgroundColor: '#f1f5f9', padding: 8, borderRadius: 20 }}
              >
                <X size={18} color="#475569" />
              </TouchableOpacity>
            </View>

            {/* Quick Metrics */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              <View style={{ flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f1f5f9', padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 }}>
                <View style={{ backgroundColor: '#eff6ff', padding: 8, borderRadius: 10, marginRight: 12 }}>
                  <Users size={16} color="#4f46e5" />
                </View>
                <View>
                  <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Present</Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#1e293b', marginTop: 2 }}>{presentCount}</Text>
                </View>
              </View>

              <View style={{ flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f1f5f9', padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 }}>
                <View style={{ backgroundColor: '#e6f4ea', padding: 8, borderRadius: 10, marginRight: 12 }}>
                  <IndianRupee size={16} color="#059669" />
                </View>
                <View>
                  <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Collected</Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#059669', marginTop: 2 }}>
                    ₹{attendees.reduce((acc, curr) => acc + (curr.amountCollected || 0), 0)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Search Input */}
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1, height: 44 }}>
                <SearchIcon size={16} color="#94a3b8" />
                <TextInput
                  style={{ flex: 1, marginLeft: 8, color: '#1e293b', fontSize: 14, height: '100%', paddingVertical: 0 }}
                  placeholder="Filter attendees by name..."
                  placeholderTextColor="#94a3b8"
                  value={attendeesSearch}
                  onChangeText={setAttendeesSearch}
                />
              </View>
            </View>

            {/* Segmented Filter Tab */}
            <View style={{ flexDirection: 'row', backgroundColor: '#e2e8f0', padding: 4, borderRadius: 12, marginBottom: 16 }}>
              {tabs.map(tab => (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 10,
                    backgroundColor: activeTab === tab.key ? '#fff' : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: activeTab === tab.key ? '#000' : 'transparent',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.08,
                    shadowRadius: 2,
                    elevation: activeTab === tab.key ? 1 : 0,
                  }}
                >
                  <Text style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: activeTab === tab.key ? '#1e293b' : '#64748b'
                  }}>
                    {tab.label} ({tab.count})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* List */}
            {loadingAttendees ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#4f46e5" />
              </View>
            ) : (
              <FlatList
                data={filteredAttendees}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isItemAbsent = item.paymentStatus === 'ABSENT';

                  // Setup custom styling for row badges
                  let badgeBg = '#fff7ed';
                  let badgeText = '#ea580c';
                  let badgeBorder = '#ffedd5';
                  let badgeIcon = <AlertCircle size={10} color="#ea580c" />;

                  if (item.paymentStatus === 'PAID') {
                    badgeBg = '#e6f4ea';
                    badgeText = '#059669';
                    badgeBorder = '#d1fae5';
                    badgeIcon = <CheckCircle2 size={10} color="#059669" />;
                  } else if (item.paymentStatus === 'WAIVED') {
                    badgeBg = '#eff6ff';
                    badgeText = '#1d4ed8';
                    badgeBorder = '#bfdbfe';
                    badgeIcon = <CheckCircle2 size={10} color="#1d4ed8" />;
                  } else if (isItemAbsent) {
                    badgeBg = '#fef2f2';
                    badgeText = '#ef4444';
                    badgeBorder = '#fee2e2';
                    badgeIcon = <UserX size={10} color="#ef4444" />;
                  }

                  return (
                    <View style={{ marginBottom: 10, backgroundColor: '#fff', borderColor: '#f1f5f9', borderWidth: 1, padding: 16, borderRadius: 14, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flex: 1, marginRight: 16 }}>
                        <Text style={{ fontWeight: '700', color: '#1e293b', fontSize: 14 }}>{item.memberSnapshot?.fullName}</Text>
                        <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 2, fontWeight: '500' }}>{item.memberSnapshot?.companyName}</Text>
                        {item.checkInTime?.seconds && !isItemAbsent && (
                          <Text style={{ fontSize: 10, color: '#94a3b8', marginTop: 6, fontWeight: '600' }}>
                            Checked-In: {new Date(item.checkInTime.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </Text>
                        )}
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        {/* Custom status badge */}
                        <View style={{
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 20,
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: badgeBg,
                          borderColor: badgeBorder,
                          borderWidth: 1,
                          gap: 4
                        }}>
                          {badgeIcon}
                          <Text style={{ fontSize: 9, fontWeight: '800', textTransform: 'uppercase', color: badgeText }}>
                            {item.paymentStatus}
                          </Text>
                        </View>

                        {item.paymentStatus === 'PENDING' ? (
                          <TouchableOpacity
                            onPress={() => handleMarkPaid(item.id)}
                            style={{
                              marginTop: 8,
                              backgroundColor: '#eff6ff',
                              paddingVertical: 4,
                              paddingHorizontal: 10,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: '#bfdbfe'
                            }}
                          >
                            <Text style={{ fontSize: 9, fontWeight: '800', color: '#1d4ed8' }}>COLLECT FEE</Text>
                          </TouchableOpacity>
                        ) : (
                          !isItemAbsent && (
                            <Text style={{ fontSize: 10, color: '#64748b', marginTop: 8, fontWeight: '700' }}>
                              {item.paymentMode ? `${item.paymentMode} • ₹${item.amountCollected}` : `₹${item.amountCollected}`}
                            </Text>
                          )
                        )}
                      </View>
                    </View>
                  );
                }}
                ListEmptyComponent={() => (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
                    <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: '600' }}>No matching records found.</Text>
                  </View>
                )}
              />
            )}
          </View>
        </Modal>
      )}
    </View>
  );
}
