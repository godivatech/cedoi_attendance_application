import React, { useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TextInput, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { useAllMeetings } from '../../src/modules/meetings/useAllMeetings';
import { useMembers } from '../../src/modules/members/useMembers';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { IndianRupee, Users, Calendar, Download, Search, ChevronRight, CheckCircle2, Clock, AlertCircle, BarChart2, MessageSquare } from 'lucide-react-native';
import { formatRupees } from '../../src/utils/currency';
import { collectionGroup, query, where, getDocs, doc, writeBatch, increment } from 'firebase/firestore';
import { db } from '../../src/services/firebase';
import { showAlert } from '../../src/utils/platformAlert';

export default function ReportsScreen() {
  const [activeTab, setActiveTab] = useState<'meetings' | 'members'>('meetings');
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

  // Member sorting & Global stats state
  const [sortByAttendance, setSortByAttendance] = useState(false);
  const [memberStats, setMemberStats] = useState<Record<string, { present: number; absent: number; total: number; percentage: number }>>({});
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchGlobalStats = async () => {
    if (meetings.length === 0) return;
    setStatsLoading(true);
    try {
      const q = query(collectionGroup(db, 'attendance'));
      const snap = await getDocs(q);
      
      const stats: Record<string, { present: number; absent: number; total: number }> = {};
      
      snap.docs.forEach(docSnap => {
        const data = docSnap.data();
        const mId = data.memberId || docSnap.id;
        const isAbsent = data.paymentStatus === 'ABSENT' || data.isAbsent === true;
        
        if (!stats[mId]) {
          stats[mId] = { present: 0, absent: 0, total: 0 };
        }
        
        if (isAbsent) {
          stats[mId].absent += 1;
        } else {
          stats[mId].present += 1;
        }
        stats[mId].total += 1;
      });
      
      const computedStats: Record<string, { present: number; absent: number; total: number; percentage: number }> = {};
      const totalMeetingsCount = meetings.length;
      
      Object.keys(stats).forEach(mId => {
        const p = stats[mId].present;
        const total = totalMeetingsCount;
        const pct = total > 0 ? Math.round((p / total) * 100) : 0;
        
        computedStats[mId] = {
          present: p,
          absent: total - p,
          total: total,
          percentage: pct
        };
      });
      
      setMemberStats(computedStats);
    } catch (error) {
      console.error('Error fetching global stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  React.useEffect(() => {
    if (meetings.length > 0) {
      fetchGlobalStats();
    }
  }, [meetings]);

  const getMonthlyStats = () => {
    const monthlyMap: Record<string, { count: number; collected: number; attendees: number }> = {};
    
    filteredMeetings.forEach(m => {
      if (!m.date) return;
      const monthStr = m.date.substring(0, 7); // e.g. "2026-06"
      if (!monthlyMap[monthStr]) {
        monthlyMap[monthStr] = { count: 0, collected: 0, attendees: 0 };
      }
      monthlyMap[monthStr].count += 1;
      monthlyMap[monthStr].collected += (m.metrics?.totalCollected || 0);
      monthlyMap[monthStr].attendees += (m.metrics?.totalAttendees || 0);
    });
    
    return Object.entries(monthlyMap)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => b.month.localeCompare(a.month));
  };

  const formatMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

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
          meetingId,
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

  const combinedHistory = React.useMemo(() => {
    if (!selectedMember) return [];
    
    return meetings.map(meeting => {
      const attRecord = memberHistory.find(h => h.meetingId === meeting.id);
      
      if (attRecord) {
        return {
          id: attRecord.id,
          meetingId: meeting.id,
          meetingTitle: meeting.title,
          meetingDate: meeting.date,
          venue: meeting.venue,
          paymentStatus: attRecord.paymentStatus,
          paymentMode: attRecord.paymentMode,
          amountCollected: attRecord.amountCollected || 0,
          checkInTime: attRecord.checkInTime,
          isAbsent: attRecord.paymentStatus === 'ABSENT'
        };
      } else {
        return {
          id: `missing-${meeting.id}`,
          meetingId: meeting.id,
          meetingTitle: meeting.title,
          meetingDate: meeting.date,
          venue: meeting.venue,
          paymentStatus: 'ABSENT',
          amountCollected: 0,
          isAbsent: true
        };
      }
    }).sort((a, b) => b.meetingDate.localeCompare(a.meetingDate));
  }, [selectedMember, meetings, memberHistory]);

  const processedMembers = React.useMemo(() => {
    const list = [...members];
    if (sortByAttendance) {
      return list.sort((a, b) => {
        const pctA = memberStats[a.id]?.percentage || 0;
        const pctB = memberStats[b.id]?.percentage || 0;
        return pctB - pctA;
      });
    }
    return list.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [members, memberStats, sortByAttendance]);

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
        const isAbsentOrPending = data.paymentStatus === 'PENDING' || data.paymentStatus === 'ABSENT' || data.isAbsent === true;
        if (isAbsentOrPending) {
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
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: '#f8fafc' }} className="flex-1 p-4 sm:p-6">
      {/* Header */}
      <View className="flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 mb-6">
        <View>
          <Text style={{ fontSize: 26, fontWeight: '800', color: '#0d5984', letterSpacing: -0.5 }}>Reports & Analytics</Text>
          <Text className="text-slate-500 text-sm mt-0.5">Track financial performance & attendee metrics</Text>
        </View>
        {activeTab === 'meetings' && (
          <TouchableOpacity
            onPress={handleExportCSV}
            style={{ backgroundColor: '#0d5984', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}
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
          <Text className={`font-bold text-xs sm:text-sm ${activeTab === 'meetings' ? 'text-slate-800' : 'text-slate-500'}`}>Meetings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('members')}
          className={`flex-1 py-3 rounded-xl items-center ${activeTab === 'members' ? 'bg-white shadow-sm' : 'bg-transparent'}`}
        >
          <Text className={`font-bold text-xs sm:text-sm ${activeTab === 'members' ? 'text-slate-800' : 'text-slate-500'}`}>Members</Text>
        </TouchableOpacity>
      </View>      {activeTab === 'meetings' && (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
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
          <View className="flex-row -mx-2 mb-6 mt-4">
            <View className="w-1/2 px-2">
              <View
                style={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', borderWidth: 1 }}
                className="p-4 sm:p-5 rounded-2xl shadow-sm"
              >
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-emerald-700 text-[10px] sm:text-xs uppercase font-extrabold tracking-wider">Total Collection</Text>
                  <View className="bg-emerald-100 p-2 rounded-xl">
                    <IndianRupee size={16} color="#047857" />
                  </View>
                </View>
                <Text className="text-emerald-900 text-2xl sm:text-3xl font-extrabold tracking-tight">{formatRupees(totalRevenue)}</Text>
                <Text className="text-emerald-600 text-[9px] sm:text-[10px] mt-2 font-semibold">Filtered collections total</Text>
              </View>
            </View>

            <View className="w-1/2 px-2">
              <View
                style={{ backgroundColor: '#e0e7ff', borderColor: '#c7d2fe', borderWidth: 1 }}
                className="p-4 sm:p-5 rounded-2xl shadow-sm"
              >
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-indigo-700 text-[10px] sm:text-xs uppercase font-extrabold tracking-wider">Total Footfall</Text>
                  <View className="bg-indigo-100 p-2 rounded-xl">
                    <Users size={16} color="#4338ca" />
                  </View>
                </View>
                <Text className="text-indigo-900 text-2xl sm:text-3xl font-extrabold tracking-tight">{totalAttendance}</Text>
                <Text className="text-indigo-600 text-[9px] sm:text-[10px] mt-2 font-semibold">Total registered check-ins</Text>
              </View>
            </View>
          </View>
          {/* Month-wise Performance */}
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 12, paddingHorizontal: 4 }}>Month-wise Performance</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={{ gap: 12, paddingBottom: 16 }}
            style={{ marginBottom: 16 }}
          >
            {getMonthlyStats().map(m => (
              <View 
                key={m.month}
                style={{ 
                  backgroundColor: '#fff', 
                  borderWidth: 1, 
                  borderColor: '#e2e8f0', 
                  borderRadius: 16, 
                  padding: 16, 
                  width: 170,
                  shadowColor: '#0f172a',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.02,
                  shadowRadius: 6,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#1e293b' }}>{formatMonthName(m.month)}</Text>
                
                <View style={{ borderTopWidth: 1, borderColor: '#f1f5f9', marginTop: 10, paddingTop: 10, gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '600' }}>Meetings</Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>{m.count}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '600' }}>Attendees</Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>{m.attendees}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '600' }}>Collection</Text>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#059669' }}>₹{m.collected}</Text>
                  </View>
                </View>
              </View>
            ))}
            {getMonthlyStats().length === 0 && (
              <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, width: 200, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '500' }}>No monthly data available</Text>
              </View>
            )}
          </ScrollView>

          {/* Breakdown List */}
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 12, paddingHorizontal: 4 }}>Meeting Breakdown</Text>
          <View style={{ gap: 12, marginBottom: 24 }}>
            {filteredMeetings.map((item) => (
              <Card key={item.id} className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm flex-row items-center justify-between">
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
            ))}
            {filteredMeetings.length === 0 && (
              <Card className="items-center p-8 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <Text className="text-slate-500 text-center py-4 font-medium">No meeting records match the filters.</Text>
              </Card>
            )}
          </View>
        </ScrollView>
      )}

      {activeTab === 'members' && (
        <View className="flex-1 flex-col lg:flex-row lg:space-x-6 space-y-6 lg:space-y-0">
          {/* Members Panel */}
          <View className="w-full lg:w-1/3 h-80 lg:h-full">
            <View className="mb-4 flex-row items-center px-3 bg-white border border-slate-200 rounded-xl shadow-sm h-11">
              <Search size={16} color="#94a3b8" />
              <TextInput
                className="flex-1 ml-2 text-slate-800 py-0 text-sm h-full"
                placeholder="Search member..."
                placeholderTextColor="#94a3b8"
                value={memberSearch}
                onChangeText={setMemberSearch}
              />
            </View>

            {/* Sort Toggle Options */}
            <View className="flex-row justify-between items-center mb-3 px-1">
              <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sort Members By:</Text>
              <View className="flex-row bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <TouchableOpacity
                  onPress={() => setSortByAttendance(false)}
                  className={`px-2.5 py-1 rounded-md ${!sortByAttendance ? 'bg-white shadow-xs' : ''}`}
                >
                  <Text style={{ fontSize: 9, fontWeight: '700', color: !sortByAttendance ? '#1e293b' : '#64748b' }}>Name</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSortByAttendance(true)}
                  className={`px-2.5 py-1 rounded-md ${sortByAttendance ? 'bg-white shadow-xs' : ''}`}
                >
                  <Text style={{ fontSize: 9, fontWeight: '700', color: sortByAttendance ? '#1e293b' : '#64748b' }}>Attendance %</Text>
                </TouchableOpacity>
              </View>
            </View>

            {membersLoading ? (
              <ActivityIndicator size="small" color="#4f46e5" className="mt-4" />
            ) : (
              <FlatList
                data={processedMembers}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const isSelected = selectedMember?.id === item.id;
                  return (
                    <TouchableOpacity
                      onPress={() => handleSelectMember(item)}
                      className={`p-3.5 mb-2 rounded-xl flex-row items-center justify-between border transition-all duration-150 ${isSelected
                        ? 'bg-indigo-50 border-indigo-200'
                        : 'bg-white border-slate-100 hover:bg-slate-50'
                        }`}
                    >
                      <View className="flex-1 min-w-0 pr-2">
                        <Text className={`font-bold text-sm truncate ${isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>{item.fullName}</Text>
                        <Text className="text-[10px] text-slate-400 truncate mt-0.5">{item.companyName}</Text>
                      </View>
                      
                      {/* Attendance % Badge */}
                      <View className="flex-row items-center mr-3">
                        <Text className={`text-xs font-extrabold ${
                          (memberStats[item.id]?.percentage || 0) >= 80 
                            ? 'text-emerald-600' 
                            : (memberStats[item.id]?.percentage || 0) >= 50 
                              ? 'text-amber-500' 
                              : 'text-rose-500'
                        }`}>
                          {memberStats[item.id]?.percentage || 0}%
                        </Text>
                      </View>
                      
                      <ChevronRight size={14} color={isSelected ? '#4f46e5' : '#94a3b8'} />
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
                  <View className="flex-row items-start justify-between">
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text className="text-lg font-bold text-slate-800">{selectedMember.fullName}</Text>
                      <Text className="text-xs text-slate-500 mt-1">{selectedMember.companyName} • {selectedMember.businessCategory}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => router.push({ pathname: '/(admin)/member-analytics', params: { memberId: selectedMember.id } })}
                      className="bg-indigo-600 hover:bg-indigo-700 p-2 px-3.5 rounded-xl shadow-xs flex-row items-center"
                    >
                      <BarChart2 size={13} color="#ffffff" style={{ marginRight: 6 }} />
                      <Text className="text-xs font-extrabold text-white">Member 360°</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {/* Selected Member Metrics */}
                  <View style={{ flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 16, padding: 12, marginTop: 14, gap: 12 }}>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Attendance Rate</Text>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: (memberStats[selectedMember.id]?.percentage || 0) >= 80 ? '#059669' : '#ea580c', marginTop: 2 }}>
                        {memberStats[selectedMember.id]?.percentage || 0}%
                      </Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: '#e2e8f0' }} />
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Attended</Text>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b', marginTop: 2 }}>
                        {memberStats[selectedMember.id]?.present || 0} / {meetings.length}
                      </Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: '#e2e8f0' }} />
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Absent</Text>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#ef4444', marginTop: 2 }}>
                        {meetings.length - (memberStats[selectedMember.id]?.present || 0)}
                      </Text>
                    </View>
                  </View>
                </View>

                {historyLoading ? (
                  <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="small" color="#4f46e5" />
                  </View>
                ) : (
                  <FlatList
                    data={combinedHistory}
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
                            {!item.isAbsent && item.checkInTime && (
                              <View className="flex-row items-center">
                                <Clock size={11} color="#94a3b8" />
                                <Text className="text-[10px] text-slate-400 ml-1">
                                  {item.checkInTime?.seconds ? new Date(item.checkInTime.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '08:30 AM'}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <View className="items-end">
                          <View className={`px-2 py-0.5 rounded-full flex-row items-center space-x-1 ${
                            item.isAbsent
                              ? 'bg-red-50 text-red-700 border border-red-100'
                              : item.paymentStatus === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700'
                                : item.paymentStatus === 'WAIVED'
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-amber-50 text-amber-700'
                            }`}>
                            <CheckCircle2 size={10} color={item.isAbsent ? '#ef4444' : item.paymentStatus === 'PAID' ? '#059669' : '#475569'} />
                            <Text className={`text-[9px] font-extrabold uppercase tracking-wide ${
                              item.isAbsent
                                ? 'text-red-700'
                                : item.paymentStatus === 'PAID'
                                  ? 'text-emerald-700'
                                  : 'text-slate-600'
                              }`}>
                              {item.isAbsent ? 'ABSENT' : item.paymentStatus}
                            </Text>
                          </View>
                          {!item.isAbsent && (
                            <Text className="text-[10px] text-slate-400 mt-1 font-semibold">
                              {item.paymentMode ? `${item.paymentMode} • ₹${item.amountCollected}` : `₹${item.amountCollected}`}
                            </Text>
                          )}
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
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Search Bar */}
          <View className="mb-4 flex-row items-center px-4 bg-white border border-slate-200 rounded-xl shadow-sm h-11">
            <Search size={16} color="#94a3b8" />
            <TextInput
              className="flex-1 ml-2 text-slate-800 py-0 text-sm h-full"
              placeholder="Search by member or meeting title..."
              placeholderTextColor="#94a3b8"
              value={pendingSearch}
              onChangeText={setPendingSearch}
            />
          </View>
          {/* Overview Metrics */}
          <View className="flex-row -mx-2 mb-6 mt-4">
            <View className="w-1/2 px-2">
              <View
                style={{ backgroundColor: '#fff7ed', borderColor: '#fed7aa', borderWidth: 1 }}
                className="p-4 sm:p-5 rounded-2xl shadow-sm"
              >
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-amber-700 text-[10px] sm:text-xs uppercase font-extrabold tracking-wider">Total Outstanding</Text>
                  <View className="bg-amber-100 p-2 rounded-xl">
                    <IndianRupee size={16} color="#d97706" />
                  </View>
                </View>
                <Text className="text-amber-900 text-2xl sm:text-3xl font-extrabold tracking-tight">
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
                <Text className="text-amber-600 text-[9px] sm:text-[10px] mt-2 font-semibold">Pending fees total</Text>
              </View>
            </View>

            <View className="w-1/2 px-2">
              <View
                style={{ backgroundColor: '#e0e7ff', borderColor: '#c7d2fe', borderWidth: 1 }}
                className="p-4 sm:p-5 rounded-2xl shadow-sm"
              >
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-indigo-700 text-[10px] sm:text-xs uppercase font-extrabold tracking-wider">Unpaid Bookings</Text>
                  <View className="bg-indigo-100 p-2 rounded-xl">
                    <Users size={16} color="#4338ca" />
                  </View>
                </View>
                <Text className="text-indigo-900 text-2xl sm:text-3xl font-extrabold tracking-tight">
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
                <Text className="text-indigo-600 text-[9px] sm:text-[10px] mt-2 font-semibold">Total pending collections</Text>
              </View>
            </View>
          </View>          {/* Pending List */}
          {pendingLoading ? (
            <View className="flex-1 justify-center items-center py-6">
              <ActivityIndicator size="large" color="#4f46e5" />
            </View>
          ) : (
            <View style={{ gap: 12, marginBottom: 24 }}>
              {pendingPayments
                .filter(p => {
                  const term = pendingSearch.toLowerCase();
                  return (
                    (p.memberSnapshot?.fullName || '').toLowerCase().includes(term) ||
                    (p.meetingTitle || '').toLowerCase().includes(term)
                  );
                })
                .map((item) => (
                  <Card key={item.id} className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm flex-row justify-between items-center">
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
                            {item.checkInTime?.seconds ? new Date(item.checkInTime.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '08:30 AM'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View className="items-end">
                      <Text className="font-extrabold text-amber-600 text-lg mb-1.5">₹{item.entryFee || 500}</Text>
                      <View className="flex-row items-center gap-1.5">
                        <TouchableOpacity
                          onPress={() => {
                            const cleanPhone = (item.memberSnapshot?.mobileNumber || '').replace(/\D/g, '');
                            const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                            const text = `Hello ${item.memberSnapshot?.fullName || 'Member'}, Greetings from CEDOI! This is a polite reminder regarding your pending fee of ₹${item.entryFee || 500} for ${item.meetingTitle || 'our meeting'}. Kindly clear your dues at your earliest convenience. Thank you!`;
                            const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`;
                            if (typeof window !== 'undefined') window.open(url, '_blank');
                          }}
                          className="bg-emerald-50 hover:bg-emerald-100 py-1.5 px-2.5 rounded-xl flex-row items-center justify-center border border-emerald-200"
                        >
                          <MessageSquare size={12} color="#047857" style={{ marginRight: 4 }} />
                          <Text className="text-[10px] font-extrabold text-emerald-700">WhatsApp</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleResolvePending(item)}
                          style={{ backgroundColor: '#0d5984' }}
                          className="py-1.5 px-3 rounded-xl flex-row items-center justify-center shadow-sm"
                        >
                          <Text className="text-[10px] font-extrabold text-white">COLLECT</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Card>
                ))}
              {pendingPayments.filter(p => {
                const term = pendingSearch.toLowerCase();
                return (
                  (p.memberSnapshot?.fullName || '').toLowerCase().includes(term) ||
                  (p.meetingTitle || '').toLowerCase().includes(term)
                );
              }).length === 0 && (
                <Card className="items-center p-8 bg-white border border-slate-100 rounded-2xl shadow-sm">
                  <Text className="text-slate-500 text-center py-4 font-medium">No pending payments found.</Text>
                </Card>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}