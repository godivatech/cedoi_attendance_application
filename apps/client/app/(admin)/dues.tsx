import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform, FlatList
} from 'react-native';
import { useRouter } from 'expo-router';
import { collectionGroup, query, getDocs, doc, writeBatch, increment } from 'firebase/firestore';
import { db } from '../../src/services/firebase';
import {
  IndianRupee, Users, Calendar, Download, Search, CheckCircle2, Clock, AlertCircle,
  MessageSquare, CreditCard, Banknote, Filter, RefreshCw, ChevronRight, ShieldCheck
} from 'lucide-react-native';
import { formatRupees } from '../../src/utils/currency';
import { showAlert } from '../../src/utils/platformAlert';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minDuesFilter, setMinDuesFilter] = useState<'ALL' | '500' | '1000'>('ALL');

  // Settlement Modal State
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [settling, setSettling] = useState(false);

  // Fetch all attendance records across all meetings
  const fetchDuesData = async () => {
    setLoading(true);
    try {
      // Fetch all attendance collection group items
      const attSnap = await getDocs(query(collectionGroup(db, 'attendance')));
      
      // Also fetch meetings map for meeting metadata fallback
      const meetingsSnap = await getDocs(query(collectionGroup(db, 'meetings')));
      const meetingsMap: Record<string, any> = {};
      meetingsSnap.forEach(d => {
        meetingsMap[d.id] = d.data();
      });

      const list: AttendanceRecord[] = [];

      attSnap.docs.forEach(d => {
        const data = d.data();
        const meetingId = d.ref.parent?.parent?.id || '';
        const meetingMeta = meetingsMap[meetingId] || {};

        const entryFee = meetingMeta.entryFee || data.entryFee || 500;
        const meetingTitle = meetingMeta.title || data.meetingTitle || 'CEDOI Meeting';
        const meetingDate = meetingMeta.date || data.meetingDate || 'N/A';
        const venue = meetingMeta.venue || 'Main Hall';

        const memberSnap = data.memberSnapshot || {};
        const memberFullName = memberSnap.fullName || data.memberName || 'CEDOI Member';
        const memberCompanyName = memberSnap.companyName || '';
        const memberMobile = memberSnap.mobileNumber || '';
        const memberCategory = memberSnap.businessCategory || '';

        list.push({
          id: d.id,
          meetingId,
          meetingTitle,
          meetingDate,
          venue,
          entryFee,
          memberId: data.memberId || d.id,
          memberFullName,
          memberCompanyName,
          memberMobile,
          memberCategory,
          paymentStatus: data.paymentStatus || 'PENDING',
          paymentMode: data.paymentMode,
          amountCollected: data.amountCollected || 0,
          checkInTime: data.checkInTime,
          punctualityStatus: data.punctualityStatus,
          attireStatus: data.attireStatus
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
      const cleanPhone = (record.memberMobile || '').replace(/\D/g, '');
      const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      const text = `Hello ${record.memberFullName}, Greetings from CEDOI!\n\nThis is a friendly reminder regarding your pending entry fee of ₹${record.entryFee} for "${record.meetingTitle}" (${record.meetingDate}).\n\nKindly clear your dues at your earliest convenience. Thank you!`;
      const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`;
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
    <ScrollView style={{ backgroundColor: '#f8fafc' }} className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
      {/* Top Banner & Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <View>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#0f172a', letterSpacing: -0.5 }}>
            Dues & Payment Center
          </Text>
          <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '500', marginTop: 2 }}>
            Track overdue entry fees, settle member payments, and export audit logs
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            onPress={handleExportCSV}
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 4 }}
          >
            <Download size={14} color="#334155" style={{ marginRight: 6 }} />
            <Text style={{ color: '#334155', fontWeight: '600', fontSize: 13 }}>Export CSV</Text>
          </TouchableOpacity>

          {overdueRecords.length > 0 && (
            <TouchableOpacity
              onPress={() => handleSendWhatsAppReminder()}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#059669', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12 }}
            >
              <MessageSquare size={14} color="#fff" style={{ marginRight: 6 }} />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Broadcast Reminders</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 3 Top Financial Scorecards */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, marginBottom: 20 }}>
        {/* Scorecard 1: Total Overdue Dues */}
        <View style={{ width: Platform.OS === 'web' ? '33.33%' : '100%', paddingHorizontal: 6, marginBottom: 12 }}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 18, borderWidth: 1, borderColor: '#fecdd3', padding: 20, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#991b1b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Overdue Dues</Text>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center' }}>
                <IndianRupee size={18} color="#ef4444" />
              </View>
            </View>
            <Text style={{ fontSize: 30, fontWeight: '800', color: '#be123c', letterSpacing: -0.5 }}>
              ₹{metrics.totalOverdue}
            </Text>
            <Text style={{ fontSize: 12, color: '#9f1239', marginTop: 4, fontWeight: '500' }}>
              {overdueRecords.length} Pending Fee Records
            </Text>
          </View>
        </View>

        {/* Scorecard 2: Total Dues Collected */}
        <View style={{ width: Platform.OS === 'web' ? '33.33%' : '100%', paddingHorizontal: 6, marginBottom: 12 }}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 18, borderWidth: 1, borderColor: '#bbf7d0', padding: 20, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#166534', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Dues Collected</Text>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center' }}>
                <ShieldCheck size={18} color="#10b981" />
              </View>
            </View>
            <Text style={{ fontSize: 30, fontWeight: '800', color: '#047857', letterSpacing: -0.5 }}>
              ₹{metrics.totalCollected}
            </Text>
            <Text style={{ fontSize: 12, color: '#15803d', marginTop: 4, fontWeight: '500' }}>
              {paidRecords.length} Settled Payment Receipts
            </Text>
          </View>
        </View>

        {/* Scorecard 3: Unpaid Members */}
        <View style={{ width: Platform.OS === 'web' ? '33.33%' : '100%', paddingHorizontal: 6, marginBottom: 12 }}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 18, borderWidth: 1, borderColor: '#fde68a', padding: 20, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#92400e', textTransform: 'uppercase', letterSpacing: 0.5 }}>Unpaid Members</Text>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#fffbeb', justifyContent: 'center', alignItems: 'center' }}>
                <Users size={18} color="#d97706" />
              </View>
            </View>
            <Text style={{ fontSize: 30, fontWeight: '800', color: '#b45309', letterSpacing: -0.5 }}>
              {metrics.unpaidMembersCount} Members
            </Text>
            <Text style={{ fontSize: 12, color: '#a16207', marginTop: 4, fontWeight: '500' }}>
              Pending Dues Follow-up Required
            </Text>
          </View>
        </View>
      </View>

      {/* Multi-Filter Toolbar */}
      <View style={{ backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', padding: 18, marginBottom: 20, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          {/* Search Input */}
          <View style={{ flex: 1, minWidth: 260, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, height: 42 }}>
            <Search size={16} color="#94a3b8" />
            <TextInput
              style={{ flex: 1, marginLeft: 8, fontSize: 13, color: '#1e293b' }}
              placeholder="Search member, company, meeting, mobile..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Amount Presets */}
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[
              { key: 'ALL', label: 'All Dues' },
              { key: '500', label: '≥ ₹500' },
              { key: '1000', label: '≥ ₹1,000' }
            ].map(preset => (
              <TouchableOpacity
                key={preset.key}
                onPress={() => setMinDuesFilter(preset.key as any)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: minDuesFilter === preset.key ? '#0f172a' : '#ffffff',
                  borderWidth: 1,
                  borderColor: minDuesFilter === preset.key ? '#0f172a' : '#e2e8f0'
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: minDuesFilter === preset.key ? '#ffffff' : '#475569' }}>
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={fetchDuesData}
            style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' }}
          >
            <RefreshCw size={16} color="#475569" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dual Audit Ledger Card */}
      <View style={{ backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', padding: 20, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8 }}>
        {/* Navigation Tabs */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, borderBottomWidth: 1, borderColor: '#f1f5f9', paddingBottom: 14 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={() => setActiveTab('OVERDUE')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 9,
                borderRadius: 12,
                backgroundColor: activeTab === 'OVERDUE' ? '#fef2f2' : '#ffffff',
                borderWidth: 1,
                borderColor: activeTab === 'OVERDUE' ? '#fecdd3' : '#e2e8f0'
              }}
            >
              <AlertCircle size={15} color={activeTab === 'OVERDUE' ? '#ef4444' : '#64748b'} style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: activeTab === 'OVERDUE' ? '#be123c' : '#475569' }}>
                Overdue Dues Ledger ({overdueRecords.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('RECEIPTS')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 9,
                borderRadius: 12,
                backgroundColor: activeTab === 'RECEIPTS' ? '#f0fdf4' : '#ffffff',
                borderWidth: 1,
                borderColor: activeTab === 'RECEIPTS' ? '#bbf7d0' : '#e2e8f0'
              }}
            >
              <CheckCircle2 size={15} color={activeTab === 'RECEIPTS' ? '#10b981' : '#64748b'} style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: activeTab === 'RECEIPTS' ? '#047857' : '#475569' }}>
                Payment Receipts Log ({paidRecords.length})
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600' }}>
            {currentDisplayList.length} Records Found
          </Text>
        </View>

        {/* Ledger Items List */}
        {currentDisplayList.length > 0 ? (
          <View style={{ gap: 12 }}>
            {currentDisplayList.map((item) => (
              <View
                key={item.id + '-' + item.meetingId}
                style={{
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: item.paymentStatus === 'PENDING' || item.paymentStatus === 'ABSENT' ? '#fecdd3' : '#e2e8f0',
                  borderRadius: 14,
                  padding: 16
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>{item.memberFullName}</Text>
                      <TouchableOpacity
                        onPress={() => router.push({ pathname: '/(admin)/member-analytics', params: { memberId: item.memberId } })}
                        style={{ backgroundColor: '#eff6ff', borderContent: 1, borderColor: '#bfdbfe', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#2563eb' }}>Member 360° →</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      {item.memberCompanyName} • {item.memberCategory || 'Member'} • {item.memberMobile}
                    </Text>
                  </View>

                  {/* Fee Highlight */}
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: item.paymentStatus === 'PAID' ? '#047857' : '#be123c' }}>
                      ₹{item.entryFee}
                    </Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: item.paymentStatus === 'PAID' ? '#10b981' : '#ef4444', textTransform: 'uppercase' }}>
                      {item.paymentStatus === 'PAID' ? `PAID VIA ${item.paymentMode || 'CASH'}` : 'OVERDUE FEE'}
                    </Text>
                  </View>
                </View>

                {/* Meeting Context & Actions Row */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderColor: '#f8fafc', paddingTop: 10, marginTop: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Calendar size={13} color="#94a3b8" />
                    <Text style={{ fontSize: 12, color: '#475569', marginLeft: 6, fontWeight: '500' }}>
                      {item.meetingTitle} ({item.meetingDate})
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: Platform.OS === 'web' ? 0 : 8 }}>
                    {item.paymentStatus !== 'PAID' ? (
                      <>
                        <TouchableOpacity
                          onPress={() => handleSendWhatsAppReminder(item)}
                          style={{ backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}
                        >
                          <MessageSquare size={12} color="#047857" style={{ marginRight: 4 }} />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#047857' }}>WhatsApp</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => setSelectedRecord(item)}
                          style={{ backgroundColor: '#0f172a', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 8 }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#ffffff' }}>Collect Dues</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <View style={{ backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0' }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#166534' }}>✓ Receipt Verified</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={{ alignItems: 'center', padding: 36, backgroundColor: '#f8fafc', borderRadius: 14 }}>
            <ShieldCheck size={40} color="#94a3b8" />
            <Text style={{ color: '#475569', fontWeight: '700', fontSize: 15, marginTop: 10 }}>No records match your active filter</Text>
            <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>All dues are up to date or adjust your search filter above.</Text>
          </View>
        )}
      </View>

      {/* Interactive Settlement Modal */}
      {selectedRecord && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '100%', maxWidth: 460, backgroundColor: '#ffffff', borderRadius: 20, padding: 24, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 4 }}>Settle Overdue Fee</Text>
            <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              {selectedRecord.memberFullName} • {selectedRecord.meetingTitle}
            </Text>

            <View style={{ backgroundColor: '#f8fafc', padding: 14, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' }}>
              <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600' }}>Entry Fee Amount</Text>
              <Text style={{ fontSize: 26, fontWeight: '800', color: '#0f172a', marginTop: 2 }}>₹{selectedRecord.entryFee}</Text>
            </View>

            <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 0.5 }}>Select Payment Collection Mode</Text>

            <View style={{ gap: 10, marginBottom: 20 }}>
              <TouchableOpacity
                onPress={() => handleSettlePayment(selectedRecord, 'CASH')}
                disabled={settling}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', borderWidth: 1.5, borderColor: '#22c55e', padding: 14, borderRadius: 12 }}
              >
                <Banknote size={20} color="#166534" style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#166534' }}>Collect Cash</Text>
                  <Text style={{ fontSize: 11, color: '#15803d' }}>Received ₹{selectedRecord.entryFee} in cash</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSettlePayment(selectedRecord, 'UPI')}
                disabled={settling}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', borderWidth: 1.5, borderColor: '#3b82f6', padding: 14, borderRadius: 12 }}
              >
                <CreditCard size={20} color="#1d4ed8" style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#1d4ed8' }}>Collect UPI / Online</Text>
                  <Text style={{ fontSize: 11, color: '#2563eb' }}>Received ₹{selectedRecord.entryFee} via UPI QR</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSettlePayment(selectedRecord, 'WAIVED')}
                disabled={settling}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#faf5ff', borderWidth: 1, borderColor: '#c084fc', padding: 14, borderRadius: 12 }}
              >
                <CheckCircle2 size={20} color="#7e22ce" style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#7e22ce' }}>Waive Fee (Complimentary)</Text>
                  <Text style={{ fontSize: 11, color: '#9333ea' }}>Mark as complimentary entry</Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setSelectedRecord(null)}
              style={{ backgroundColor: '#f1f5f9', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
