import React, { useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TextInput, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { useAllMeetings } from '../../src/modules/meetings/useAllMeetings';
import { useMembers } from '../../src/modules/members/useMembers';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { IndianRupee, Users, Calendar, Download, Search, ChevronRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react-native';
import { formatRupees } from '../../src/utils/currency';
import { collectionGroup, query, where, getDocs, doc, writeBatch, increment } from 'firebase/firestore';
import { db } from '../../src/services/firebase';
import { showAlert } from '../../src/utils/platformAlert';

export default function ReportsScreen() {
  const [activeTab, setActiveTab] = useState<'meetings' | 'members' | 'pending'>('meetings');
  const { meetings, loading: meetingsLoading } = useAllMeetings();

  // Meeting Filter States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Member Search & History States
  const [memberSearch, setMemberSearch] = useState('');
  const { members, loading: membersLoading } = useMembers(memberSearch);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [memberHistory, setMemberHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Filter meetings based on date range inputs
  const filteredMeetings = meetings.filter((meeting) => {
    if (startDate && meeting.date < startDate) return false;
    if (endDate && meeting.date > endDate) return false;
    return true;
  });

  const totalRevenue = filteredMeetings.reduce((acc, m) => acc + (m.metrics?.totalCollected || 0), 0);
  const totalAttendance = filteredMeetings.reduce((acc, m) => acc + (m.metrics?.totalAttendees || 0), 0);

  // Fetch individual member's check-in history across all meetings
  const handleSelectMember = async (member: any) => {
    setSelectedMember(member);
    setHistoryLoading(true);
    try {
      const q = query(
        collectionGroup(db, 'attendance'),
        where('memberId', '==', member.id)
      );
      const querySnapshot = await getDocs(q);
      const list: any[] = [];
      querySnapshot.forEach((doc) => {
        const meetingId = doc.ref.parent?.parent?.id;
        const meeting = meetings.find(m => m.id === meetingId);
        list.push({
          id: doc.id,
          meetingTitle: meeting?.title || 'CEDOI Meeting',
          meetingDate: meeting?.date || 'Unknown Date',
          ...doc.data()
        });
      });
      // Sort by date desc
      list.sort((a, b) => b.meetingDate.localeCompare(a.meetingDate));
      setMemberHistory(list);
    } catch (error: any) {
      showAlert('Error', 'Failed to fetch attendance history: ' + error.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Global Pending Payments Ledger States
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingSearch, setPendingSearch] = useState('');

  const fetchPendingPayments = async () => {
    setPendingLoading(true);
    try {
      const q = query(collectionGroup(db, 'attendance'));
      const querySnapshot = await getDocs(q);
      const list: any[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.paymentStatus === 'PENDING') {
          const meetingId = docSnap.ref.parent?.parent?.id;
          const meeting = meetings.find(m => m.id === meetingId);
          list.push({
            id: docSnap.id,
            meetingId,
            meetingTitle: meeting?.title || 'CEDOI Meeting',
            meetingDate: meeting?.date || 'Unknown Date',
            entryFee: meeting?.entryFee || 500,
            ...data
          });
        }
      });
      // Sort by date desc
      list.sort((a, b) => b.meetingDate.localeCompare(a.meetingDate));
      setPendingPayments(list);
    } catch (error: any) {
      console.error(error);
      showAlert('Error', 'Failed to fetch pending payments: ' + error.message);
    } finally {
      setPendingLoading(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'pending' && meetings.length > 0) {
      fetchPendingPayments();
    }
  }, [activeTab, meetings]);

  const handleResolvePending = async (payment: any) => {
    showAlert(
      'Confirm Payment Resolution',
      `Resolve pending entry fee of ₹${payment.entryFee || 500} for ${payment.memberSnapshot?.fullName}?`,
      [
        {
          text: 'Pay via UPI',
          onPress: () => submitPendingResolution(payment, 'UPI')
        },
        {
          text: 'Pay via Cash',
          onPress: () => submitPendingResolution(payment, 'CASH')
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const submitPendingResolution = async (payment: any, mode: 'CASH' | 'UPI') => {
    try {
      const batch = writeBatch(db);
      const attendanceRef = doc(db, `meetings/${payment.meetingId}/attendance`, payment.id);
      const meetingRef = doc(db, 'meetings', payment.meetingId);

      const fee = payment.entryFee || 500;

      batch.update(attendanceRef, {
        paymentStatus: 'PAID',
        paymentMode: mode,
        amountCollected: fee,
      });

      batch.update(meetingRef, {
        'metrics.totalCollected': increment(fee),
      });

      await batch.commit();

      // Refresh the ledger
      await fetchPendingPayments();
      showAlert('Success', 'Payment resolved successfully!');
    } catch (error: any) {
      console.error(error);
      showAlert('Error', 'Failed to resolve payment: ' + error.message);
    }
  };

  // Compile and download CSV Report
  const handleExportCSV = () => {
    if (filteredMeetings.length === 0) {
      showAlert('No Data', 'There is no meeting data available to export.');
      return;
    }

    const csvHeaders = ['Meeting Title', 'Date', 'Venue', 'Total Attendees', 'Total Revenue Collected (₹)'];
    const csvRows = filteredMeetings.map((m) => [
      `"${m.title.replace(/"/g, '""')}"`,
      m.date,
      `"${m.venue.replace(/"/g, '""')}"`,
      m.metrics?.totalAttendees || 0,
      m.metrics?.totalCollected || 0
    ]);

    const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');

    if (Platform.OS === 'web') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `CEDOI_Financial_Report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      showAlert('Report Compiled', 'CSV file successfully compiled for sharing.');
    }
  };

  if (meetingsLoading) {
    return (
      <View style={{ backgroundColor: '#f8fafc' }} className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: '#f8fafc' }} className="flex-1 p-6">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-6">
        <View>
          <Text className="text-3xl font-extrabold text-slate-800 tracking-tight">Reports & Analytics</Text>
          <Text className="text-slate-500 text-sm mt-0.5">Track financial performance & attendee metrics</Text>
        </View>
        {activeTab === 'meetings' && (
          <TouchableOpacity
            onPress={handleExportCSV}
            className="flex-row items-center bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-xl shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            <Download size={16} color="white" />
            <Text className="text-white font-bold ml-2 text-sm">Export CSV</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Switcher */}
      <View className="flex-row bg-slate-100 p-1.5 rounded-2xl mb-6">
        <TouchableOpacity
          onPress={() => setActiveTab('meetings')}
          className={`flex-1 py-3 rounded-xl items-center ${activeTab === 'meetings' ? 'bg-white shadow-sm' : 'bg-transparent'}`}
        >
          <Text className={`font-bold text-sm ${activeTab === 'meetings' ? 'text-slate-800' : 'text-slate-500'}`}>Meetings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('members')}
          className={`flex-1 py-3 rounded-xl items-center ${activeTab === 'members' ? 'bg-white shadow-sm' : 'bg-transparent'}`}
        >
          <Text className={`font-bold text-sm ${activeTab === 'members' ? 'text-slate-800' : 'text-slate-500'}`}>Member History</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('pending')}
          className={`flex-1 py-3 rounded-xl items-center ${activeTab === 'pending' ? 'bg-white shadow-sm' : 'bg-transparent'}`}
        >
          <Text className={`font-bold text-sm ${activeTab === 'pending' ? 'text-slate-800' : 'text-slate-500'}`}>Pending Payments</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'meetings' && (
        <View className="flex-1">
          {/* Filters Row */}
          <Card className="mb-6 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex-row items-center space-x-4">
            <View className="flex-1 mr-2">
              <Text className="text-xs font-bold text-slate-500 mb-1">Start Date</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  style={{
                    padding: '12px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    color: '#1e293b',
                    fontSize: '12px',
                    height: '42px',
                    outline: 'none',
                    fontFamily: 'inherit',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                  onChange={(e) => setStartDate(e.target.value)}
                  value={startDate || ''}
                />
              ) : (
                <TextInput
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs"
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94a3b8"
                  value={startDate}
                  onChangeText={setStartDate}
                />
              )}
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-xs font-bold text-slate-500 mb-1">End Date</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  style={{
                    padding: '12px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    color: '#1e293b',
                    fontSize: '12px',
                    height: '42px',
                    outline: 'none',
                    fontFamily: 'inherit',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                  onChange={(e) => setEndDate(e.target.value)}
                  value={endDate || ''}
                />
              ) : (
                <TextInput
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs"
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94a3b8"
                  value={endDate}
                  onChangeText={setEndDate}
                />
              )}
            </View>
            {(startDate || endDate) && (
              <TouchableOpacity
                onPress={() => { setStartDate(''); setEndDate(''); }}
                className="mt-4 px-3 py-2 bg-slate-100 rounded-lg"
              >
                <Text className="text-xs font-bold text-slate-500">Clear</Text>
              </TouchableOpacity>
            )}
          </Card>

          {/* Premium Summary Cards */}
          <View className="flex-row space-x-4 mb-6">
            <View
              style={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', borderWidth: 1 }}
              className="flex-1 p-5 rounded-2xl shadow-sm"
            >
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-emerald-700 text-xs uppercase font-extrabold tracking-wider">Total Collection</Text>
                <View className="bg-emerald-100 p-2 rounded-xl">
                  <IndianRupee size={16} color="#047857" />
                </View>
              </View>
              <Text className="text-emerald-900 text-3xl font-extrabold tracking-tight">{formatRupees(totalRevenue)}</Text>
              <Text className="text-emerald-600 text-[10px] mt-2 font-semibold">Filtered collections total</Text>
            </View>

            <View
              style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1 }}
              className="flex-1 p-5 rounded-2xl shadow-sm"
            >
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-blue-700 text-xs uppercase font-extrabold tracking-wider">Total Footfall</Text>
                <View className="bg-blue-100 p-2 rounded-xl">
                  <Users size={16} color="#1d4ed8" />
                </View>
              </View>
              <Text className="text-blue-900 text-3xl font-extrabold tracking-tight">{totalAttendance}</Text>
              <Text className="text-blue-600 text-[10px] mt-2 font-semibold">Total registered check-ins</Text>
            </View>
          </View>

          {/* Breakdown List */}
          <FlatList
            data={filteredMeetings}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Card className="mb-3 bg-white border border-slate-100 p-4 rounded-xl shadow-sm flex-row items-center justify-between">
                <View className="flex-1 min-w-0 pr-4">
                  <Text className="font-bold text-slate-800 text-base truncate">{item.title}</Text>
                  <View className="flex-row items-center mt-1">
                    <Calendar size={12} color="#94a3b8" />
                    <Text className="text-slate-400 text-xs ml-1 font-semibold">{item.date}</Text>
                  </View>
                </View>
                <View className="flex-row items-center space-x-6">
                  <View className="items-end">
                    <Text className="font-extrabold text-emerald-600 text-base">{formatRupees(item.metrics?.totalCollected || 0)}</Text>
                    <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Collected</Text>
                  </View>
                  <View className="items-end border-l border-slate-100 pl-4 min-w-[70px]">
                    <View className="flex-row items-center justify-end">
                      <Users size={13} color="#94a3b8" />
                      <Text className="font-extrabold text-slate-700 text-base ml-1.5">{item.metrics?.totalAttendees || 0}</Text>
                    </View>
                    <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Attended</Text>
                  </View>
                </View>
              </Card>
            )}
            ListEmptyComponent={() => (
              <Card className="items-center p-8 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <Text className="text-slate-500 text-center py-4 font-medium">No meeting records match the filters.</Text>
              </Card>
            )}
          />
        </View>
      )}

      {activeTab === 'members' && (
        <View className="flex-1 flex-row space-x-6">
          {/* Members Panel */}
          <View className="w-1/3">
            <Card className="mb-4 flex-row items-center px-3 py-1 bg-white border border-slate-100 rounded-xl shadow-sm">
              <Search size={16} color="#94a3b8" />
              <TextInput
                className="flex-1 ml-2 text-slate-800 py-2.5 text-xs"
                placeholder="Search member..."
                placeholderTextColor="#94a3b8"
                value={memberSearch}
                onChangeText={setMemberSearch}
              />
            </Card>
            {membersLoading ? (
              <ActivityIndicator size="small" color="#2563eb" className="mt-4" />
            ) : (
              <FlatList
                data={members}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const isSelected = selectedMember?.id === item.id;
                  return (
                    <TouchableOpacity
                      onPress={() => handleSelectMember(item)}
                      className={`p-3.5 mb-2 rounded-xl flex-row items-center justify-between border transition-all duration-150 ${isSelected
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-white border-slate-100 hover:bg-slate-50'
                        }`}
                    >
                      <View className="flex-1 min-w-0 pr-2">
                        <Text className={`font-bold text-sm truncate ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>{item.fullName}</Text>
                        <Text className="text-[10px] text-slate-400 truncate mt-0.5">{item.companyName}</Text>
                      </View>
                      <ChevronRight size={14} color={isSelected ? '#2563eb' : '#94a3b8'} />
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={() => (
                  <Text className="text-slate-400 text-xs text-center py-4">No members found</Text>
                )}
              />
            )}
          </View>

          {/* Member History Log Panel */}
          <View className="flex-1">
            {selectedMember ? (
              <Card className="flex-1 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <View className="border-b border-slate-100 pb-4 mb-4">
                  <Text className="text-lg font-bold text-slate-800">{selectedMember.fullName}</Text>
                  <Text className="text-xs text-slate-500 mt-1">{selectedMember.companyName} • {selectedMember.businessCategory}</Text>
                </View>

                {historyLoading ? (
                  <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="small" color="#2563eb" />
                  </View>
                ) : (
                  <FlatList
                    data={memberHistory}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <View className="flex-row items-center justify-between py-3 border-b border-slate-50">
                        <View className="flex-1 min-w-0 pr-4">
                          <Text className="font-bold text-slate-700 text-sm truncate">{item.meetingTitle}</Text>
                          <View className="flex-row items-center mt-1 space-x-3">
                            <View className="flex-row items-center">
                              <Calendar size={11} color="#94a3b8" />
                              <Text className="text-[10px] text-slate-400 ml-1">{item.meetingDate}</Text>
                            </View>
                            <View className="flex-row items-center">
                              <Clock size={11} color="#94a3b8" />
                              <Text className="text-[10px] text-slate-400 ml-1">
                                {item.checkInTime?.seconds ? new Date(item.checkInTime.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '08:30 AM'}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <View className="items-end">
                          <View className={`px-2 py-0.5 rounded-full flex-row items-center space-x-1 ${item.paymentStatus === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700'
                            : item.paymentStatus === 'WAIVED'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-amber-50 text-amber-700'
                            }`}>
                            <CheckCircle2 size={10} color={item.paymentStatus === 'PAID' ? '#059669' : '#475569'} />
                            <Text className={`text-[9px] font-extrabold uppercase tracking-wide ${item.paymentStatus === 'PAID'
                              ? 'text-emerald-700'
                              : 'text-slate-600'
                              }`}>
                              {item.paymentStatus}
                            </Text>
                          </View>
                          <Text className="text-[10px] text-slate-400 mt-1 font-semibold">
                            {item.paymentMode ? `${item.paymentMode} • ₹${item.amountCollected}` : `₹${item.amountCollected}`}
                          </Text>
                        </View>
                      </View>
                    )}
                    ListEmptyComponent={() => (
                      <View className="flex-1 justify-center items-center py-10">
                        <Text className="text-slate-400 text-sm font-medium">No check-in logs found for this member.</Text>
                      </View>
                    )}
                  />
                )}
              </Card>
            ) : (
              <Card className="flex-1 bg-white border border-slate-100 rounded-2xl items-center justify-center p-8 shadow-sm">
                <Users size={32} color="#94a3b8" />
                <Text className="text-slate-400 text-sm text-center font-bold mt-3">Select a member to view their complete CEDOI attendance history.</Text>
              </Card>
            )}
          </View>
        </View>
      )}

      {activeTab === 'pending' && (
        <View className="flex-1">
          {/* Search Bar */}
          <Card className="mb-4 flex-row items-center px-4 py-1.5 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <Search size={16} color="#94a3b8" />
            <TextInput
              className="flex-1 ml-2 text-slate-800 py-3 text-xs"
              placeholder="Search by member or meeting title..."
              placeholderTextColor="#94a3b8"
              value={pendingSearch}
              onChangeText={setPendingSearch}
            />
          </Card>

          {/* Overview Metrics */}
          <View className="flex-row space-x-4 mb-6">
            <View
              style={{ backgroundColor: '#fff7ed', borderColor: '#fed7aa', borderWidth: 1 }}
              className="flex-1 p-5 rounded-2xl shadow-sm"
            >
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-amber-700 text-xs uppercase font-extrabold tracking-wider">Total Outstanding</Text>
                <View className="bg-amber-100 p-2 rounded-xl">
                  <IndianRupee size={16} color="#d97706" />
                </View>
              </View>
              <Text className="text-amber-900 text-3xl font-extrabold tracking-tight">
                {formatRupees(
                  pendingPayments
                    .filter(p => {
                      const term = pendingSearch.toLowerCase();
                      return (
                        (p.memberSnapshot?.fullName || '').toLowerCase().includes(term) ||
                        (p.meetingTitle || '').toLowerCase().includes(term)
                      );
                    })
                    .reduce((acc, curr) => acc + (curr.entryFee || 500), 0)
                )}
              </Text>
              <Text className="text-amber-600 text-[10px] mt-2 font-semibold">Pending fees total</Text>
            </View>

            <View
              style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1 }}
              className="flex-1 p-5 rounded-2xl shadow-sm"
            >
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-blue-700 text-xs uppercase font-extrabold tracking-wider">Unpaid Bookings</Text>
                <View className="bg-blue-100 p-2 rounded-xl">
                  <Users size={16} color="#1d4ed8" />
                </View>
              </View>
              <Text className="text-blue-900 text-3xl font-extrabold tracking-tight">
                {
                  pendingPayments
                    .filter(p => {
                      const term = pendingSearch.toLowerCase();
                      return (
                        (p.memberSnapshot?.fullName || '').toLowerCase().includes(term) ||
                        (p.meetingTitle || '').toLowerCase().includes(term)
                      );
                    })
                    .length
                }
              </Text>
              <Text className="text-blue-600 text-[10px] mt-2 font-semibold">Total pending collections</Text>
            </View>
          </View>

          {/* Pending List */}
          {pendingLoading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#2563eb" />
            </View>
          ) : (
            <FlatList
              data={pendingPayments.filter(p => {
                const term = pendingSearch.toLowerCase();
                return (
                  (p.memberSnapshot?.fullName || '').toLowerCase().includes(term) ||
                  (p.meetingTitle || '').toLowerCase().includes(term)
                );
              })}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <Card className="mb-3 bg-white border border-slate-100 p-4 rounded-xl shadow-sm flex-row justify-between items-center">
                  <View className="flex-1 mr-4">
                    <Text className="font-bold text-slate-800 text-base">{item.memberSnapshot?.fullName}</Text>
                    <Text className="text-xs text-slate-500 mt-0.5">{item.meetingTitle}</Text>
                    <View className="flex-row items-center mt-2 space-x-3">
                      <View className="flex-row items-center">
                        <Calendar size={12} color="#94a3b8" />
                        <Text className="text-[10px] text-slate-400 ml-1 font-semibold">{item.meetingDate}</Text>
                      </View>
                      <View className="flex-row items-center">
                        <Clock size={12} color="#94a3b8" />
                        <Text className="text-[10px] text-slate-400 ml-1 font-semibold">
                          {item.checkInTime?.seconds ? new Date(item.checkInTime.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '08:30 AM'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View className="items-end">
                    <Text className="font-extrabold text-amber-600 text-lg mb-2">₹{item.entryFee || 500}</Text>
                    <TouchableOpacity
                      onPress={() => handleResolvePending(item)}
                      className="bg-indigo-600 hover:bg-indigo-700 py-1.5 px-3.5 rounded-xl flex-row items-center justify-center shadow-sm"
                    >
                      <Text className="text-[10px] font-extrabold text-white">COLLECT FEE</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              )}
              ListEmptyComponent={() => (
                <Card className="items-center p-8 bg-white border border-slate-100 rounded-2xl shadow-sm">
                  <Text className="text-slate-500 text-center py-4 font-medium">No pending payments found.</Text>
                </Card>
              )}
            />
          )}
        </View>
      )}
    </View>
  );
}
