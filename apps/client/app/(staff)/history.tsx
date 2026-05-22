import React, { useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Pressable, Modal, TextInput } from 'react-native';
import { useAllMeetings } from '../../src/modules/meetings/useAllMeetings';
import { Card } from '../../src/components/ui/Card';
import { Calendar, Users, IndianRupee, X, Search as SearchIcon, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { collection, query, getDocs, doc, writeBatch, increment } from 'firebase/firestore';
import { db } from '../../src/services/firebase';
import { formatDate } from '../../src/utils/date';
import { formatRupees } from '../../src/utils/currency';
import { showAlert } from '../../src/utils/platformAlert';

export default function StaffHistory() {
  const { meetings, loading } = useAllMeetings();

  // Attendee Modal States
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [attendeesSearch, setAttendeesSearch] = useState('');

  const handleViewAttendees = async (meeting: any) => {
    setSelectedMeeting(meeting);
    setLoadingAttendees(true);
    setAttendeesSearch('');
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

      // Update state
      setAttendees(prev => prev.map(a => a.id === attendeeId ? { ...a, paymentStatus: 'PAID', paymentMode: mode, amountCollected: fee } : a));
      showAlert('Success', 'Payment status updated successfully!');
    } catch (error: any) {
      console.error(error);
      showAlert('Error', 'Failed to resolve payment: ' + error.message);
    }
  };

  const filteredAttendees = attendees.filter(a => {
    const term = attendeesSearch.toLowerCase();
    return (
      (a.memberSnapshot?.fullName || '').toLowerCase().includes(term) ||
      (a.memberSnapshot?.companyName || '').toLowerCase().includes(term)
    );
  });

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
          <Card className="mb-4 bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <Pressable
              onPress={() => handleViewAttendees(item)}
              style={({ pressed }) => [{ opacity: pressed ? 0.95 : 1 }]}
              className="p-5"
            >
              <Text className="text-lg font-bold text-slate-800 leading-snug">{item.title}</Text>
              <View className="flex-row items-center mt-3 border-t border-slate-50 pt-3 flex-wrap">
                <View className="flex-row items-center mr-6 mb-1">
                  <Calendar size={14} color="#94a3b8" />
                  <Text className="text-slate-500 text-xs ml-1.5 font-medium">{formatDate(item.date)}</Text>
                </View>
                <View className="flex-row items-center mb-1">
                  <Users size={14} color="#94a3b8" />
                  <Text className="text-slate-500 text-xs ml-1.5 font-medium">
                    {item.metrics?.totalAttendees || 0} attended
                  </Text>
                </View>
              </View>
            </Pressable>
          </Card>
        )}
        ListEmptyComponent={() => (
          <Card className="items-center p-8 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <Text className="text-slate-500 text-center font-medium">No past meetings found.</Text>
          </Card>
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
          <View style={{ backgroundColor: '#f8fafc' }} className="flex-1 p-6">
            {/* Modal Header */}
            <View className="flex-row justify-between items-center mb-6">
              <View className="flex-1 mr-4">
                <Text className="text-2xl font-extrabold text-slate-800 tracking-tight">{selectedMeeting.title}</Text>
                <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mt-0.5">
                  {formatDate(selectedMeeting.date)} • {selectedMeeting.venue}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => setSelectedMeeting(null)}
                className="bg-slate-100 p-2 rounded-full active:scale-[0.9]"
              >
                <X size={18} color="#475569" />
              </TouchableOpacity>
            </View>

            {/* Quick Metrics */}
            <View className="flex-row -mx-1 mb-6">
              <View className="flex-1 bg-white border border-slate-100 p-4 rounded-xl mx-1 shadow-sm flex-row items-center">
                <View className="bg-indigo-50 p-2 rounded-lg mr-3">
                  <Users size={16} color="#4f46e5" />
                </View>
                <View>
                  <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Checked In</Text>
                  <Text className="text-lg font-extrabold text-slate-800">{attendees.length}</Text>
                </View>
              </View>
              <View className="flex-1 bg-white border border-slate-100 p-4 rounded-xl mx-1 shadow-sm flex-row items-center">
                <View className="bg-emerald-50 p-2 rounded-lg mr-3">
                  <IndianRupee size={16} color="#10b981" />
                </View>
                <View>
                  <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Collected</Text>
                  <Text className="text-lg font-extrabold text-emerald-600">
                    ₹{attendees.reduce((acc, curr) => acc + (curr.amountCollected || 0), 0)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Search and Action Bar */}
            <View className="mb-6">
              <Card className="flex-row items-center px-3 py-1 bg-white border border-slate-100 rounded-xl shadow-sm">
                <SearchIcon size={16} color="#94a3b8" />
                <TextInput
                  className="flex-1 ml-2 text-slate-800 py-2.5 text-xs"
                  placeholder="Filter attendees by name..."
                  placeholderTextColor="#94a3b8"
                  value={attendeesSearch}
                  onChangeText={setAttendeesSearch}
                />
              </Card>
            </View>

            {/* List */}
            {loadingAttendees ? (
              <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#4f46e5" />
              </View>
            ) : (
              <FlatList
                data={filteredAttendees}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <Card className="mb-3 bg-white border border-slate-100 p-4 rounded-xl shadow-sm flex-row justify-between items-center">
                    <View className="flex-1 mr-4">
                      <Text className="font-bold text-slate-800 text-sm">{item.memberSnapshot?.fullName}</Text>
                      <Text className="text-xs text-slate-400 mt-0.5">{item.memberSnapshot?.companyName}</Text>
                      {item.checkInTime?.seconds && (
                        <Text className="text-[10px] text-slate-400 mt-1 font-medium">
                          Checked-In: {new Date(item.checkInTime.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      )}
                    </View>

                    <View className="items-end">
                      {/* Payment Status Badge */}
                      <View className={`px-2 py-0.5 rounded-full flex-row items-center space-x-1 ${
                        item.paymentStatus === 'PAID'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : item.paymentStatus === 'WAIVED'
                          ? 'bg-slate-50 text-slate-600 border border-slate-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {item.paymentStatus === 'PAID' ? (
                          <CheckCircle2 size={10} color="#059669" />
                        ) : (
                          <AlertCircle size={10} color={item.paymentStatus === 'WAIVED' ? '#64748b' : '#d97706'} />
                        )}
                        <Text className={`text-[9px] font-extrabold uppercase tracking-wider ${
                          item.paymentStatus === 'PAID'
                            ? 'text-emerald-700'
                            : item.paymentStatus === 'WAIVED'
                            ? 'text-slate-600'
                            : 'text-amber-700'
                        }`}>
                          {item.paymentStatus}
                        </Text>
                      </View>

                      {item.paymentStatus === 'PENDING' ? (
                        <TouchableOpacity
                          onPress={() => handleMarkPaid(item.id)}
                          className="mt-2 bg-indigo-50 hover:bg-indigo-100 py-1 px-2.5 rounded-lg border border-indigo-100"
                        >
                          <Text className="text-[9px] font-extrabold text-indigo-600">COLLECT FEE</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text className="text-[10px] text-slate-400 mt-1.5 font-semibold">
                          {item.paymentMode ? `${item.paymentMode} • ₹${item.amountCollected}` : `₹${item.amountCollected}`}
                        </Text>
                      )}
                    </View>
                  </Card>
                )}
                ListEmptyComponent={() => (
                  <View className="flex-1 justify-center items-center py-10">
                    <Text className="text-slate-400 text-sm font-medium">No check-in entries found.</Text>
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
