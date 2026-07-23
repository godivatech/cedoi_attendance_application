import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform, FlatList
} from 'react-native';
import { useRouter } from 'expo-router';
import { collectionGroup, query, getDocs, doc, writeBatch, increment, collection } from 'firebase/firestore';
import { db } from '../../src/services/firebase';
import {
  IndianRupee, Users, Calendar, Download, Search, CheckCircle2, Clock, AlertCircle,
  MessageSquare, CreditCard, Banknote, Filter, RefreshCw, ChevronRight, ShieldCheck
} from 'lucide-react-native';
import { formatRupees } from '../../src/utils/currency';
import { showAlert } from '../../src/utils/platformAlert';
import { WhatsAppIcon } from '../../src/components/ui/WhatsAppIcon';
import { Pagination } from '../../src/components/ui/Pagination';

interface AttendanceRecord {
  id: string;
  meetingId: string;
  meetingTitle: string;
  meetingDate: string;
  venue: string;
  entryFee: number;
  memberId: string;
  memberFullName: string;
  memberCompanyName: string;
  memberMobile: string;
  memberCategory: string;
  paymentStatus: 'PAID' | 'PENDING' | 'WAIVED' | 'ABSENT';
  paymentMode?: 'CASH' | 'UPI';
  amountCollected: number;
  checkInTime?: any;
  punctualityStatus?: string;
  attireStatus?: string;
}

export default function AdminDuesScreen() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  // Filter & Search States
  const [activeTab, setActiveTab] = useState<'OVERDUE' | 'RECEIPTS'>('OVERDUE');
  const [viewMode, setViewMode] = useState<'BY_MEMBER' | 'BY_MEETING'>('BY_MEMBER');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minDuesFilter, setMinDuesFilter] = useState<'ALL' | '500' | '1000'>('ALL');

  // Settlement Modal State
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [settling, setSettling] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Fetch all attendance records across all meetings and chapter members
  const fetchDuesData = async () => {
    setLoading(true);
    try {
      // Fetch all members
      const membersSnap = await getDocs(query(collection(db, 'members')));
      const membersList: any[] = [];
      membersSnap.forEach(d => {
        membersList.push({ id: d.id, ...d.data() });
      });

      // Fetch all meetings
      const meetingsSnap = await getDocs(query(collection(db, 'meetings')));
      const meetingsList: any[] = [];
      meetingsSnap.forEach(d => {
        meetingsList.push({ id: d.id, ...d.data() });
      });

      // Fetch all attendance collection group items
      const attSnap = await getDocs(query(collectionGroup(db, 'attendance')));
      const attendanceList: any[] = [];
      attSnap.docs.forEach(d => {
        const meetingId = d.ref.parent?.parent?.id || '';
        attendanceList.push({
          id: d.id,
          meetingId,
          ...d.data()
        });
      });

      const list: AttendanceRecord[] = [];

      // For every meeting and every member, resolve attendance/dues record
      meetingsList.forEach(mtg => {
        const entryFee = mtg.entryFee || 500;
        const meetingTitle = mtg.title || 'CEDOI Meeting';
        const meetingDate = mtg.date || 'N/A';
        const venue = mtg.venue || 'Main Hall';

        membersList.forEach(m => {
          const att = attendanceList.find(a => a.meetingId === mtg.id && (a.memberId === m.id || a.id === m.id));

          if (att) {
            const memberSnap = att.memberSnapshot || {};
            const memberFullName = memberSnap.fullName || att.memberName || m.fullName || 'CEDOI Member';
            const memberCompanyName = memberSnap.companyName || m.companyName || '';
            const memberMobile = memberSnap.mobileNumber || m.mobileNumber || '';
            const memberCategory = memberSnap.businessCategory || m.businessCategory || '';

            list.push({
              id: att.id,
              meetingId: mtg.id,
              meetingTitle,
              meetingDate,
              venue,
              entryFee,
              memberId: m.id,
              memberFullName,
              memberCompanyName,
              memberMobile,
              memberCategory,
              paymentStatus: att.paymentStatus || (att.isAbsent ? 'ABSENT' : 'PENDING'),
              paymentMode: att.paymentMode,
              amountCollected: att.amountCollected || 0,
              checkInTime: att.checkInTime,
              punctualityStatus: att.punctualityStatus,
              attireStatus: att.attireStatus
            });
          } else {
            // Member was absent/unmarked for this meeting -> Creates an overdue dues entry for this meeting
            list.push({
              id: `${mtg.id}_${m.id}`,
              meetingId: mtg.id,
              meetingTitle,
              meetingDate,
              venue,
              entryFee,
              memberId: m.id,
              memberFullName: m.fullName || 'CEDOI Member',
              memberCompanyName: m.companyName || '',
              memberMobile: m.mobileNumber || '',
              memberCategory: m.businessCategory || '',
              paymentStatus: 'ABSENT',
              amountCollected: 0
            });
          }
        });
      });

      // Sort newest meetings first
      list.sort((a, b) => (b.meetingDate || '').localeCompare(a.meetingDate || ''));
      setRecords(list);
    } catch (error: any) {
      console.error('Error fetching dues data:', error);
      showAlert('Error', 'Failed to load financial dues: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDuesData();
  }, []);

  // Filtered Lists & Metrics Calculation
  const { overdueRecords, paidRecords, metrics } = useMemo(() => {
    let totalOverdue = 0;
    let totalCollected = 0;
    const unpaidMembersSet = new Set<string>();

    const overdue: AttendanceRecord[] = [];
    const paid: AttendanceRecord[] = [];

    records.forEach(r => {
      // Date filtering
      if (startDate && r.meetingDate < startDate) return;
      if (endDate && r.meetingDate > endDate) return;

      // Amount filter
      const fee = r.entryFee || 500;
      if (minDuesFilter === '500' && fee < 500) return;
      if (minDuesFilter === '1000' && fee < 1000) return;

      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = r.memberFullName.toLowerCase().includes(q);
        const matchesCompany = r.memberCompanyName.toLowerCase().includes(q);
        const matchesMeeting = r.meetingTitle.toLowerCase().includes(q);
        const matchesMobile = r.memberMobile.includes(q);
        if (!matchesName && !matchesCompany && !matchesMeeting && !matchesMobile) return;
      }

      if (r.paymentStatus === 'PENDING' || r.paymentStatus === 'ABSENT') {
        overdue.push(r);
        totalOverdue += fee;
        unpaidMembersSet.add(r.memberId);
      } else if (r.paymentStatus === 'PAID') {
        paid.push(r);
        totalCollected += (r.amountCollected || fee);
      }
    });

    return {
      overdueRecords: overdue,
      paidRecords: paid,
      metrics: {
        totalOverdue,
        totalCollected,
        unpaidMembersCount: unpaidMembersSet.size
      }
    };
  }, [records, searchQuery, startDate, endDate, minDuesFilter]);

  // Group Overdue Records by Member for clean aggregated cards
  const groupedMembersOverdue = useMemo(() => {
    const map: Record<string, {
      memberId: string;
      memberFullName: string;
      memberCompanyName: string;
      memberMobile: string;
      memberCategory: string;
      totalPending: number;
      meetingsCount: number;
      records: AttendanceRecord[];
    }> = {};

    overdueRecords.forEach(r => {
      const fee = r.entryFee || 500;
      if (!map[r.memberId]) {
        map[r.memberId] = {
          memberId: r.memberId,
          memberFullName: r.memberFullName,
          memberCompanyName: r.memberCompanyName,
          memberMobile: r.memberMobile,
          memberCategory: r.memberCategory,
          totalPending: 0,
          meetingsCount: 0,
          records: []
        };
      }
      map[r.memberId].totalPending += fee;
      map[r.memberId].meetingsCount += 1;
      map[r.memberId].records.push(r);
    });

    return Object.values(map).sort((a, b) => b.totalPending - a.totalPending);
  }, [overdueRecords]);

  // Reset pagination when active filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab, minDuesFilter, startDate, endDate]);

  // Consolidated WhatsApp Reminder for Grouped Member Dues
  const handleSendGroupedWhatsApp = (name: string, mobile: string, totalPending: number, count: number) => {
    let cleanPhone = (mobile || '').replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    const text = `Hello ${name}, Greetings from CEDOI!\n\nThis is a polite reminder regarding your pending meeting attendance fees totaling ₹${totalPending} across ${count} meeting(s).\n\nKindly clear your dues at your earliest convenience. Thank you!`;
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
    if (typeof window !== 'undefined') window.open(url, '_blank');
  };

  const activeDisplayList = activeTab === 'OVERDUE' ? overdueRecords : paidRecords;
  const totalPages = Math.max(1, Math.ceil(activeDisplayList.length / PAGE_SIZE));
  const paginatedDisplayList = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return activeDisplayList.slice(start, start + PAGE_SIZE);
  }, [activeDisplayList, currentPage]);

  // 1-Tap Payment Settlement Submission
  const handleSettlePayment = async (record: AttendanceRecord, mode: 'CASH' | 'UPI' | 'WAIVED') => {
    setSettling(true);
    try {
      const batch = writeBatch(db);
      const attendanceRef = doc(db, `meetings/${record.meetingId}/attendance`, record.memberId);
      const meetingRef = doc(db, 'meetings', record.meetingId);

      const fee = record.entryFee || 500;

      if (mode === 'WAIVED') {
        batch.set(attendanceRef, {
          paymentStatus: 'WAIVED',
          amountCollected: 0,
          updatedAt: new Date()
        }, { merge: true });
      } else {
        batch.set(attendanceRef, {
          paymentStatus: 'PAID',
          paymentMode: mode,
          amountCollected: fee,
          checkInTime: new Date(),
          updatedAt: new Date()
        }, { merge: true });

        batch.update(meetingRef, {
          'metrics.totalCollected': increment(fee)
        });
      }

      await batch.commit();
      showAlert('Payment Settled', `Marked fee as ${mode} for ${record.memberFullName}!`);
      setSelectedRecord(null);
      fetchDuesData();
    } catch (e: any) {
      showAlert('Error', 'Failed to settle payment: ' + e.message);
    } finally {
      setSettling(false);
    }
  };

  // 1-Tap Broadcast / Individual WhatsApp Payment Reminder
  const handleSendWhatsAppReminder = (record?: AttendanceRecord) => {
    if (record) {
      let cleanPhone = (record.memberMobile || '').replace(/\D/g, '');
      if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
      if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;
      const text = `Hello ${record.memberFullName}, Greetings from CEDOI!\n\nThis is a friendly reminder regarding your pending entry fee of ₹${record.entryFee} for "${record.meetingTitle}" (${record.meetingDate}).\n\nKindly clear your dues at your earliest convenience. Thank you!`;
      const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
      if (typeof window !== 'undefined') window.open(url, '_blank');
    } else {
      // Broadcast reminder info
      showAlert(
        'Broadcast Reminders',
        `Send individual WhatsApp reminders to ${overdueRecords.length} members with overdue balances?`,
        [
          {
            text: 'Send Broadcast',
            onPress: () => {
              overdueRecords.slice(0, 5).forEach((r, idx) => {
                setTimeout(() => {
                  handleSendWhatsAppReminder(r);
                }, idx * 1000);
              });
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  // CSV Exporter for Dues & Payments Audit Log
  const handleExportCSV = () => {
    let csv = `CEDOI Dues & Financial Payments Audit Report\n`;
    csv += `Total Overdue Dues,₹${metrics.totalOverdue}\n`;
    csv += `Total Collected Fees,₹${metrics.totalCollected}\n`;
    csv += `Unpaid Members,${metrics.unpaidMembersCount}\n\n`;

    csv += `Status,Meeting Title,Meeting Date,Member Name,Company,Mobile,Entry Fee (₹),Payment Mode,Collected Amount (₹)\n`;

    const listToExport = activeTab === 'OVERDUE' ? overdueRecords : paidRecords;

    listToExport.forEach(r => {
      csv += `"${r.paymentStatus}","${r.meetingTitle}","${r.meetingDate}","${r.memberFullName}","${r.memberCompanyName}","${r.memberMobile}",${r.entryFee},"${r.paymentMode || 'N/A'}",${r.amountCollected || 0}\n`;
    });

    if (typeof window !== 'undefined') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `CEDOI_Dues_Audit_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      showAlert('Report Prepared', 'CSV export prepared successfully!');
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={{ color: '#64748b', marginTop: 14, fontWeight: '600', fontSize: 14 }}>
          Loading Dues & Payment Intelligence...
        </Text>
      </View>
    );
  }

  const currentDisplayList = activeTab === 'OVERDUE' ? overdueRecords : paidRecords;

  return (
    <ScrollView style={{ backgroundColor: '#f8fafc' }} className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      {/* Top Banner & Header: Responsive stacking */}
      <View style={{ width: '100%' }} className="flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <View style={{ flex: 1, width: '100%' }} className="pr-2 mb-2 sm:mb-0">
          <Text style={{ width: '100%' }} className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Dues & Payment Center
          </Text>
          <Text style={{ width: '100%' }} className="text-xs sm:text-sm color-[#475569] font-semibold mt-1">
            Track overdue entry fees, settle member payments, and export audit logs
          </Text>
        </View>

        {/* Action Buttons: Never shrink or text-wrap on Desktop */}
        <View className="flex-row items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <TouchableOpacity
            onPress={handleExportCSV}
            activeOpacity={0.85}
            style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 1.5, minHeight: 42 }}
            className="px-4 py-2 rounded-xl shadow-xs flex-row items-center justify-center"
          >
            <Download size={15} color="#334155" style={{ marginRight: 6 }} />
            <Text numberOfLines={1} style={Platform.OS === 'web' ? ({ whiteSpace: 'nowrap' } as any) : undefined} className="text-slate-700 font-extrabold text-xs sm:text-sm">
              Export CSV
            </Text>
          </TouchableOpacity>

          {overdueRecords.length > 0 && (
            <TouchableOpacity
              onPress={() => handleSendWhatsAppReminder()}
              activeOpacity={0.85}
              style={{ backgroundColor: '#059669', minHeight: 42 }}
              className="px-4 py-2 rounded-xl shadow-xs flex-row items-center justify-center"
            >
              <WhatsAppIcon size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text numberOfLines={1} style={Platform.OS === 'web' ? ({ whiteSpace: 'nowrap' } as any) : undefined} className="text-white font-black text-xs sm:text-sm">
                Broadcast Reminders
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 3 Top Financial Scorecards: 1 Column on Mobile, 3 Columns on Tablet/Desktop */}
      <View className="flex-row flex-wrap -mx-2 mb-6">
        {/* Scorecard 1: Total Overdue Dues */}
        <View className="w-full md:w-1/3 px-2 mb-3">
          <View style={{ backgroundColor: '#ffffff', borderColor: '#fecdd3', borderWidth: 1.5 }} className="rounded-2xl p-4 sm:p-5 shadow-xs">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xs font-black text-rose-900 uppercase tracking-wider">Total Overdue Dues</Text>
              <View className="w-9 h-9 rounded-xl bg-rose-50 items-center justify-center border border-rose-100">
                <IndianRupee size={18} color="#be123c" />
              </View>
            </View>
            <Text className="text-2xl sm:text-3xl font-black text-rose-700 tracking-tight">
              ₹{metrics.totalOverdue}
            </Text>
            <Text className="text-xs text-rose-800 mt-1.5 font-bold">
              {overdueRecords.length} Pending Fee Records
            </Text>
          </View>
        </View>

        {/* Scorecard 2: Total Dues Collected */}
        <View className="w-full md:w-1/3 px-2 mb-3">
          <View style={{ backgroundColor: '#ffffff', borderColor: '#bbf7d0', borderWidth: 1.5 }} className="rounded-2xl p-4 sm:p-5 shadow-xs">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xs font-black text-emerald-900 uppercase tracking-wider">Total Dues Collected</Text>
              <View className="w-9 h-9 rounded-xl bg-emerald-50 items-center justify-center border border-emerald-100">
                <ShieldCheck size={18} color="#047857" />
              </View>
            </View>
            <Text className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">
              ₹{metrics.totalCollected}
            </Text>
            <Text className="text-xs text-emerald-800 mt-1.5 font-bold">
              {paidRecords.length} Settled Payment Receipts
            </Text>
          </View>
        </View>

        {/* Scorecard 3: Unpaid Members */}
        <View className="w-full md:w-1/3 px-2 mb-3">
          <View style={{ backgroundColor: '#ffffff', borderColor: '#fde68a', borderWidth: 1.5 }} className="rounded-2xl p-4 sm:p-5 shadow-xs">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xs font-black text-amber-900 uppercase tracking-wider">Unpaid Members</Text>
              <View className="w-9 h-9 rounded-xl bg-amber-50 items-center justify-center border border-amber-100">
                <Users size={18} color="#c66708" />
              </View>
            </View>
            <Text className="text-2xl sm:text-3xl font-black text-amber-800 tracking-tight">
              {metrics.unpaidMembersCount} Members
            </Text>
            <Text className="text-xs text-amber-900 mt-1.5 font-bold">
              Pending Dues Follow-up Required
            </Text>
          </View>
        </View>
      </View>

      {/* Multi-Filter Toolbar */}
      <View style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 1.5 }} className="rounded-2xl p-3.5 sm:p-4 mb-6 shadow-xs">
        <View className="flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          {/* Search Input */}
          <View style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1', borderWidth: 1.5 }} className="flex-1 flex-row items-center rounded-xl px-3.5 h-11">
            <Search size={16} color="#64748b" />
            <TextInput
              style={{ flex: 1, marginLeft: 8, fontSize: 14, color: '#0f172a', fontWeight: '500' }}
              placeholder="Search member, company, meeting, mobile..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Amount Presets & Refresh (Single-Line High Legibility Pills) */}
          <View className="flex-row items-center gap-2">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6 }}
              style={{ flexGrow: 0 }}
            >
              {[
                { key: 'ALL', label: 'All Dues' },
                { key: '500', label: '≥ ₹500' },
                { key: '1000', label: '≥ ₹1,000' }
              ].map(preset => (
                <TouchableOpacity
                  key={preset.key}
                  onPress={() => setMinDuesFilter(preset.key as any)}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: minDuesFilter === preset.key ? '#0d5984' : '#ffffff',
                    borderColor: minDuesFilter === preset.key ? '#0d5984' : '#cbd5e1',
                    borderWidth: 1.5,
                    height: 42,
                    paddingHorizontal: 14,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderRadius: 12
                  }}
                >
                  <Text numberOfLines={1} style={[{ fontSize: 13, fontWeight: '800', color: minDuesFilter === preset.key ? '#ffffff' : '#475569' }, Platform.OS === 'web' ? ({ whiteSpace: 'nowrap' } as any) : undefined]}>
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              onPress={fetchDuesData}
              activeOpacity={0.85}
              style={{ backgroundColor: '#f1f5f9', borderColor: '#cbd5e1', borderWidth: 1.5, width: 42, height: 42 }}
              className="rounded-xl items-center justify-center shrink-0"
            >
              <RefreshCw size={16} color="#475569" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Dual Audit Ledger Card */}
      <View style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 1.5 }} className="rounded-2xl p-4 sm:p-5 shadow-xs">
        {/* Navigation Tabs Header */}
        <View className="flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <View className="flex-row flex-wrap gap-2 flex-1">
            <TouchableOpacity
              onPress={() => setActiveTab('OVERDUE')}
              style={{
                backgroundColor: activeTab === 'OVERDUE' ? '#fef2f2' : '#ffffff',
                borderColor: activeTab === 'OVERDUE' ? '#fecdd3' : '#cbd5e1',
                borderWidth: 1.5
              }}
              className="flex-row items-center px-4 py-2.5 rounded-xl justify-center"
            >
              <AlertCircle size={15} color={activeTab === 'OVERDUE' ? '#be123c' : '#64748b'} style={{ marginRight: 6 }} />
              <Text numberOfLines={1} style={Platform.OS === 'web' ? ({ whiteSpace: 'nowrap' } as any) : undefined} className={`text-xs sm:text-sm font-black ${activeTab === 'OVERDUE' ? 'text-rose-800' : 'text-slate-700'}`}>
                Pending Dues ({overdueRecords.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('RECEIPTS')}
              style={{
                backgroundColor: activeTab === 'RECEIPTS' ? '#f0fdf4' : '#ffffff',
                borderColor: activeTab === 'RECEIPTS' ? '#bbf7d0' : '#cbd5e1',
                borderWidth: 1.5
              }}
              className="flex-row items-center px-4 py-2.5 rounded-xl justify-center"
            >
              <CheckCircle2 size={15} color={activeTab === 'RECEIPTS' ? '#047857' : '#64748b'} style={{ marginRight: 6 }} />
              <Text numberOfLines={1} style={Platform.OS === 'web' ? ({ whiteSpace: 'nowrap' } as any) : undefined} className={`text-xs sm:text-sm font-black ${activeTab === 'RECEIPTS' ? 'text-emerald-800' : 'text-slate-700'}`}>
                Paid Receipts ({paidRecords.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Grouping Toggle Pill Switch for Pending Dues */}
          {activeTab === 'OVERDUE' && (
            <View className="flex-row bg-slate-100 p-1 rounded-xl shrink-0">
              <TouchableOpacity
                onPress={() => setViewMode('BY_MEMBER')}
                className={`px-3 py-1.5 rounded-lg flex-row items-center transition-all ${
                  viewMode === 'BY_MEMBER' ? 'bg-[#0d5984] shadow-xs' : ''
                }`}
              >
                <Users size={12} color={viewMode === 'BY_MEMBER' ? '#ffffff' : '#475569'} />
                <Text className={`text-xs ml-1.5 font-bold ${viewMode === 'BY_MEMBER' ? 'text-white' : 'text-slate-600'}`}>
                  Group by Member ({groupedMembersOverdue.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setViewMode('BY_MEETING')}
                className={`px-3 py-1.5 rounded-lg flex-row items-center transition-all ${
                  viewMode === 'BY_MEETING' ? 'bg-[#0d5984] shadow-xs' : ''
                }`}
              >
                <Calendar size={12} color={viewMode === 'BY_MEETING' ? '#ffffff' : '#475569'} />
                <Text className={`text-xs ml-1.5 font-bold ${viewMode === 'BY_MEETING' ? 'text-white' : 'text-slate-600'}`}>
                  Itemized Meetings ({overdueRecords.length})
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Ledger Items List */}
        {activeTab === 'OVERDUE' && viewMode === 'BY_MEMBER' ? (
          groupedMembersOverdue.length > 0 ? (
            <View className="gap-3">
              {groupedMembersOverdue.map((m) => {
                const initial = m.memberFullName ? m.memberFullName.charAt(0).toUpperCase() : 'U';

                return (
                  <View
                    key={m.memberId}
                    style={{
                      backgroundColor: '#ffffff',
                      borderWidth: 1.5,
                      borderColor: '#fecdd3',
                      borderRadius: 20,
                      padding: 16
                    }}
                    className="shadow-2xs gap-3.5 mb-3"
                  >
                    <View className="flex-row items-start justify-between gap-2.5">
                      <View className="flex-row items-start flex-1 min-w-0">
                        <View style={{ backgroundColor: '#fff1f2', width: 44, height: 44, borderRadius: 22 }} className="items-center justify-center mr-3 shrink-0">
                          <Text style={{ color: '#be123c', fontSize: 18, fontWeight: '900' }}>{initial}</Text>
                        </View>

                        <View className="flex-1 min-w-0">
                          <Text numberOfLines={1} className="text-base sm:text-lg font-black text-slate-900 truncate">
                            {m.memberFullName}
                          </Text>
                          <Text numberOfLines={1} className="text-xs text-slate-500 font-semibold truncate mt-0.5">
                            {[m.memberCompanyName, m.memberCategory].filter(Boolean).join(' • ') || 'CEDOI Member'}
                          </Text>
                        </View>
                      </View>

                      <View className="flex-col items-end shrink-0 pl-2">
                        <Text className="text-xs font-black uppercase text-amber-900 tracking-wider">Total Pending</Text>
                        <Text className="text-xl sm:text-2xl font-black text-rose-700 mt-0.5">
                          ₹{m.totalPending.toLocaleString('en-IN')}
                        </Text>
                        <Text className="text-[11px] font-bold text-rose-800 mt-0.5">
                          Across {m.meetingsCount} meeting(s)
                        </Text>
                      </View>
                    </View>

                    {/* Unpaid Meetings Breakdown Badges */}
                    <View className="pt-2 border-t border-slate-100 flex-row flex-wrap items-center gap-1.5">
                      <Text className="text-[11px] font-bold text-slate-400 mr-1">Unpaid:</Text>
                      {m.records.slice(0, 5).map(r => (
                        <View key={r.id + '-' + r.meetingId} className="bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                          <Text className="text-[11px] font-extrabold text-rose-800">
                            {r.meetingDate}: ₹{r.entryFee}
                          </Text>
                        </View>
                      ))}
                      {m.records.length > 5 && (
                        <Text className="text-[11px] font-bold text-slate-500">
                          +{m.records.length - 5} more
                        </Text>
                      )}
                    </View>

                    {/* Member Quick Action Buttons Bar */}
                    <View className="flex-row items-center justify-between pt-2 gap-2 flex-wrap sm:flex-nowrap">
                      <TouchableOpacity
                        onPress={() => router.push({ pathname: '/(admin)/member-analytics', params: { memberId: m.memberId } })}
                        style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1 }}
                        className="px-3 py-1.5 rounded-xl flex-row items-center"
                      >
                        <Text className="text-xs font-bold text-blue-700">Member 360° Profile →</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleSendGroupedWhatsApp(m.memberFullName, m.memberMobile, m.totalPending, m.meetingsCount)}
                        style={{ backgroundColor: '#059669' }}
                        className="px-3.5 py-1.5 rounded-xl flex-row items-center shadow-xs"
                      >
                        <WhatsAppIcon size={14} color="#ffffff" style={{ marginRight: 5 }} />
                        <Text className="text-xs font-extrabold text-white">WhatsApp Reminder (₹{m.totalPending})</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View className="p-12 items-center bg-slate-50 rounded-2xl">
              <CheckCircle2 size={36} color="#059669" />
              <Text className="text-slate-700 font-bold text-base mt-2">All Clear!</Text>
              <Text className="text-slate-400 text-xs mt-1">There are currently no members with overdue dues.</Text>
            </View>
          )
        ) : activeDisplayList.length > 0 ? (
          <View className="gap-3">
            {paginatedDisplayList.map((item) => {
              const isOverdue = item.paymentStatus === 'PENDING' || item.paymentStatus === 'ABSENT';
              const initial = item.memberFullName ? item.memberFullName.charAt(0).toUpperCase() : 'U';

              return (
                <View
                  key={item.id + '-' + item.meetingId}
                  style={{
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderColor: isOverdue ? '#fecdd3' : '#cbd5e1',
                    borderRadius: 20,
                    padding: 16,
                    overflow: 'hidden'
                  }}
                  className="shadow-2xs gap-3.5 mb-3"
                >
                  {/* Top Block: Mobile friendly responsive layout */}
                  <View className="flex-row items-start justify-between gap-2.5">
                    {/* Left: Avatar + Details */}
                    <View className="flex-row items-start flex-1 min-w-0">
                      <View style={{ backgroundColor: '#fff1f2', width: 40, height: 40, borderRadius: 20 }} className="items-center justify-center mr-2.5 shrink-0">
                        <Text style={{ color: '#be123c', fontSize: 16, fontWeight: '900' }}>{initial}</Text>
                      </View>

                      <View className="flex-1 min-w-0">
                        <Text numberOfLines={1} className="text-[15px] sm:text-base font-extrabold text-slate-900 truncate">
                          {item.memberFullName}
                        </Text>
                        <View className="flex-row items-center flex-wrap mt-0.5">
                          <TouchableOpacity
                            onPress={() => router.push({ pathname: '/(admin)/member-analytics', params: { memberId: item.memberId } })}
                            style={{ backgroundColor: '#eff6ff', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 }}
                            className="shrink-0"
                          >
                            <Text style={{ color: '#2563eb', fontSize: 10, fontWeight: '700' }}>Member 360° →</Text>
                          </TouchableOpacity>
                        </View>
                        <Text numberOfLines={1} className="text-[11px] sm:text-xs text-slate-500 font-medium mt-1 truncate">
                          {[item.memberCompanyName, item.memberCategory].filter(Boolean).join(' • ') || 'CEDOI Member'}
                        </Text>
                      </View>
                    </View>

                    {/* Right: Fee Amount & Overdue Badge */}
                    <View className="flex-col items-end shrink-0 pl-1">
                      <Text style={{ color: isOverdue ? '#be123c' : '#047857' }} className="text-lg sm:text-xl font-black">
                        ₹{item.entryFee.toLocaleString('en-IN')}
                      </Text>
                      {isOverdue ? (
                        <View style={{ backgroundColor: '#fff1f2', borderColor: '#fecdd3', borderWidth: 1, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, marginTop: 3 }} className="flex-row items-center">
                          <AlertCircle size={10} color="#be123c" style={{ marginRight: 3 }} />
                          <Text style={{ color: '#be123c', fontSize: 10, fontWeight: '800' }}>Overdue</Text>
                        </View>
                      ) : (
                        <View style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderWidth: 1, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, marginTop: 3 }} className="flex-row items-center">
                          <CheckCircle2 size={10} color="#047857" style={{ marginRight: 3 }} />
                          <Text style={{ color: '#047857', fontSize: 10, fontWeight: '800' }}>Paid</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Middle Shaded Card */}
                  <View style={{ backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' }} className="p-3 flex-row items-center justify-between mt-0.5">
                    <View className="flex-row items-center flex-1 min-w-0 mr-2">
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#e2e8f0' }} className="items-center justify-center mr-2 shrink-0">
                        <Calendar size={14} color="#475569" />
                      </View>
                      <View className="flex-1 min-w-0">
                        <Text numberOfLines={1} className="text-[12px] sm:text-[13px] font-bold text-slate-900 truncate">
                          {item.meetingTitle}
                        </Text>
                        <Text numberOfLines={1} className="text-[10px] font-medium text-slate-500 mt-0.5">
                          ({item.meetingDate})
                        </Text>
                      </View>
                    </View>

                    <View style={{ width: 1, height: 24, backgroundColor: '#cbd5e1' }} className="mx-2" />

                    <View className="items-end shrink-0 pl-1">
                      <Text className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                        {isOverdue ? 'Overdue Fee' : 'Paid Fee'}
                      </Text>
                      <Text style={{ color: isOverdue ? '#be123c' : '#047857' }} className="text-[13px] sm:text-sm font-black mt-0.5">
                        ₹{item.entryFee.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>

                  {/* Bottom Action Buttons */}
                  <View className="flex-row items-center justify-between gap-2 pt-1">
                    {isOverdue ? (
                      <>
                        <TouchableOpacity
                          onPress={() => handleSendWhatsAppReminder(item)}
                          activeOpacity={0.8}
                          style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderWidth: 1, height: 40, borderRadius: 10 }}
                          className="flex-1 flex-row items-center justify-center px-1"
                        >
                          <WhatsAppIcon size={14} color="#15803d" style={{ marginRight: 4 }} />
                          <Text numberOfLines={1} style={Platform.OS === 'web' ? ({ whiteSpace: 'nowrap' } as any) : undefined} className="text-[12px] sm:text-[13px] font-extrabold text-emerald-800">
                            WhatsApp
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => setSelectedRecord(item)}
                          activeOpacity={0.8}
                          style={{ backgroundColor: '#031b4e', height: 40, borderRadius: 10 }}
                          className="flex-1 flex-row items-center justify-center px-1 shadow-xs"
                        >
                          <CreditCard size={14} color="#ffffff" style={{ marginRight: 4 }} />
                          <Text numberOfLines={1} style={Platform.OS === 'web' ? ({ whiteSpace: 'nowrap' } as any) : undefined} className="text-[12px] sm:text-[13px] font-bold text-white">
                            Settle
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <View style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderWidth: 1, height: 40, borderRadius: 10 }} className="flex-1 flex-row items-center justify-center px-1">
                        <CheckCircle2 size={14} color="#047857" style={{ marginRight: 4 }} />
                        <Text numberOfLines={1} className="text-[12px] sm:text-[13px] font-extrabold text-emerald-800">Paid Receipt Verified</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View className="items-center p-8 bg-slate-50 rounded-2xl border border-slate-200">
            <ShieldCheck size={44} color="#64748b" />
            <Text className="color-[#0f172a] font-extrabold text-base mt-3">No records match your active filter</Text>
            <Text className="color-[#475569] text-xs mt-1 font-semibold text-center">All dues are up to date or adjust your search filter above.</Text>
          </View>
        )}

        {/* Pagination Component */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={activeDisplayList.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </View>

      {/* Interactive Settlement Modal */}
      {selectedRecord && (
        <View style={{ position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', alignItems: 'center', padding: 16, zIndex: 9999 }}>
          <View style={{ width: '100%', maxWidth: 460, backgroundColor: '#ffffff', borderRadius: 24, padding: 24, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 24, borderWidth: 1.5, borderColor: '#cbd5e1' }}>
            <Text className="text-xl sm:text-2xl font-black text-slate-900 mb-1">Settle Overdue Fee</Text>
            <Text className="text-xs sm:text-sm text-slate-600 font-semibold mb-4">
              {selectedRecord.memberFullName} • {selectedRecord.meetingTitle}
            </Text>

            <View style={{ backgroundColor: '#f0f7fb', borderWidth: 1.5, borderColor: '#c6def0' }} className="p-4 rounded-2xl mb-5">
              <Text className="text-xs font-extrabold text-[#0d5984] uppercase tracking-wider">Entry Fee Amount</Text>
              <Text className="text-3xl font-black text-slate-900 mt-1">₹{selectedRecord.entryFee}</Text>
            </View>

            <Text className="text-xs font-black text-slate-700 uppercase mb-3 tracking-wider">Select Payment Collection Mode</Text>

            <View className="gap-2.5 mb-5">
              <TouchableOpacity
                onPress={() => handleSettlePayment(selectedRecord, 'CASH')}
                disabled={settling}
                style={{ backgroundColor: '#f0fdf4', borderWidth: 1.5, borderColor: '#22c55e' }}
                className="flex-row items-center p-3.5 rounded-xl"
              >
                <Banknote size={22} color="#166534" style={{ marginRight: 12 }} />
                <View className="flex-1">
                  <Text className="text-sm font-black text-emerald-900">Collect Cash</Text>
                  <Text className="text-xs font-bold text-emerald-700">Received ₹{selectedRecord.entryFee} in cash</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSettlePayment(selectedRecord, 'UPI')}
                disabled={settling}
                style={{ backgroundColor: '#f0f7fb', borderWidth: 1.5, borderColor: '#67bed9' }}
                className="flex-row items-center p-3.5 rounded-xl"
              >
                <CreditCard size={22} color="#0d5984" style={{ marginRight: 12 }} />
                <View className="flex-1">
                  <Text className="text-sm font-black text-[#0d5984]">Collect UPI / Online</Text>
                  <Text className="text-xs font-bold text-[#0d5984]">Received ₹{selectedRecord.entryFee} via UPI QR</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSettlePayment(selectedRecord, 'WAIVED')}
                disabled={settling}
                style={{ backgroundColor: '#faf5ff', borderWidth: 1.5, borderColor: '#c084fc' }}
                className="flex-row items-center p-3.5 rounded-xl"
              >
                <CheckCircle2 size={22} color="#7e22ce" style={{ marginRight: 12 }} />
                <View className="flex-1">
                  <Text className="text-sm font-black text-purple-900">Waive Fee (Complimentary)</Text>
                  <Text className="text-xs font-bold text-purple-700">Mark as complimentary entry</Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setSelectedRecord(null)}
              style={{ backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1' }}
              className="py-3 rounded-xl items-center"
            >
              <Text className="text-sm font-extrabold text-slate-700">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
