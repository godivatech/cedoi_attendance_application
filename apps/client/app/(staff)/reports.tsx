import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, TextInput, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { collectionGroup, query, getDocs } from 'firebase/firestore';
import { db } from '../../src/services/firebase';
import { useAllMeetings } from '../../src/modules/meetings/useAllMeetings';
import { useMembers } from '../../src/modules/members/useMembers';
import { Card } from '../../src/components/ui/Card';
import {
  FileText, Download, Search, Users, Calendar, IndianRupee, AlertCircle, TrendingUp
} from 'lucide-react-native';
import { formatRupees } from '../../src/utils/currency';
import { showAlert } from '../../src/utils/platformAlert';

interface MemberReportItem {
  id: string;
  fullName: string;
  companyName: string;
  mobileNumber: string;
  businessCategory: string;
  attendedCount: number;
  absentCount: number;
  totalMeetings: number;
  attendancePct: number;
  totalPaid: number;
  pendingDues: number;
}

// Helper to format ISO month (2026-07) to human readable label (July 2026)
function formatMonthLabel(isoMonth: string): string {
  if (isoMonth === 'ALL') return 'All Months';
  const parts = isoMonth.split('-');
  if (parts.length !== 2) return isoMonth;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const date = new Date(year, month, 1);
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

export default function StaffReportsScreen() {
  const { meetings, loading: meetingsLoading } = useAllMeetings();
  const [memberSearch, setMemberSearch] = useState('');
  const { members, loading: membersLoading } = useMembers(''); // Fetch all members once

  const [selectedMonth, setSelectedMonth] = useState<string>('ALL'); // 'ALL' or 'YYYY-MM'
  const [viewFilter, setViewFilter] = useState<'ALL' | 'PENDING'>('ALL'); // 'ALL' or 'PENDING'
  const [loading, setLoading] = useState<boolean>(true);
  const [reportData, setReportData] = useState<MemberReportItem[]>([]);

  // Calculate monthly stats
  const [stats, setStats] = useState({
    totalMeetings: 0,
    totalCheckIns: 0,
    totalCollected: 0,
    totalPendingDues: 0,
    overallAttendanceRate: 0,
  });

  // Extract available months from meetings
  const availableMonths = React.useMemo(() => {
    const setMonths = new Set<string>();
    meetings.forEach(m => {
      if (m.date) {
        setMonths.add(m.date.substring(0, 7)); // e.g. "2026-07"
      }
    });
    return Array.from(setMonths).sort().reverse();
  }, [meetings]);

  // Fetch and calculate monthly reports
  useEffect(() => {
    async function buildReport() {
      if (meetingsLoading || membersLoading) return;
      if (reportData.length === 0) setLoading(true);

      try {
        // Filter meetings by selected month
        const relevantMeetings = meetings.filter(m => {
          if (selectedMonth === 'ALL') return true;
          return m.date && m.date.startsWith(selectedMonth);
        });

        const meetingIds = new Set(relevantMeetings.map(m => m.id));
        const totalMeetingsCount = relevantMeetings.length;

        // Query all attendance records
        const attSnap = await getDocs(query(collectionGroup(db, 'attendance')));

        // Map: memberId -> { attended: number, absent: number, totalPaid: number }
        const attMap: Record<string, { attended: number; absent: number; totalPaid: number }> = {};

        attSnap.docs.forEach(docSnap => {
          const data = docSnap.data();
          const parentMeetingId = docSnap.ref.parent.parent?.id;

          if (parentMeetingId && meetingIds.has(parentMeetingId)) {
            const mId = data.memberId || docSnap.id;
            if (!attMap[mId]) {
              attMap[mId] = { attended: 0, absent: 0, totalPaid: 0 };
            }

            const isAbsent = data.paymentStatus === 'ABSENT' || data.isAbsent === true;
            if (isAbsent) {
              attMap[mId].absent += 1;
            } else {
              attMap[mId].attended += 1;
              attMap[mId].totalPaid += (data.amountCollected || 0);
            }
          }
        });

        // Compute per-member statistics
        let globalCheckIns = 0;
        let globalCollected = 0;
        let globalPendingDues = 0;

        const items: MemberReportItem[] = members.map(m => {
          const rec = attMap[m.id] || attMap[m.id?.trim()] || { attended: 0, absent: 0, totalPaid: 0 };
          const attended = rec.attended;
          
          // Calculate absent count: if meeting total > 0 and attended < totalMeetings, then absent = totalMeetings - attended
          let absent = rec.absent;
          if (totalMeetingsCount > 0 && (attended + absent < totalMeetingsCount)) {
            absent = Math.max(0, totalMeetingsCount - attended);
          }

          const pct = totalMeetingsCount > 0 ? Math.round((attended / totalMeetingsCount) * 100) : 0;
          const avgFee = totalMeetingsCount > 0 
            ? Math.round(relevantMeetings.reduce((sum, meeting) => sum + (meeting.entryFee || 500), 0) / totalMeetingsCount) 
            : 500;

          const pendingDues = absent * avgFee;

          globalCheckIns += attended;
          globalCollected += rec.totalPaid;
          globalPendingDues += pendingDues;

          return {
            id: m.id,
            fullName: m.fullName || 'Unknown',
            companyName: m.companyName || '',
            mobileNumber: m.mobileNumber || '',
            businessCategory: m.businessCategory || '',
            attendedCount: attended,
            absentCount: absent,
            totalMeetings: totalMeetingsCount,
            attendancePct: pct,
            totalPaid: rec.totalPaid,
            pendingDues,
          };
        });

        // Sort by pending dues (highest first)
        items.sort((a, b) => b.pendingDues - a.pendingDues);

        const totalCapacity = members.length * totalMeetingsCount;
        const rate = totalCapacity > 0 ? Math.round((globalCheckIns / totalCapacity) * 100) : 0;

        setStats({
          totalMeetings: totalMeetingsCount,
          totalCheckIns: globalCheckIns,
          totalCollected: globalCollected,
          totalPendingDues: globalPendingDues,
          overallAttendanceRate: rate,
        });

        setReportData(items);
      } catch (err) {
        console.error('Failed to build report:', err);
      } finally {
        setLoading(false);
      }
    }

    buildReport();
  }, [meetings, members, selectedMonth, meetingsLoading, membersLoading]);

  // Export Report to Excel (CSV)
  const handleExportCSV = () => {
    if (reportData.length === 0) {
      showAlert('Export Report', 'No data available to export.');
      return;
    }

    const monthLabel = selectedMonth === 'ALL' ? 'All Months' : selectedMonth;
    
    // CSV Header + Summary
    let csvContent = `CEDOI MONTHLY ATTENDANCE & DUES REPORT\n`;
    csvContent += `Report Period: ${monthLabel}\n`;
    csvContent += `Total Meetings: ${stats.totalMeetings}\n`;
    csvContent += `Total Check-ins: ${stats.totalCheckIns}\n`;
    csvContent += `Total Collected: INR ${stats.totalCollected}\n`;
    csvContent += `Total Pending Dues (Absents): INR ${stats.totalPendingDues}\n\n`;

    // CSV Table Headers
    csvContent += `Member Name,Company Name,Category,Mobile Number,Attended Meetings,Absent Meetings,Total Meetings,Attendance %,Collected Fee (INR),Pending Dues (INR)\n`;

    // CSV Data Rows
    reportData.forEach(row => {
      const name = `"${row.fullName.replace(/"/g, '""')}"`;
      const company = `"${row.companyName.replace(/"/g, '""')}"`;
      const cat = `"${row.businessCategory.replace(/"/g, '""')}"`;
      const mobile = `"${row.mobileNumber}"`;

      csvContent += `${name},${company},${cat},${mobile},${row.attendedCount},${row.absentCount},${row.totalMeetings},${row.attendancePct}%,${row.totalPaid},${row.pendingDues}\n`;
    });

    if (Platform.OS === 'web') {
      // Trigger browser CSV file download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `CEDOI_Attendance_Report_${monthLabel.replace('-', '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showAlert('Export Success', `Monthly report downloaded as CEDOI_Attendance_Report_${monthLabel.replace('-', '_')}.csv`);
    } else {
      showAlert('Export CSV', 'CSV export is generated! Download is available on Web browser.');
    }
  };

  const pendingMembersCount = reportData.filter(item => item.pendingDues > 0).length;

  const filteredItems = reportData.filter(item => {
    const queryStr = memberSearch.trim().toLowerCase();
    const matchesSearch = !queryStr ||
      item.fullName.toLowerCase().includes(queryStr) ||
      item.companyName.toLowerCase().includes(queryStr) ||
      item.businessCategory.toLowerCase().includes(queryStr);

    if (!matchesSearch) return false;
    if (viewFilter === 'PENDING') return item.pendingDues > 0;
    return true;
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
      contentContainerStyle={{ paddingBottom: 150 }}
      showsVerticalScrollIndicator={true}
      className="p-4 md:p-8 max-w-6xl mx-auto w-full"
    >
      {/* Top Title & Export Action Header */}
      <View className="flex-row flex-wrap items-center justify-between gap-4 mb-6">
        <View>
          <Text className="text-2xl font-black text-slate-800 tracking-tight">Monthly Reports</Text>
          <Text className="text-xs text-slate-400 font-medium mt-0.5">
            Attendance analytics & pending dues overview
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleExportCSV}
          activeOpacity={0.8}
          className="bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] flex-row items-center px-4 py-3 rounded-2xl shadow-sm shadow-indigo-500/20"
        >
          <Download size={18} color="#ffffff" />
          <Text className="text-white font-bold text-sm ml-2">Export Excel (.csv)</Text>
        </TouchableOpacity>
      </View>

      {/* Month Filter Selector Card */}
      <View className="mb-6 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Calendar size={18} color="#4f46e5" />
            <Text className="text-sm font-bold text-slate-800 ml-2">Select Month</Text>
          </View>

          {/* Web Dropdown Select Box */}
          {Platform.OS === 'web' ? (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                fontWeight: '700',
                fontSize: '13px',
                color: '#1e293b',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="ALL">All Months Summary</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
          ) : (
            <View className="px-3 py-1.5 rounded-lg bg-indigo-50">
              <Text className="text-xs font-bold text-indigo-600">
                {formatMonthLabel(selectedMonth)}
              </Text>
            </View>
          )}
        </View>

        {/* Quick Month Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => setSelectedMonth('ALL')}
            className={`px-4 py-2 rounded-xl border ${
              selectedMonth === 'ALL'
                ? 'bg-indigo-600 border-indigo-600'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <Text className={selectedMonth === 'ALL' ? 'text-white font-bold' : 'text-slate-600 font-semibold'}>
              All Months
            </Text>
          </TouchableOpacity>

          {availableMonths.map(m => (
            <TouchableOpacity
              key={m}
              onPress={() => setSelectedMonth(m)}
              className={`px-4 py-2 rounded-xl border ${
                selectedMonth === m
                  ? 'bg-indigo-600 border-indigo-600'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <Text className={`text-xs ${selectedMonth === m ? 'text-white font-bold' : 'text-slate-600 font-semibold'}`}>
                {formatMonthLabel(m)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Compact 2-Column Mobile & 4-Column Desktop KPI Summary Cards */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }} className="mb-4">
        <View style={{ flex: 1, minWidth: '47%' }}>
          <Card className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
            <View className="flex-row items-center justify-between">
              <Text className="text-[11px] text-slate-400 font-semibold">Total Meetings</Text>
              <View className="w-6 h-6 rounded-lg bg-indigo-50 items-center justify-center">
                <Calendar size={14} color="#4f46e5" />
              </View>
            </View>
            <Text className="text-lg font-black text-slate-800 mt-1">{stats.totalMeetings}</Text>
          </Card>
        </View>

        <View style={{ flex: 1, minWidth: '47%' }}>
          <Card className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
            <View className="flex-row items-center justify-between">
              <Text className="text-[11px] text-slate-400 font-semibold">Attendance Rate</Text>
              <View className="w-6 h-6 rounded-lg bg-emerald-50 items-center justify-center">
                <TrendingUp size={14} color="#059669" />
              </View>
            </View>
            <Text className="text-lg font-black text-emerald-600 mt-1">{stats.overallAttendanceRate}%</Text>
          </Card>
        </View>

        <View style={{ flex: 1, minWidth: '47%' }}>
          <Card className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
            <View className="flex-row items-center justify-between">
              <Text className="text-[11px] text-slate-400 font-semibold">Total Collected</Text>
              <View className="w-6 h-6 rounded-lg bg-blue-50 items-center justify-center">
                <IndianRupee size={14} color="#2563eb" />
              </View>
            </View>
            <Text className="text-lg font-black text-blue-600 mt-1">{formatRupees(stats.totalCollected)}</Text>
          </Card>
        </View>

        <View style={{ flex: 1, minWidth: '47%' }}>
          <TouchableOpacity
            onPress={() => setViewFilter(viewFilter === 'PENDING' ? 'ALL' : 'PENDING')}
            activeOpacity={0.8}
          >
            <Card className={`p-3 rounded-2xl border shadow-sm ${
              viewFilter === 'PENDING' ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-100'
            }`}>
              <View className="flex-row items-center justify-between">
                <Text className="text-[11px] text-slate-400 font-semibold">Pending Dues</Text>
                <View className="w-6 h-6 rounded-lg bg-amber-50 items-center justify-center">
                  <AlertCircle size={14} color="#d97706" />
                </View>
              </View>
              <Text className="text-lg font-black text-amber-600 mt-1">{formatRupees(stats.totalPendingDues)}</Text>
            </Card>
          </TouchableOpacity>
        </View>
      </View>

      {/* Unified Search & Segmented Filter Control Panel */}
      <View className="mb-5 bg-white p-3 md:p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        {/* iOS-Style Segmented Control Switch */}
        <View className="flex-row bg-slate-100/80 p-1 rounded-xl mb-3">
          <TouchableOpacity
            onPress={() => setViewFilter('ALL')}
            activeOpacity={0.8}
            className={`flex-1 py-2.5 rounded-lg flex-row items-center justify-center transition-all ${
              viewFilter === 'ALL'
                ? 'bg-white shadow-sm shadow-slate-200'
                : ''
            }`}
          >
            <Users size={15} color={viewFilter === 'ALL' ? '#1e293b' : '#64748b'} />
            <Text className={`text-xs ml-2 font-bold ${
              viewFilter === 'ALL' ? 'text-slate-900' : 'text-slate-500'
            }`}>
              All Members ({reportData.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setViewFilter('PENDING')}
            activeOpacity={0.8}
            className={`flex-1 py-2.5 rounded-lg flex-row items-center justify-center transition-all ${
              viewFilter === 'PENDING'
                ? 'bg-amber-500 shadow-sm shadow-amber-500/30'
                : ''
            }`}
          >
            <AlertCircle size={15} color={viewFilter === 'PENDING' ? '#ffffff' : '#d97706'} />
            <Text className={`text-xs ml-2 font-bold ${
              viewFilter === 'PENDING' ? 'text-white font-extrabold' : 'text-amber-700'
            }`}>
              Pending Dues Only ({pendingMembersCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Integrated Search Bar Input */}
        <View className="relative">
          <View className="absolute left-3.5 top-3 z-10">
            <Search size={16} color="#94a3b8" />
          </View>
          <TextInput
            value={memberSearch}
            onChangeText={setMemberSearch}
            placeholder={viewFilter === 'PENDING' ? "Search pending members or companies..." : "Search member or company..."}
            placeholderTextColor="#94a3b8"
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-sm text-slate-800 focus:bg-white"
          />
        </View>

        {/* Active Filter Indicator Badge */}
        {viewFilter === 'PENDING' && (
          <View className="flex-row items-center justify-between mt-3 pt-2.5 border-t border-slate-100 px-1">
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-amber-500 mr-2" />
              <Text className="text-xs font-semibold text-amber-700">
                Filtered: Showing members with outstanding dues
              </Text>
            </View>
            <TouchableOpacity onPress={() => setViewFilter('ALL')}>
              <Text className="text-xs font-bold text-indigo-600 hover:underline">
                Show All
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Member List Cards */}
      {loading ? (
        <View className="p-12 items-center">
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text className="text-slate-400 text-xs mt-3 font-semibold">Calculating monthly dues & statistics...</Text>
        </View>
      ) : filteredItems.length === 0 ? (
        <Card className="p-8 items-center bg-white rounded-2xl border border-slate-100">
          <FileText size={32} color="#94a3b8" />
          <Text className="text-slate-600 font-bold mt-2">No records found</Text>
          <Text className="text-slate-400 text-xs mt-1">
            {viewFilter === 'PENDING' ? 'No members have pending dues for this period.' : 'Try selecting a different month or search term.'}
          </Text>
        </Card>
      ) : (
        <View className="space-y-3">
          {filteredItems.map(item => (
            <Card key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex-row items-center justify-between mb-3">
              {/* Member Left Info */}
              <View className="flex-1 mr-3">
                <Text className="font-bold text-slate-800 text-base">{item.fullName}</Text>
                {item.companyName ? (
                  <Text className="text-xs text-slate-500 font-medium">{item.companyName}</Text>
                ) : null}

                {/* Mobile App Metric Badges */}
                <View className="flex-row flex-wrap items-center gap-2 mt-2">
                  {/* Attendance Badge */}
                  <View className={`px-2.5 py-1 rounded-lg flex-row items-center ${
                    item.attendancePct >= 75 ? 'bg-emerald-50 text-emerald-700' :
                    item.attendancePct >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                  }`}>
                    <Text className={`text-[11px] font-bold ${
                      item.attendancePct >= 75 ? 'text-emerald-700' :
                      item.attendancePct >= 50 ? 'text-amber-700' : 'text-red-700'
                    }`}>
                      {item.attendedCount}/{item.totalMeetings} Attended ({item.attendancePct}%)
                    </Text>
                  </View>

                  {/* Absent Count Badge */}
                  {item.absentCount > 0 && (
                    <View className="px-2 py-1 rounded-lg bg-slate-100">
                      <Text className="text-[11px] font-semibold text-slate-600">
                        {item.absentCount} Missed
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Right Side Dues & Fees */}
              <View className="items-end">
                {item.pendingDues > 0 ? (
                  <View className="items-end">
                    <Text className="text-[10px] uppercase font-extrabold text-amber-600 tracking-wider">Pending Due</Text>
                    <Text className="text-base font-black text-amber-600">{formatRupees(item.pendingDues)}</Text>
                  </View>
                ) : (
                  <View className="items-end">
                    <Text className="text-[10px] uppercase font-extrabold text-emerald-600 tracking-wider">Paid</Text>
                    <Text className="text-sm font-bold text-emerald-600">{formatRupees(item.totalPaid)}</Text>
                  </View>
                )}
              </View>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
