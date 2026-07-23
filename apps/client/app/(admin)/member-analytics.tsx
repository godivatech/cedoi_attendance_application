import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform, useWindowDimensions
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, collection, getDocs, collectionGroup, query, where, writeBatch, increment } from 'firebase/firestore';
import { db } from '../../src/services/firebase';
import { Member, Meeting } from '@cedoi/shared';
import {
  ChevronLeft, ChevronRight, Calendar, Clock, Briefcase, Phone, Mail, CheckCircle2,
  XCircle, IndianRupee, Download, Search, MessageSquare,
  Filter, TrendingUp, Shirt, AlertTriangle, Edit2, CreditCard, BarChart2, Users
} from 'lucide-react-native';
import { formatRupees } from '../../src/utils/currency';
import { showAlert } from '../../src/utils/platformAlert';
import { WhatsAppIcon } from '../../src/components/ui/WhatsAppIcon';

export default function AdminMemberAnalyticsScreen() {
  const router = useRouter();
  const { memberId } = useLocalSearchParams<{ memberId: string }>();
  const { width } = useWindowDimensions();

  const isMobile = width < 768;
  const isSmall = width < 520;

  const [member, setMember] = useState<Member | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Date Range Filters
  const [dateFilterPreset, setDateFilterPreset] = useState<'ALL' | '30D' | '90D' | 'YTD' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Ledger Search, Filter & Pagination
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerTab, setLedgerTab] = useState<'ALL' | 'PRESENT' | 'ABSENT' | 'PENDING'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 5;

  // Fetch Member, Meetings, and Attendance data
  const fetchData = async () => {
    if (!memberId) return;
    setLoading(true);
    try {
      // 1. Fetch Member Details
      const memberRef = doc(db, 'members', memberId);
      const memberSnap = await getDoc(memberRef);
      if (memberSnap.exists()) {
        setMember({ id: memberSnap.id, ...memberSnap.data() } as Member);
      }

      // 2. Fetch All Meetings
      const meetingsSnap = await getDocs(collection(db, 'meetings'));
      const meetingsList: Meeting[] = meetingsSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Meeting[];
      meetingsList.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setMeetings(meetingsList);

      // 3. Fetch Member's Attendance Records across all meetings
      const q = query(
        collectionGroup(db, 'attendance'),
        where('memberId', '==', memberId)
      );
      const attSnap = await getDocs(q);
      const attList: any[] = [];
      attSnap.forEach(d => {
        const meetingId = d.ref.parent?.parent?.id;
        attList.push({
          id: d.id,
          meetingId,
          ...d.data()
        });
      });
      setAttendanceRecords(attList);
    } catch (error: any) {
      console.error('Error fetching member analytics:', error);
      showAlert('Error', 'Failed to load member analytics: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [memberId]);

  // Compute Active Date Boundaries based on Preset or Custom dates
  const activeDateBounds = useMemo(() => {
    const now = new Date();
    let start = '';
    let end = '';

    if (dateFilterPreset === '30D') {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      start = d.toISOString().split('T')[0];
    } else if (dateFilterPreset === '90D') {
      const d = new Date(now);
      d.setDate(d.getDate() - 90);
      start = d.toISOString().split('T')[0];
    } else if (dateFilterPreset === 'YTD') {
      start = `${now.getFullYear()}-01-01`;
    } else if (dateFilterPreset === 'CUSTOM') {
      start = customStartDate;
      end = customEndDate;
    }

    return { start, end };
  }, [dateFilterPreset, customStartDate, customEndDate]);

  // Filtered Meetings within Date Bounds
  const filteredMeetings = useMemo(() => {
    return meetings.filter(m => {
      if (!m.date) return true;
      if (activeDateBounds.start && m.date < activeDateBounds.start) return false;
      if (activeDateBounds.end && m.date > activeDateBounds.end) return false;
      return true;
    });
  }, [meetings, activeDateBounds]);

  // Comprehensive 360 Degree Analytics Calculator
  const analytics = useMemo(() => {
    const totalScheduled = filteredMeetings.length;
    let attendedCount = 0;
    let absentCount = 0;

    let onTimeCount = 0;
    let graceCount = 0;
    let lateCount = 0;

    let perfectAttireCount = 0;
    let imperfectAttireCount = 0;

    let totalPaid = 0;
    let totalPending = 0;
    let pendingMeetingsCount = 0;

    // Detailed breakdown per meeting
    const historyItems = filteredMeetings.map(m => {
      const att = attendanceRecords.find(a => a.meetingId === m.id);
      const isAttended = att && att.paymentStatus !== 'ABSENT';
      const isAbsent = !att || att.paymentStatus === 'ABSENT';

      const entryFee = m.entryFee || 500;

      if (isAttended) {
        attendedCount++;

        // Punctuality
        if (att.punctualityStatus === 'ON_TIME') onTimeCount++;
        else if (att.punctualityStatus === 'GRACE_PERIOD') graceCount++;
        else if (att.punctualityStatus === 'LATE') lateCount++;
        else onTimeCount++; // Default to on time if unmarked

        // Attire
        if (att.attireStatus === 'PERFECT' || !att.attireStatus) perfectAttireCount++;
        else if (att.attireStatus === 'IMPERFECT') imperfectAttireCount++;

        // Financials
        if (att.paymentStatus === 'PAID') {
          totalPaid += att.amountCollected || entryFee;
        } else if (att.paymentStatus === 'PENDING') {
          totalPending += entryFee;
          pendingMeetingsCount++;
        }
      } else {
        absentCount++;
        // Absent meetings carry pending dues equal to entry fee
        totalPending += entryFee;
        pendingMeetingsCount++;
      }

      return {
        meetingId: m.id,
        meetingTitle: m.title || 'CEDOI Meeting',
        meetingDate: m.date || 'N/A',
        meetingTime: m.startTime || '09:30 AM',
        venue: m.venue || 'Main Hall',
        entryFee,
        isAttended,
        isAbsent,
        paymentStatus: att ? att.paymentStatus : 'ABSENT',
        paymentMode: att ? att.paymentMode : undefined,
        amountCollected: att ? (att.amountCollected || 0) : 0,
        checkInTime: att ? att.checkInTime : null,
        punctualityStatus: att ? (att.punctualityStatus || 'ON_TIME') : undefined,
        attireStatus: att ? (att.attireStatus || 'PERFECT') : undefined,
      };
    });

    const attendancePct = totalScheduled > 0 ? Math.round((attendedCount / totalScheduled) * 100) : 0;
    const punctualityPct = attendedCount > 0 ? Math.round((onTimeCount / attendedCount) * 100) : 100;
    const attirePct = attendedCount > 0 ? Math.round((perfectAttireCount / attendedCount) * 100) : 100;

    return {
      totalScheduled,
      attendedCount,
      absentCount,
      attendancePct,
      onTimeCount,
      graceCount,
      lateCount,
      punctualityPct,
      perfectAttireCount,
      imperfectAttireCount,
      attirePct,
      totalPaid,
      totalPending,
      pendingMeetingsCount,
      historyItems
    };
  }, [filteredMeetings, attendanceRecords]);

  // Membership 1-Year Renewal Info
  const renewalInfo = useMemo(() => {
    if (!member?.joinDate) return { isExpired: false, isDueSoon: false, days: 365 };
    try {
      const join = new Date(member.joinDate);
      const anniversary = new Date(join);
      anniversary.setFullYear(join.getFullYear() + 1);
      const now = new Date();
      const diffDays = Math.ceil((anniversary.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        isExpired: diffDays < 0,
        isDueSoon: diffDays >= 0 && diffDays <= 30,
        days: diffDays
      };
    } catch (e) {
      return { isExpired: false, isDueSoon: false, days: 365 };
    }
  }, [member]);

  // Filtered History Ledger for display inside tab
  const displayLedger = useMemo(() => {
    return analytics.historyItems.filter(item => {
      const matchesSearch = 
        item.meetingTitle.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
        item.meetingDate.includes(ledgerSearch);

      if (!matchesSearch) return false;

      if (ledgerTab === 'PRESENT') return item.isAttended;
      if (ledgerTab === 'ABSENT') return item.isAbsent;
      if (ledgerTab === 'PENDING') return item.paymentStatus === 'PENDING' || item.isAbsent;

      return true;
    });
  }, [analytics.historyItems, ledgerSearch, ledgerTab]);

  // Reset pagination when search or tab filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [ledgerSearch, ledgerTab]);

  const totalPages = Math.max(1, Math.ceil(displayLedger.length / PAGE_SIZE));
  const paginatedLedger = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return displayLedger.slice(start, start + PAGE_SIZE);
  }, [displayLedger, currentPage]);

  // Quick WhatsApp Launcher with dynamic personalized metrics summary
  const handleSendWhatsApp = () => {
    if (!member) return;
    const cleanPhone = (member.mobileNumber || '').replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    
    let text = `Hello ${member.fullName}, Greetings from CEDOI!\n\n`;
    text += `Your Performance Summary:\n`;
    text += `• Attendance Rate: ${analytics.attendancePct}% (${analytics.attendedCount}/${analytics.totalScheduled} Meetings)\n`;
    text += `• Punctuality Rating: ${analytics.punctualityPct}% On-Time\n`;
    text += `• Dress Code Rating: ${analytics.attirePct}% Perfect Attire\n`;

    if (analytics.totalPending > 0) {
      text += `\nPending Dues: ₹${analytics.totalPending} across ${analytics.pendingMeetingsCount} meeting(s).\nKindly clear your pending dues at your earliest convenience.`;
    } else {
      text += `\nAll dues are clear. Thank you for your active participation!`;
    }

    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`;
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  };

  // CSV Exporter for Member 360 Report
  const handleExportCSV = () => {
    if (!member) return;
    
    let csv = `CEDOI Member 360 Performance Report\n`;
    csv += `Member Name,${member.fullName}\n`;
    csv += `Company,${member.companyName}\n`;
    csv += `Mobile,${member.mobileNumber}\n`;
    csv += `Join Date,${member.joinDate || 'N/A'}\n`;
    csv += `Attendance Rate,${analytics.attendancePct}%\n`;
    csv += `Punctuality Score,${analytics.punctualityPct}%\n`;
    csv += `Attire Score,${analytics.attirePct}%\n`;
    csv += `Total Paid,₹${analytics.totalPaid}\n`;
    csv += `Total Pending,₹${analytics.totalPending}\n\n`;

    csv += `Meeting Date,Meeting Title,Status,Check-In Time,Punctuality,Attire,Payment Mode,Amount Paid\n`;
    
    analytics.historyItems.forEach(item => {
      const statusStr = item.isAttended ? 'PRESENT' : 'ABSENT';
      const checkInStr = item.checkInTime ? (item.checkInTime.toDate ? item.checkInTime.toDate().toLocaleTimeString() : new Date(item.checkInTime).toLocaleTimeString()) : 'N/A';
      const puncStr = item.punctualityStatus || 'N/A';
      const attireStr = item.attireStatus || 'N/A';
      const payMode = item.paymentMode || 'N/A';
      const amt = item.amountCollected || 0;

      csv += `"${item.meetingDate}","${item.meetingTitle}","${statusStr}","${checkInStr}","${puncStr}","${attireStr}","${payMode}",${amt}\n`;
    });

    if (typeof window !== 'undefined') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${member.fullName.replace(/\s+/g, '_')}_CEDOI_Report.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      showAlert('Exported', 'CSV report prepared for ' + member.fullName);
    }
  };

  // 1-Tap Resolve Payment inside Ledger
  const handleResolveLedgerPayment = async (item: any) => {
    if (!member) return;
    showAlert(
      'Resolve Pending Dues',
      `Mark entry fee of ₹${item.entryFee} as paid for "${item.meetingTitle}"?`,
      [
        {
          text: 'Pay via UPI',
          onPress: () => submitLedgerPayment(item, 'UPI')
        },
        {
          text: 'Pay via Cash',
          onPress: () => submitLedgerPayment(item, 'CASH')
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const submitLedgerPayment = async (item: any, mode: 'CASH' | 'UPI') => {
    try {
      const batch = writeBatch(db);
      const attendanceRef = doc(db, `meetings/${item.meetingId}/attendance`, memberId);
      const meetingRef = doc(db, 'meetings', item.meetingId);

      const fee = item.entryFee || 500;

      batch.set(attendanceRef, {
        memberId,
        memberSnapshot: {
          fullName: member?.fullName,
          companyName: member?.companyName
        },
        paymentStatus: 'PAID',
        paymentMode: mode,
        amountCollected: fee,
        checkInTime: new Date()
      }, { merge: true });

      batch.update(meetingRef, {
        'metrics.totalCollected': increment(fee)
      });

      await batch.commit();
      showAlert('Success', 'Payment resolved successfully!');
      fetchData();
    } catch (e: any) {
      showAlert('Error', 'Failed to resolve payment: ' + e.message);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={{ color: '#64748b', marginTop: 14, fontWeight: '600', fontSize: 14 }}>
          Loading 360° Member Intelligence...
        </Text>
      </View>
    );
  }

  if (!member) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <AlertTriangle size={48} color="#f43f5e" />
        <Text style={{ color: '#0f172a', fontWeight: '800', fontSize: 18, marginTop: 12 }}>Member Not Found</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 16, backgroundColor: '#4f46e5', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14 }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Back to Directory</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const kpiCardWidth = isSmall ? '100%' : isMobile ? '50%' : '25%';

  return (
    <ScrollView style={{ backgroundColor: '#f8fafc' }} className="flex-1" contentContainerStyle={{ padding: isMobile ? 12 : 24, paddingBottom: 48 }}>
      {/* Top Header Navigation */}
      <View style={{ flexDirection: isSmall ? 'column' : 'row', alignItems: isSmall ? 'stretch' : 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: '#c6def0', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 4, alignSelf: isSmall ? 'flex-start' : 'auto', flexShrink: 0 }}
        >
          <ChevronLeft size={16} color="#0d5984" />
          <Text style={{ color: '#0d5984', fontWeight: '800', fontSize: 13, marginLeft: 4 }}>
            Back to Directory
          </Text>
        </TouchableOpacity>

        {/* Action Buttons: Never shrink or stack vertically on Desktop */}
        <View style={{ flexDirection: 'row', gap: 10, alignSelf: isSmall ? 'stretch' : 'auto', flexShrink: 0 }}>
          <TouchableOpacity
            onPress={handleExportCSV}
            style={{ flex: isSmall ? 1 : 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: '#cbd5e1', flexShrink: 0, minWidth: 120 }}
          >
            <Download size={15} color="#334155" style={{ marginRight: 6 }} />
            <Text style={{ color: '#334155', fontWeight: '800', fontSize: 13 }}>Export CSV</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSendWhatsApp}
            style={{ flex: isSmall ? 1 : 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#059669', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, flexShrink: 0, minWidth: 140 }}
          >
            <WhatsAppIcon size={16} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>Send WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile Summary Card */}
      <View style={{ backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', padding: isMobile ? 16 : 24, marginBottom: 20, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 10 }}>
        <View style={{ flexDirection: isSmall ? 'column' : 'row', alignItems: isSmall ? 'stretch' : 'center', justifyContent: 'space-between', gap: 14, marginBottom: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
              <Text style={{ fontSize: 22, fontWeight: '700', color: '#334155' }}>{member.fullName.charAt(0).toUpperCase()}</Text>
            </View>

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <Text style={{ fontSize: isMobile ? 20 : 24, fontWeight: '800', color: '#0f172a' }}>{member.fullName}</Text>
                
                {/* Renewal Micro Status Capsule Pill */}
                {renewalInfo.isExpired ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#ef4444' }}>Expired</Text>
                  </View>
                ) : renewalInfo.isDueSoon ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#b45309' }}>Renewal Due ({renewalInfo.days}d)</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#166534' }}>Active Member</Text>
                  </View>
                )}
              </View>

              <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '500', marginTop: 2 }}>{member.companyName}</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => router.push({ pathname: '/(admin)/add-member', params: { memberId: member.id } })}
            style={{ backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: isSmall ? 'stretch' : 'flex-start' }}
          >
            <Edit2 size={13} color="#475569" style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569' }}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Member Details Grid Divider & Metadata */}
        <View style={{ flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', alignItems: isMobile ? 'stretch' : 'center', borderTopWidth: 1, borderColor: '#f1f5f9', paddingTop: 14, gap: isMobile ? 10 : 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: isMobile ? 0 : 20, paddingVertical: 2 }}>
            <Briefcase size={14} color="#94a3b8" />
            <Text style={{ fontSize: 13, color: '#475569', marginLeft: 8, fontWeight: '500' }}>{member.businessCategory}</Text>
          </View>

          {!isMobile && <View style={{ width: 1, height: 16, backgroundColor: '#e2e8f0', marginRight: 20 }} />}

          <View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: isMobile ? 0 : 20, paddingVertical: 2 }}>
            <Phone size={14} color="#94a3b8" />
            <TouchableOpacity onPress={() => { if (typeof window !== 'undefined') window.open(`tel:${member.mobileNumber}`, '_self'); }}>
              <Text style={{ fontSize: 13, color: '#2563eb', marginLeft: 8, fontWeight: '600' }}>{member.mobileNumber}</Text>
            </TouchableOpacity>
          </View>

          {member.joinDate ? (
            <>
              {!isMobile && <View style={{ width: 1, height: 16, backgroundColor: '#e2e8f0', marginRight: 20 }} />}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 2 }}>
                <Calendar size={14} color="#94a3b8" />
                <Text style={{ fontSize: 13, color: '#475569', marginLeft: 8, fontWeight: '500' }}>Joined: {member.joinDate}</Text>
              </View>
            </>
          ) : null}
        </View>
      </View>

      {/* Date Range Toolbar */}
      <View style={{ backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', padding: 18, marginBottom: 20, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Calendar size={16} color="#475569" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#0f172a' }}>Analytics Period</Text>
          </View>
          <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600' }}>
            {analytics.totalScheduled} Meetings Evaluated
          </Text>
        </View>

        {/* Preset Chips */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: dateFilterPreset === 'CUSTOM' ? 12 : 0 }}>
          {[
            { key: 'ALL', label: 'All Time' },
            { key: '30D', label: 'Last 30 Days' },
            { key: '90D', label: 'Last 90 Days' },
            { key: 'YTD', label: 'This Year' },
            { key: 'CUSTOM', label: 'Custom Range' },
          ].map(preset => (
            <TouchableOpacity
              key={preset.key}
              onPress={() => setDateFilterPreset(preset.key as any)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 10,
                backgroundColor: dateFilterPreset === preset.key ? '#0f172a' : '#ffffff',
                borderWidth: 1,
                borderColor: dateFilterPreset === preset.key ? '#0f172a' : '#e2e8f0',
                flexDirection: 'row',
                alignItems: 'center'
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: dateFilterPreset === preset.key ? '#ffffff' : '#475569' }}>
                {preset.label}
              </Text>
              {preset.key === 'CUSTOM' && <Calendar size={12} color={dateFilterPreset === preset.key ? '#fff' : '#94a3b8'} style={{ marginLeft: 6 }} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom Date Inputs */}
        {dateFilterPreset === 'CUSTOM' && (
          <View style={{ flexDirection: isSmall ? 'column' : 'row', gap: 12, borderTopWidth: 1, borderColor: '#f1f5f9', paddingTop: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 4 }}>From Date</Text>
              <TextInput
                style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 8, fontSize: 12, color: '#1e293b' }}
                placeholder="YYYY-MM-DD"
                value={customStartDate}
                onChangeText={setCustomStartDate}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 4 }}>To Date</Text>
              <TextInput
                style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 8, fontSize: 12, color: '#1e293b' }}
                placeholder="YYYY-MM-DD"
                value={customEndDate}
                onChangeText={setCustomEndDate}
              />
            </View>
          </View>
        )}
      </View>

      {/* 4 Performance KPI Cards (Preferred Top UI) */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, marginBottom: 20 }}>
        {/* Card 1: Attendance Rate */}
        <View style={{ width: kpiCardWidth, paddingHorizontal: 6, marginBottom: 12 }}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 18, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Users size={17} color="#2563eb" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.3 }}>Attendance Rate</Text>
                <Text style={{ fontSize: 26, fontWeight: '800', color: '#0f172a', marginTop: 2 }}>{analytics.attendancePct}%</Text>
              </View>
            </View>
            <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '500', marginBottom: 12 }}>
              {analytics.attendedCount} of {analytics.totalScheduled} Attended
            </Text>
            <View style={{ height: 4, backgroundColor: '#e0e7ff', borderRadius: 2, overflow: 'hidden' }}>
              <View style={{ width: `${analytics.attendancePct}%`, height: '100%', backgroundColor: '#3b82f6', borderRadius: 2 }} />
            </View>
          </View>
        </View>

        {/* Card 2: Punctuality Score */}
        <View style={{ width: kpiCardWidth, paddingHorizontal: 6, marginBottom: 12 }}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 18, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#ecfdf5', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Clock size={17} color="#10b981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.3 }}>Punctuality Score</Text>
                <Text style={{ fontSize: 26, fontWeight: '800', color: '#0f172a', marginTop: 2 }}>{analytics.punctualityPct}%</Text>
              </View>
            </View>
            <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '500', marginBottom: 12 }}>
              {analytics.onTimeCount} On Time | {analytics.graceCount} Slightly Late
            </Text>
            <View style={{ height: 4, backgroundColor: '#d1fae5', borderRadius: 2, overflow: 'hidden' }}>
              <View style={{ width: `${analytics.punctualityPct}%`, height: '100%', backgroundColor: '#10b981', borderRadius: 2 }} />
            </View>
          </View>
        </View>

        {/* Card 3: Dress Code Score */}
        <View style={{ width: kpiCardWidth, paddingHorizontal: 6, marginBottom: 12 }}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 18, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#faf5ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Shirt size={17} color="#a855f7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.3 }}>Dress Code Score</Text>
                <Text style={{ fontSize: 26, fontWeight: '800', color: '#0f172a', marginTop: 2 }}>{analytics.attirePct}%</Text>
              </View>
            </View>
            <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '500', marginBottom: 12 }}>
              {analytics.perfectAttireCount} Perfect | {analytics.imperfectAttireCount} Imperfect
            </Text>
            <View style={{ height: 4, backgroundColor: '#f3e8ff', borderRadius: 2, overflow: 'hidden' }}>
              <View style={{ width: `${analytics.attirePct}%`, height: '100%', backgroundColor: '#a855f7', borderRadius: 2 }} />
            </View>
          </View>
        </View>

        {/* Card 4: Pending Dues */}
        <View style={{ width: kpiCardWidth, paddingHorizontal: 6, marginBottom: 12 }}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 18, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: analytics.totalPending > 0 ? '#fef2f2' : '#ecfdf5', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <IndianRupee size={17} color={analytics.totalPending > 0 ? '#ef4444' : '#10b981'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.3 }}>Pending Dues</Text>
                <Text style={{ fontSize: 26, fontWeight: '800', color: analytics.totalPending > 0 ? '#ef4444' : '#047857', marginTop: 2 }}>
                  ₹{analytics.totalPending}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '500', marginBottom: 12 }}>
              Total Paid: ₹{analytics.totalPaid}
            </Text>
            <View style={{ height: 4, backgroundColor: '#f1f5f9', borderRadius: 2 }} />
          </View>
        </View>
      </View>

      {/* Meeting History Ledger */}
      <View style={{ backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', padding: 20, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>Meeting History Ledger</Text>
          <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '500' }}>{displayLedger.length} Records Found</Text>
        </View>

        {/* Filter Controls: Responsive Search & Horizontal Scroll Tabs */}
        <View className="flex-col sm:flex-row gap-3 mb-4">
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, height: 44 }}>
            <Search size={16} color="#64748b" />
            <TextInput
              style={{ flex: 1, marginLeft: 8, fontSize: 14, color: '#0f172a', fontWeight: '500' }}
              placeholder="Search meetings..."
              placeholderTextColor="#94a3b8"
              value={ledgerSearch}
              onChangeText={setLedgerSearch}
            />
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={{ gap: 8 }}
            style={{ flexGrow: 0 }}
          >
            {[
              { key: 'ALL', label: 'All' },
              { key: 'PRESENT', label: 'Present' },
              { key: 'ABSENT', label: 'Absent' },
              { key: 'PENDING', label: 'Pending Dues' },
            ].map(tab => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setLedgerTab(tab.key as any)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: ledgerTab === tab.key ? '#0d5984' : '#ffffff',
                  borderWidth: 1.5,
                  borderColor: ledgerTab === tab.key ? '#0d5984' : '#cbd5e1'
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: ledgerTab === tab.key ? '#ffffff' : '#475569' }}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Ledger List */}
        {paginatedLedger.length > 0 ? (
          <View style={{ gap: 10 }}>
            {paginatedLedger.map((item, idx) => (
              <View
                key={item.meetingId + '-' + idx}
                style={{
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: item.paymentStatus === 'PENDING' ? '#fde68a' : item.isAbsent ? '#fecdd3' : '#f1f5f9',
                  borderRadius: 14,
                  padding: 16
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>{item.meetingTitle}</Text>
                    <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{item.meetingDate} at {item.meetingTime} • {item.venue}</Text>
                  </View>

                  {/* Attendance Micro Badge */}
                  {item.isAttended ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                      <CheckCircle2 size={12} color="#166534" style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#166534' }}>Present</Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                      <XCircle size={12} color="#ef4444" style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#ef4444' }}>Absent</Text>
                    </View>
                  )}
                </View>

                {/* Vector Sub-Badges Row */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, borderTopWidth: 1, borderColor: '#f8fafc', paddingTop: 10 }}>
                  {item.isAttended && item.punctualityStatus ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: item.punctualityStatus === 'ON_TIME' ? '#10b981' : item.punctualityStatus === 'GRACE_PERIOD' ? '#f59e0b' : '#ef4444', marginRight: 5 }} />
                      <Text style={{ fontSize: 11, fontWeight: '600', color: '#475569' }}>
                        {item.punctualityStatus === 'ON_TIME' ? 'On Time' : item.punctualityStatus === 'GRACE_PERIOD' ? 'Slightly Late' : 'Late Arrival'}
                      </Text>
                    </View>
                  ) : null}

                  {item.isAttended && item.attireStatus ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' }}>
                      <Shirt size={12} color={item.attireStatus === 'PERFECT' ? '#10b981' : '#f97316'} style={{ marginRight: 5 }} />
                      <Text style={{ fontSize: 11, fontWeight: '600', color: '#475569' }}>
                        {item.attireStatus === 'PERFECT' ? 'Perfect Attire' : 'Imperfect Attire'}
                      </Text>
                    </View>
                  ) : null}

                  {/* Payment Status */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' }}>
                    {item.paymentStatus === 'PAID' ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0' }}>
                        <CreditCard size={12} color="#166534" style={{ marginRight: 5 }} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#166534' }}>Paid ₹{item.amountCollected} ({item.paymentMode || 'CASH'})</Text>
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ backgroundColor: '#fffbeb', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#fde68a' }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#b45309' }}>Pending ₹{item.entryFee}</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleResolveLedgerPayment(item)}
                          style={{ backgroundColor: '#3b82f6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>Pay Dues</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={{ alignItems: 'center', padding: 24, backgroundColor: '#f8fafc', borderRadius: 14 }}>
            <Text style={{ color: '#64748b', fontWeight: '500', fontSize: 13 }}>No meeting records match your search filter.</Text>
          </View>
        )}

        {/* Pagination Bar */}
        {displayLedger.length > PAGE_SIZE && (
          <View className="flex-col sm:flex-row items-center justify-between mt-5 pt-4 border-t border-slate-100 gap-3">
            <Text className="text-xs font-semibold text-slate-500">
              Showing <Text className="font-extrabold text-slate-800">{(currentPage - 1) * PAGE_SIZE + 1}</Text> to <Text className="font-extrabold text-slate-800">{Math.min(currentPage * PAGE_SIZE, displayLedger.length)}</Text> of <Text className="font-extrabold text-slate-800">{displayLedger.length}</Text> records
            </Text>

            <View className="flex-row items-center gap-1.5">
              <TouchableOpacity
                disabled={currentPage === 1}
                onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                style={{ opacity: currentPage === 1 ? 0.4 : 1 }}
                className="flex-row items-center px-3 py-1.5 rounded-lg border border-slate-200 bg-white shadow-xs"
              >
                <ChevronLeft size={14} color="#334155" style={{ marginRight: 4 }} />
                <Text className="text-xs font-extrabold text-slate-700">Prev</Text>
              </TouchableOpacity>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <TouchableOpacity
                  key={page}
                  onPress={() => setCurrentPage(page)}
                  style={{
                    backgroundColor: currentPage === page ? '#0d5984' : '#ffffff',
                    borderColor: currentPage === page ? '#0d5984' : '#cbd5e1'
                  }}
                  className="w-8 h-8 rounded-lg border items-center justify-center"
                >
                  <Text style={{ color: currentPage === page ? '#ffffff' : '#334155' }} className="text-xs font-black">
                    {page}
                  </Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                disabled={currentPage === totalPages}
                onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                style={{ opacity: currentPage === totalPages ? 0.4 : 1 }}
                className="flex-row items-center px-3 py-1.5 rounded-lg border border-slate-200 bg-white shadow-xs"
              >
                <Text className="text-xs font-extrabold text-slate-700">Next</Text>
                <ChevronRight size={14} color="#334155" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
