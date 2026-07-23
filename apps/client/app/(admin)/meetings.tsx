import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput, ScrollView, Pressable } from 'react-native';
import { useAllMeetings } from '../../src/modules/meetings/useAllMeetings';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Calendar, MapPin, Users, IndianRupee, Clock, X, Search as SearchIcon, CheckCircle2, AlertCircle, Download } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { formatDate } from '../../src/utils/date';
import { formatRupees } from '../../src/utils/currency';
import { collection, query, getDocs, doc, writeBatch, increment } from 'firebase/firestore';
import { db } from '../../src/services/firebase';
import { showAlert } from '../../src/utils/platformAlert';

export default function AdminMeetings() {
  const { meetings, loading } = useAllMeetings();
  const router = useRouter();

  // Attendee Modal States
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [attendeesSearch, setAttendeesSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'PRESENT' | 'PENDING' | 'ABSENT'>('ALL');

  // Helper to style status badges
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'ONGOING':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
      case 'COMPLETED':
        return 'bg-[#f0f7fb] text-[#0d5984] border border-[#c6def0]';
      case 'SCHEDULED':
      default:
        return 'bg-amber-50 text-amber-700 border border-amber-100';
    }
  };

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

  const handleExportAttendeesCSV = () => {
    if (!selectedMeeting || attendees.length === 0) {
      showAlert('Info', 'No attendee records to export');
      return;
    }
    const headers = ['Member Name', 'Company Name', 'Check-In Time', 'Payment Status', 'Payment Mode', 'Amount Collected'];
    const rows = attendees.map(a => [
      a.memberSnapshot?.fullName || 'N/A',
      a.memberSnapshot?.companyName || 'N/A',
      a.checkInTime?.seconds ? new Date(a.checkInTime.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A',
      a.paymentStatus || 'N/A',
      a.paymentMode || 'N/A',
      a.amountCollected || 0
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    if (typeof window !== 'undefined' && window.document) {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Attendees_${selectedMeeting.title.replace(/\s+/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      showAlert('CSV Generated', `Exported ${attendees.length} records. Content preview:\n\n` + csvContent.slice(0, 300) + '...');
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

  return (
    <View style={{ backgroundColor: '#f8fafc' }} className="flex-1 p-4 sm:p-6">
      {/* Header */}
      <View className="flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 mb-6">
        <View>
          <Text className="text-3xl font-extrabold text-slate-800 tracking-tight">Meetings</Text>
          <Text className="text-slate-500 text-sm mt-0.5">Manage schedules & collections</Text>
        </View>
        <View className="mt-4 sm:mt-0 self-start sm:self-auto">
          <Button 
            label="Create Meeting" 
            size="md"
            onPress={() => router.push('/(admin)/create-meeting')} 
            className="shadow-sm"
          />
        </View>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : (
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
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1 mr-4">
                    <Text className="text-xl font-bold text-slate-800 leading-snug">{item.title}</Text>
                    
                    {/* Date & Time Row */}
                    <View className="flex-row items-center mt-2 flex-wrap">
                      <View className="flex-row items-center mr-4 mb-1">
                        <Calendar size={13} color="#94a3b8" />
                        <Text className="text-slate-500 text-xs ml-1.5 font-medium">
                          {formatDate(item.date)}
                        </Text>
                      </View>
                      <View className="flex-row items-center mb-1">
                        <Clock size={13} color="#94a3b8" />
                        <Text className="text-slate-500 text-xs ml-1.5 font-medium">
                          {item.startTime} • {item.endTime || 'End'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Status & Edit Block */}
                  <View className="items-end">
                    <View className={`px-3 py-1 rounded-full ${getStatusStyle(item.status)}`}>
                      <Text className="text-[10px] font-extrabold tracking-wide uppercase">
                        {item.status}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => router.push({ pathname: '/(admin)/create-meeting', params: { meetingId: item.id } })}
                      className="mt-3 bg-slate-50 hover:bg-slate-100 py-1.5 px-3 rounded-lg border border-slate-100 hover:scale-[1.05] active:scale-[0.95] transition-all duration-150"
                    >
                      <Text className="text-[10px] font-bold text-slate-600">Edit</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Venue details */}
                <View className="flex-row items-center mb-4">
                  <MapPin size={13} color="#94a3b8" />
                  <Text numberOfLines={1} className="text-slate-500 text-xs ml-1.5 font-medium truncate flex-1">{item.venue}</Text>
                </View>

                {/* Metrics Summary Area */}
                <View className="flex-row border-t border-slate-100 pt-4 mt-2">
                  {/* Total Attended Metric */}
                  <View className="flex-1 flex-row items-center bg-slate-50 p-2.5 sm:p-3 rounded-xl mr-2">
                    <View className="bg-indigo-100 p-1.5 rounded-lg mr-2">
                      <Users size={14} color="#4f46e5" />
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text numberOfLines={1} className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider">Attended</Text>
                      <Text numberOfLines={1} className="font-extrabold text-slate-800 text-sm sm:text-base">
                        {item.metrics?.totalAttendees || 0}
                      </Text>
                    </View>
                  </View>

                  {/* Total Collected Metric */}
                  <View className="flex-1 flex-row items-center bg-slate-50 p-2.5 sm:p-3 rounded-xl ml-2">
                    <View className="bg-emerald-100 p-1.5 rounded-lg mr-2">
                      <IndianRupee size={14} color="#10b981" />
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text numberOfLines={1} className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider">Collected</Text>
                      <Text numberOfLines={1} className="font-extrabold text-emerald-600 text-sm sm:text-base">
                        {formatRupees(item.metrics?.totalCollected || 0)}
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            </Card>
          )}
          ListEmptyComponent={() => (
            <Card className="items-center p-8 bg-white border border-slate-100 rounded-2xl shadow-sm">
              <Text className="text-slate-500 text-center py-4 font-medium">
                No meetings scheduled yet.
              </Text>
            </Card>
          )}
        />
      )}

      {/* Attendee Registry Viewer Modal */}
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
                  <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Present</Text>
                  <Text className="text-lg font-extrabold text-slate-800">
                    {attendees.filter(a => a.paymentStatus !== 'ABSENT').length}
                  </Text>
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
            <View className="flex-row space-x-3 mb-4 items-center">
              <View className="flex-1 flex-row items-center px-3 bg-white border border-slate-200 rounded-xl shadow-sm h-11">
                <SearchIcon size={16} color="#94a3b8" />
                <TextInput
                  className="flex-1 ml-2 text-slate-800 py-0 text-sm h-full"
                  placeholder="Filter attendees by name..."
                  placeholderTextColor="#94a3b8"
                  value={attendeesSearch}
                  onChangeText={setAttendeesSearch}
                />
              </View>
              <TouchableOpacity 
                onPress={handleExportAttendeesCSV}
                style={{ backgroundColor: '#0d5984', width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
              >
                <Download color="white" size={16} />
              </TouchableOpacity>
            </View>

            {/* Segmented Filter Tabs */}
            <View className="flex-row bg-slate-100 p-1 rounded-xl mb-4">
              {[
                { key: 'ALL', label: 'All', count: attendees.length },
                { key: 'PRESENT', label: 'Present', count: attendees.filter(a => a.paymentStatus !== 'ABSENT').length },
                { key: 'PENDING', label: 'Unpaid', count: attendees.filter(a => a.paymentStatus === 'PENDING').length },
                { key: 'ABSENT', label: 'Absent', count: attendees.filter(a => a.paymentStatus === 'ABSENT').length },
              ].map(tab => {
                const isActive = activeTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    onPress={() => setActiveTab(tab.key as any)}
                    className={`flex-1 py-2 rounded-lg items-center justify-center ${isActive ? 'bg-white shadow-sm' : ''}`}
                  >
                    <Text className={`text-[10px] font-bold ${isActive ? 'text-slate-800' : 'text-slate-500'}`}>
                      {tab.label} ({tab.count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* List */}
            {loadingAttendees ? (
              <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#4f46e5" />
              </View>
            ) : (
              <FlatList
                data={attendees.filter(a => {
                  const term = attendeesSearch.toLowerCase();
                  const matchesSearch = 
                    (a.memberSnapshot?.fullName || '').toLowerCase().includes(term) ||
                    (a.memberSnapshot?.companyName || '').toLowerCase().includes(term);

                  if (!matchesSearch) return false;
                  if (activeTab === 'PRESENT') return a.paymentStatus !== 'ABSENT';
                  if (activeTab === 'PENDING') return a.paymentStatus === 'PENDING';
                  if (activeTab === 'ABSENT') return a.paymentStatus === 'ABSENT';
                  return true;
                })}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isItemAbsent = item.paymentStatus === 'ABSENT';
                  return (
                    <Card className="mb-3 bg-white border border-slate-100 p-4 rounded-xl shadow-sm flex-row justify-between items-center">
                      <View className="flex-1 mr-4">
                        <Text className="font-bold text-slate-800 text-sm">{item.memberSnapshot?.fullName}</Text>
                        <Text className="text-xs text-slate-400 mt-0.5">{item.memberSnapshot?.companyName}</Text>
                        {item.checkInTime?.seconds && !isItemAbsent && (
                          <Text className="text-[10px] text-slate-400 mt-1 font-medium">
                            Checked-In: {new Date(item.checkInTime.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </Text>
                        )}
                      </View>

                      <View className="items-end">
                        {/* Payment Status Badge */}
                        <View className={`px-2 py-0.5 rounded-full flex-row items-center space-x-1 ${
                          item.paymentStatus === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : item.paymentStatus === 'WAIVED'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                            : item.paymentStatus === 'ABSENT'
                            ? 'bg-red-50 text-red-700 border border-red-100'
                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {item.paymentStatus === 'PAID' ? (
                            <CheckCircle2 size={10} color="#059669" />
                          ) : (
                            <AlertCircle size={10} color={item.paymentStatus === 'ABSENT' ? '#ef4444' : item.paymentStatus === 'WAIVED' ? '#4f46e5' : '#d97706'} />
                          )}
                          <Text className={`text-[9px] font-extrabold uppercase tracking-wider ${
                            item.paymentStatus === 'PAID'
                              ? 'text-emerald-700'
                              : item.paymentStatus === 'WAIVED'
                              ? 'text-indigo-700'
                              : item.paymentStatus === 'ABSENT'
                              ? 'text-red-700'
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
                          !isItemAbsent && (
                            <Text className="text-[10px] text-slate-400 mt-1.5 font-semibold">
                              {item.paymentMode ? `${item.paymentMode} • ₹${item.amountCollected}` : `₹${item.amountCollected}`}
                            </Text>
                          )
                        )}
                      </View>
                    </Card>
                  );
                }}
                ListEmptyComponent={() => (
                  <View className="flex-1 justify-center items-center py-10">
                    <Text className="text-slate-400 text-sm font-medium">No records found.</Text>
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
