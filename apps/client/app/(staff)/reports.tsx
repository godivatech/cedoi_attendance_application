import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, TextInput, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { collectionGroup, query, getDocs } from 'firebase/firestore';
import { db } from '../../src/services/firebase';
import { useAllMeetings } from '../../src/modules/meetings/useAllMeetings';
import { useMembers } from '../../src/modules/members/useMembers';
import { Card } from '../../src/components/ui/Card';
import {
  FileText, Download, Search, Users, Calendar, IndianRupee, AlertCircle, TrendingUp, MessageSquare
} from 'lucide-react-native';
import { formatRupees } from '../../src/utils/currency';
import { showAlert } from '../../src/utils/platformAlert';
import { WhatsAppIcon } from '../../src/components/ui/WhatsAppIcon';

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
  const [startDate, setStartDate] = useState<string>(''); // YYYY-MM-DD
  const [endDate, setEndDate] = useState<string>(''); // YYYY-MM-DD
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
        // Filter meetings by selected date range or month
        const relevantMeetings = meetings.filter(m => {
          if (!m.date) return false;
          if (startDate && m.date < startDate) return false;
          if (endDate && m.date > endDate) return false;
          if (!startDate && !endDate && selectedMonth !== 'ALL') {
            return m.date.startsWith(selectedMonth);
          }
          return true;
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
  }, [meetings, members, selectedMonth, startDate, endDate, meetingsLoading, membersLoading]);

  // WhatsApp Reminder launcher for reports page
  const handleSendWhatsApp = (mobile: string, name: string, pendingAmount: number) => {
    const cleanPhone = mobile.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const text = `Hello ${name}, Greetings from CEDOI! This is a polite reminder regarding your pending attendance fee of ₹${pendingAmount}. Kindly clear your dues at your earliest convenience. Thank you!`;
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`;
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  };

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
          <Text style={{ fontSize: 26, fontWeight: '800', color: '#0d5984', letterSpacing: -0.5 }}>Monthly Reports</Text>
          <Text className="text-xs text-slate-400 font-medium mt-0.5">
            Attendance analytics & pending dues overview
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleExportCSV}
          activeOpacity={0.8}
          style={{ backgroundColor: '#0d5984', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center' }}
        >
          <Download size={18} color="#ffffff" style={{ marginRight: 8 }} />
          <Text className="text-white font-bold text-sm">Export CSV</Text>
        </TouchableOpacity>
      </View>

      {/* Date Range & Month Filter Selector Card */}
      <View className="mb-6 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <View className="flex-row flex-wrap items-center justify-between gap-3 mb-3">
          <View className="flex-row items-center">
            <Calendar size={18} color="#0d5984" />
            <Text className="text-sm font-bold text-slate-800 ml-2">Date Range & Month Filter</Text>
          </View>

          {/* Active Month Badge Pill */}
          <View className="px-3 py-1.5 rounded-lg bg-[#f0f7fb] border border-[#c6def0]">
            <Text className="text-xs font-bold text-[#0d5984]">
              {formatMonthLabel(selectedMonth)}
            </Text>
          </View>
        </View>

        {/* Custom From Date to To Date Inputs */}
        <View className="flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-3 pt-2 border-t border-slate-100">
          <View className="flex-1">
            <Text className="text-[11px] font-bold text-slate-500 mb-1">From Date</Text>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (e.target.value) setSelectedMonth('CUSTOM');
                }}
                onClick={(e: any) => {
                  try { e.currentTarget.showPicker?.(); } catch (err) {}
                }}
                style={{
                  width: '100%',
                  height: '42px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '0 12px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#1e293b',
                  outline: 'none',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
              />
            ) : (
              <TextInput
                value={startDate}
                onChangeText={(val) => {
                  setStartDate(val);
                  if (val) setSelectedMonth('CUSTOM');
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94a3b8"
                className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-800 font-semibold"
                style={{ height: 42, color: '#1e293b' }}
              />
            )}
          </View>

          <View className="flex-1">
            <Text className="text-[11px] font-bold text-slate-500 mb-1">To Date</Text>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  if (e.target.value) setSelectedMonth('CUSTOM');
                }}
                onClick={(e: any) => {
                  try { e.currentTarget.showPicker?.(); } catch (err) {}
                }}
                style={{
                  width: '100%',
                  height: '42px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '0 12px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#1e293b',
                  outline: 'none',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
              />
            ) : (
              <TextInput
                value={endDate}
                onChangeText={(val) => {
                  setEndDate(val);
                  if (val) setSelectedMonth('CUSTOM');
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94a3b8"
                className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-800 font-semibold"
                style={{ height: 42, color: '#1e293b' }}
              />
            )}
          </View>

          {(startDate || endDate) && (
            <TouchableOpacity
              onPress={() => {
                setStartDate('');
                setEndDate('');
                setSelectedMonth('ALL');
              }}
              className="sm:mt-4 px-3 py-2 bg-slate-100 rounded-xl items-center"
            >
              <Text className="text-xs font-bold text-slate-600">Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Month Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => {
              setSelectedMonth('ALL');
              setStartDate('');
              setEndDate('');
            }}
            style={{
              backgroundColor: selectedMonth === 'ALL' && !startDate && !endDate ? '#0d5984' : '#f8fafc',
              borderColor: selectedMonth === 'ALL' && !startDate && !endDate ? '#0d5984' : '#e2e8f0',
              borderWidth: 1,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 12,
              marginRight: 6
            }}
          >
            <Text style={{ color: selectedMonth === 'ALL' && !startDate && !endDate ? '#ffffff' : '#475569', fontWeight: '700', fontSize: 12 }}>
              All Months
            </Text>
          </TouchableOpacity>

          {availableMonths.map(m => (
            <TouchableOpacity
              key={m}
              onPress={() => {
                setSelectedMonth(m);
                setStartDate('');
                setEndDate('');
              }}
              style={{
                backgroundColor: selectedMonth === m && !startDate && !endDate ? '#0d5984' : '#f8fafc',
                borderColor: selectedMonth === m && !startDate && !endDate ? '#0d5984' : '#e2e8f0',
                borderWidth: 1,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 12,
                marginRight: 6
              }}
            >
              <Text style={{ color: selectedMonth === m && !startDate && !endDate ? '#ffffff' : '#475569', fontWeight: '700', fontSize: 12 }}>
                {formatMonthLabel(m)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Compact 2-Column Mobile & 4-Column Desktop KPI Summary Cards */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }} className="mb-4">
        <View style={{ flex: 1, minWidth: '47%' }}>
          <Card className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-slate-700 font-extrabold uppercase tracking-wider">Total Meetings</Text>
              <View className="w-7 h-7 rounded-lg bg-[#f0f7fb] items-center justify-center">
                <Calendar size={15} color="#0d5984" />
              </View>
            </View>
            <Text className="text-xl font-black text-slate-900 mt-1.5">{stats.totalMeetings}</Text>
          </Card>
        </View>

        <View style={{ flex: 1, minWidth: '47%' }}>
          <Card className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-slate-700 font-extrabold uppercase tracking-wider">Attendance Rate</Text>
              <View className="w-7 h-7 rounded-lg bg-emerald-50 items-center justify-center">
                <TrendingUp size={15} color="#059669" />
              </View>
            </View>
            <Text className="text-xl font-black text-emerald-700 mt-1.5">{stats.overallAttendanceRate}%</Text>
          </Card>
        </View>

        <View style={{ flex: 1, minWidth: '47%' }}>
          <Card className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-slate-700 font-extrabold uppercase tracking-wider">Total Collected</Text>
              <View className="w-7 h-7 rounded-lg bg-[#f0f7fb] items-center justify-center">
                <IndianRupee size={15} color="#0d5984" />
              </View>
            </View>
            <Text className="text-xl font-black text-[#0d5984] mt-1.5">{formatRupees(stats.totalCollected)}</Text>
          </Card>
        </View>

        <View style={{ flex: 1, minWidth: '47%' }}>
          <TouchableOpacity
            onPress={() => setViewFilter(viewFilter === 'PENDING' ? 'ALL' : 'PENDING')}
            activeOpacity={0.8}
          >
            <Card className={`p-3.5 rounded-2xl border shadow-sm ${
              viewFilter === 'PENDING' ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-200/80'
            }`}>
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-amber-900 font-extrabold uppercase tracking-wider">Pending Dues</Text>
                <View className="w-7 h-7 rounded-lg bg-amber-100 items-center justify-center">
                  <AlertCircle size={15} color="#d97706" />
                </View>
              </View>
              <Text className="text-xl font-black text-amber-700 mt-1.5">{formatRupees(stats.totalPendingDues)}</Text>
            </Card>
          </TouchableOpacity>
        </View>
      </View>

      {/* Unified Search & Segmented Filter Control Panel (Mobile Optimized) */}
      <View className="mb-5 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        {/* iOS-Style Segmented Control Switch */}
        <View className="flex-row bg-slate-100 p-1 rounded-xl mb-3">
          <TouchableOpacity
            onPress={() => setViewFilter('ALL')}
            activeOpacity={0.85}
            className={`flex-1 py-2.5 px-2 rounded-lg flex-row items-center justify-center transition-all ${
              viewFilter === 'ALL'
                ? 'bg-[#0d5984] shadow-sm'
                : ''
            }`}
          >
            <Users size={14} color={viewFilter === 'ALL' ? '#ffffff' : '#475569'} />
            <Text className={`text-xs ml-1.5 font-extrabold truncate ${
              viewFilter === 'ALL' ? 'text-white' : 'text-slate-700'
            }`}>
              All ({reportData.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setViewFilter('PENDING')}
            activeOpacity={0.85}
            className={`flex-1 py-2.5 px-2 rounded-lg flex-row items-center justify-center transition-all ${
              viewFilter === 'PENDING'
                ? 'bg-[#ec861a] shadow-sm'
                : ''
            }`}
          >
            <AlertCircle size={14} color={viewFilter === 'PENDING' ? '#ffffff' : '#c66708'} />
            <Text className={`text-xs ml-1.5 font-extrabold truncate ${
              viewFilter === 'PENDING' ? 'text-white' : 'text-[#c66708]'
            }`}>
              Pending Dues ({pendingMembersCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Integrated Search Bar Input */}
        <View className="relative">
          <View className="absolute left-3.5 top-3 z-10">
            <Search size={16} color="#64748b" />
          </View>
          <TextInput
            value={memberSearch}
            onChangeText={setMemberSearch}
            placeholder="Search member or company..."
            placeholderTextColor="#94a3b8"
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm font-medium text-slate-900 focus:bg-white"
          />
        </View>

        {/* Active Filter Indicator Badge */}
        {viewFilter === 'PENDING' && (
          <View className="flex-row items-center justify-between mt-3 pt-2.5 border-t border-slate-100 px-1 flex-wrap gap-1">
            <View className="flex-row items-center flex-1 min-w-0 pr-2">
              <View className="w-2 h-2 rounded-full bg-[#ec861a] mr-2 shrink-0" />
              <Text numberOfLines={1} className="text-xs font-bold text-[#c66708] truncate">
                Showing members with pending dues
              </Text>
            </View>
            <TouchableOpacity onPress={() => setViewFilter('ALL')} activeOpacity={0.8}>
              <Text className="text-xs font-black text-[#0d5984] hover:underline">
                Clear Filter
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
                    <TouchableOpacity
                      onPress={() => handleSendWhatsApp(item.fullName, item.mobileNumber, item.pendingDues)}
                      className="bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200/80 flex-row items-center"
                    >
                      <WhatsAppIcon size={14} color="#047857" style={{ marginRight: 5 }} />
                      <Text className="text-[11px] font-extrabold text-emerald-800">WhatsApp</Text>
                    </TouchableOpacity>
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
