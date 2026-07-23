import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useUpcomingMeetings } from '../../src/modules/meetings/useMeetings';
import { useMembers } from '../../src/modules/members/useMembers';
import { Card } from '../../src/components/ui/Card';
import {
  Calendar, MapPin, Users, ChevronRight, Clock,
  DollarSign, AlertCircle, CheckCircle2, MessageSquare,
  FileText, Activity, Search, LayoutDashboard, TrendingUp,
  CreditCard, UserCheck, ShieldCheck, ArrowRight, Sparkles
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { formatDate, formatTime12h } from '../../src/utils/date';
import { BRAND_COLORS } from '../../src/theme/colors';
import { collection, onSnapshot, getDocs, collectionGroup, query } from 'firebase/firestore';
import { db } from '../../src/services/firebase';
import { useAuthStore } from '../../src/store/authStore';

export default function StaffDashboard() {
  const { meetings, loading } = useUpcomingMeetings();
  const { members } = useMembers();
  const { user } = useAuthStore();
  const router = useRouter();

  const todaysMeeting = meetings[0];

  const [recentCheckIns, setRecentCheckIns] = useState<any[]>([]);
  const [overallCollected, setOverallCollected] = useState<number>(0);
  const [overallPending, setOverallPending] = useState<number>(0);
  const [overallTurnoutRate, setOverallTurnoutRate] = useState<number>(0);

  // Fetch overall chapter metrics across ALL meetings and members
  useEffect(() => {
    const fetchOverallMetrics = async () => {
      try {
        const meetingsSnap = await getDocs(query(collectionGroup(db, 'meetings')));
        const meetingsList = meetingsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const totalMeetingsCount = meetingsList.length || 1;

        const attSnap = await getDocs(query(collectionGroup(db, 'attendance')));
        let totalCollected = 0;
        let totalPending = 0;
        let totalPaidDocs = 0;

        const meetingsMap: Record<string, any> = {};
        meetingsSnap.forEach(d => { meetingsMap[d.id] = d.data(); });

        attSnap.docs.forEach(d => {
          const data = d.data();
          const meetingId = d.ref.parent?.parent?.id || '';
          const fee = meetingsMap[meetingId]?.entryFee || data.entryFee || 1040;

          if (data.paymentStatus === 'PAID') {
            totalCollected += Number(data.amountPaid || fee);
            totalPaidDocs++;
          } else if (data.paymentStatus === 'PENDING' || data.paymentStatus === 'ABSENT') {
            totalPending += Number(fee);
          }
        });

        // Also add pending fees for members who missed meetings without an attendance doc
        members.forEach(m => {
          meetingsList.forEach(mtg => {
            const hasDoc = attSnap.docs.some(d => {
              const meetingId = d.ref.parent?.parent?.id;
              const data = d.data();
              return meetingId === mtg.id && (data.memberId === m.id || d.id === m.id);
            });
            if (!hasDoc) {
              const fee = (mtg as any).entryFee || 1040;
              totalPending += Number(fee);
            }
          });
        });

        const totalRoster = members.length || 1;
        const possibleTotalAttendances = totalMeetingsCount * totalRoster;
        const turnoutRate = possibleTotalAttendances > 0 
          ? Math.min(100, Math.round((totalPaidDocs / possibleTotalAttendances) * 100))
          : 85;

        setOverallCollected(totalCollected);
        setOverallPending(totalPending);
        setOverallTurnoutRate(turnoutRate || 85);
      } catch (err) {
        console.log('Error fetching overall staff metrics:', err);
      }
    };

    fetchOverallMetrics();
  }, [members]);

  // Listen to live attendance feed for today's meeting
  useEffect(() => {
    if (!todaysMeeting?.id) return;

    const attendanceRef = collection(db, `meetings/${todaysMeeting.id}/attendance`);
    
    const unsub = onSnapshot(attendanceRef, (snap) => {
      const list: any[] = [];
      snap.forEach((d) => {
        const data = d.data();
        const memberObj = members.find(m => m.id === d.id || m.id === data.memberId);
        const resolvedName = memberObj?.fullName || data.memberSnapshot?.fullName || data.memberFullName || data.memberName || 'CEDOI Member';
        const resolvedCompany = memberObj?.companyName || data.memberSnapshot?.companyName || data.companyName || 'Member';

        list.push({
          id: d.id,
          memberFullName: resolvedName,
          companyName: resolvedCompany,
          paymentStatus: data.paymentStatus || 'PENDING',
          updatedAt: data.updatedAt ? new Date(data.updatedAt.toDate ? data.updatedAt.toDate() : data.updatedAt).toISOString() : new Date().toISOString(),
          amountPaid: data.amountPaid || todaysMeeting.entryFee || 1040,
        });
      });

      list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setRecentCheckIns(list.slice(0, 5));
    }, (err) => {
      console.log('Attendance listener error:', err);
    });

    return () => unsub();
  }, [todaysMeeting?.id]);

  if (loading) {
    return (
      <View style={{ backgroundColor: BRAND_COLORS.canvasBg }} className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
      </View>
    );
  }

  const totalRosterCount = members.length || 6;

  return (
    <ScrollView style={{ backgroundColor: BRAND_COLORS.canvasBg }} className="flex-1">
      <View className="px-4 sm:px-6 pt-6 pb-12 gap-5">
        {/* Executive Hero Command Header Banner */}
        <View style={{ backgroundColor: '#031b4e', borderRadius: 20 }} className="p-5 sm:p-6 shadow-md overflow-hidden relative">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="w-2.5 h-2.5 rounded-full bg-emerald-400 mr-2" />
              <Text className="text-xs font-black text-emerald-400 uppercase tracking-widest">Executive Portal</Text>
            </View>
            <View className="bg-white/10 px-3 py-1 rounded-full border border-white/20">
              <Text className="text-white/90 text-xs font-bold">{formatDate(new Date())}</Text>
            </View>
          </View>

          <Text style={{ fontSize: 24, fontWeight: '900' }} className="text-white mt-3">
            Welcome back, {user?.name === 'Staff Operator' ? 'Operator' : (user?.name?.split(' ')[0] || 'Operator')} 👋
          </Text>
          <Text className="text-slate-300 text-xs sm:text-sm font-medium mt-1">
            Real-time Attendance & Collections Overview
          </Text>
        </View>

        {/* Top-Level Overall Chapter Metrics Grid */}
        <View>
          <Text className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2.5 px-1">
            Overall Chapter Metrics
          </Text>
          <View className="flex-row flex-wrap gap-2.5">
            {/* Metric 1: Total Chapter Roster */}
            <View style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 1 }} className="flex-1 min-w-[140px] p-3.5 rounded-2xl shadow-2xs">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[11px] font-black text-blue-700 uppercase tracking-tight">Active Members</Text>
                <View className="w-7 h-7 rounded-lg bg-blue-50 items-center justify-center">
                  <Users size={15} color="#2563eb" />
                </View>
              </View>
              <Text className="text-2xl font-black text-slate-900">{totalRosterCount}</Text>
              <Text className="text-[10px] font-bold text-slate-500 mt-1">Total Chapter Roster</Text>
            </View>

            {/* Metric 2: Overall Collections */}
            <View style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 1 }} className="flex-1 min-w-[140px] p-3.5 rounded-2xl shadow-2xs">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[11px] font-black text-emerald-700 uppercase tracking-tight">Total Collected</Text>
                <View className="w-7 h-7 rounded-lg bg-emerald-50 items-center justify-center">
                  <DollarSign size={15} color="#16a34a" />
                </View>
              </View>
              <Text className="text-2xl font-black text-slate-900">₹{overallCollected.toLocaleString('en-IN')}</Text>
              <Text className="text-[10px] font-bold text-slate-500 mt-1">Total Fees Received</Text>
            </View>

            {/* Metric 3: Overall Pending Dues */}
            <View style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 1 }} className="flex-1 min-w-[140px] p-3.5 rounded-2xl shadow-2xs">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[11px] font-black text-rose-700 uppercase tracking-tight">Pending Dues</Text>
                <View className="w-7 h-7 rounded-lg bg-rose-50 items-center justify-center">
                  <AlertCircle size={15} color="#be123c" />
                </View>
              </View>
              <Text className="text-2xl font-black text-slate-900">₹{overallPending.toLocaleString('en-IN')}</Text>
              <Text className="text-[10px] font-bold text-slate-500 mt-1">Uncollected Member Dues</Text>
            </View>

            {/* Metric 4: Overall Turnout */}
            <View style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 1 }} className="flex-1 min-w-[140px] p-3.5 rounded-2xl shadow-2xs">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[11px] font-black text-purple-700 uppercase tracking-tight">Chapter Turnout</Text>
                <View className="w-7 h-7 rounded-lg bg-purple-50 items-center justify-center">
                  <TrendingUp size={15} color="#9333ea" />
                </View>
              </View>
              <Text className="text-2xl font-black text-slate-900">{overallTurnoutRate}%</Text>
              <Text className="text-[10px] font-bold text-slate-500 mt-1">Avg Attendance Rate</Text>
            </View>
          </View>
        </View>

        {/* Active Meeting Quick Action Bar (Compact Strip) */}
        {todaysMeeting && (
          <View style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 1 }} className="p-4 rounded-2xl shadow-2xs flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <View className="flex-row items-center flex-1 min-w-0">
              <View className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 items-center justify-center mr-3 shrink-0">
                <Calendar size={20} color="#2563eb" />
              </View>
              <View className="flex-1 min-w-0">
                <View className="flex-row items-center gap-2">
                  <Text numberOfLines={1} className="text-sm font-extrabold text-slate-900 truncate">
                    {todaysMeeting.title}
                  </Text>
                  <View style={{ backgroundColor: todaysMeeting.status === 'ONGOING' ? '#f0fdf4' : '#eff6ff' }} className="px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                    <Text style={{ color: todaysMeeting.status === 'ONGOING' ? '#166534' : '#1d4ed8' }} className="text-[10px] font-extrabold uppercase">
                      {todaysMeeting.status}
                    </Text>
                  </View>
                </View>
                <Text numberOfLines={1} className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                  {todaysMeeting.startTime} – {todaysMeeting.endTime} • {todaysMeeting.venue}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => router.push({ pathname: '/(staff)/check-in', params: { meetingId: todaysMeeting.id } })}
              activeOpacity={0.85}
              style={{ backgroundColor: '#0d5984' }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl flex-row items-center justify-center shadow-xs shrink-0"
            >
              <Users size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text className="text-xs font-extrabold text-white">Start Check-in</Text>
              <ArrowRight size={14} color="#ffffff" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        )}

        {/* 4 Interactive Staff Workflow Action Tiles (2x2 Grid) */}
        <View className="gap-2.5">
          <Text className="text-xs font-extrabold text-slate-500 uppercase tracking-wider px-1">
            Quick Workflow Tools
          </Text>

          <View className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Tile 1: Check-in */}
            <TouchableOpacity
              onPress={() => todaysMeeting && router.push({ pathname: '/(staff)/check-in', params: { meetingId: todaysMeeting.id } })}
              activeOpacity={0.85}
              style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 1 }}
              className="p-4 rounded-2xl shadow-2xs flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1 min-w-0 mr-2">
                <View className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 items-center justify-center mr-3 shrink-0">
                  <UserCheck size={22} color="#2563eb" />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-extrabold text-slate-900">Member Check-In</Text>
                  <Text className="text-xs text-slate-500 font-medium mt-0.5">Search members and record live meeting attendance</Text>
                </View>
              </View>
              <ChevronRight size={18} color="#94a3b8" />
            </TouchableOpacity>

            {/* Tile 2: Dues & Receipts */}
            <TouchableOpacity
              onPress={() => router.push('/(staff)/reports')}
              activeOpacity={0.85}
              style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 1 }}
              className="p-4 rounded-2xl shadow-2xs flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1 min-w-0 mr-2">
                <View className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 items-center justify-center mr-3 shrink-0">
                  <CreditCard size={22} color="#16a34a" />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-extrabold text-slate-900">Collections & Reports</Text>
                  <Text className="text-xs text-slate-500 font-medium mt-0.5">Track entry fees received, UPI/Cash logs & export PDF/CSV</Text>
                </View>
              </View>
              <ChevronRight size={18} color="#94a3b8" />
            </TouchableOpacity>

            {/* Tile 3: Meeting Schedule */}
            <TouchableOpacity
              onPress={() => router.push('/(staff)/today')}
              activeOpacity={0.85}
              style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 1 }}
              className="p-4 rounded-2xl shadow-2xs flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1 min-w-0 mr-2">
                <View className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-100 items-center justify-center mr-3 shrink-0">
                  <Clock size={22} color="#9333ea" />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-extrabold text-slate-900">Today's Meeting Detail</Text>
                  <Text className="text-xs text-slate-500 font-medium mt-0.5">View venue, date, time schedule & time-locked auto close</Text>
                </View>
              </View>
              <ChevronRight size={18} color="#94a3b8" />
            </TouchableOpacity>

            {/* Tile 4: Attendance History */}
            <TouchableOpacity
              onPress={() => router.push('/(staff)/history')}
              activeOpacity={0.85}
              style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 1 }}
              className="p-4 rounded-2xl shadow-2xs flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1 min-w-0 mr-2">
                <View className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-100 items-center justify-center mr-3 shrink-0">
                  <FileText size={22} color="#ea580c" />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-extrabold text-slate-900">Attendance History</Text>
                  <Text className="text-xs text-slate-500 font-medium mt-0.5">Browse past meeting rosters, member logs & audit records</Text>
                </View>
              </View>
              <ChevronRight size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Live Attendance Stream Feed */}
        <View style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 1 }} className="rounded-2xl p-4 sm:p-5 shadow-2xs gap-3">
          <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <View className="flex-row items-center flex-1 min-w-0 mr-2">
              <Activity size={18} color={BRAND_COLORS.primary} style={{ marginRight: 8 }} />
              <Text numberOfLines={1} className="text-sm sm:text-base font-black text-slate-900 truncate">
                Live Attendance Feed
              </Text>
            </View>
            <View className="bg-slate-100 px-2.5 py-1 rounded-md shrink-0">
              <Text className="text-xs font-black text-slate-700">{recentCheckIns.length} Recent</Text>
            </View>
          </View>

          {recentCheckIns.length > 0 ? (
            <View className="gap-2.5">
              {recentCheckIns.map((record) => {
                const isPaid = record.paymentStatus === 'PAID';
                return (
                  <View key={record.id} className="flex-row items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <View className="flex-row items-center flex-1 min-w-0 mr-2">
                      <View style={{ backgroundColor: isPaid ? '#f0fdf4' : '#fff1f2', width: 40, height: 40, borderRadius: 20 }} className="items-center justify-center mr-3 shrink-0 border border-slate-200">
                        <Text style={{ color: isPaid ? '#166534' : '#be123c', fontWeight: '900', fontSize: 16 }}>
                          {record.memberFullName?.charAt(0) || 'M'}
                        </Text>
                      </View>
                      <View className="flex-1 min-w-0">
                        <Text numberOfLines={1} className="text-sm sm:text-base font-black text-slate-900 truncate">
                          {record.memberFullName}
                        </Text>
                        <Text className="text-xs font-bold text-slate-500 mt-0.5">
                          {record.companyName} • Checked in {formatTime12h(record.updatedAt)}
                        </Text>
                      </View>
                    </View>

                    <View className="items-end shrink-0">
                      {isPaid ? (
                        <View className="bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-lg flex-row items-center">
                          <CheckCircle2 size={14} color="#16a34a" style={{ marginRight: 5 }} />
                          <Text className="text-xs font-black text-emerald-800">Paid ₹{record.amountPaid}</Text>
                        </View>
                      ) : (
                        <View className="bg-rose-50 border border-rose-300 px-3 py-1 rounded-lg flex-row items-center">
                          <AlertCircle size={14} color="#be123c" style={{ marginRight: 5 }} />
                          <Text className="text-xs font-black text-rose-800">Pending Dues</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View className="items-center justify-center py-7 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <Users size={32} color="#64748b" />
              <Text className="text-sm sm:text-base font-black text-slate-800 mt-2.5 text-center">No check-ins recorded yet today</Text>
              <Text className="text-xs sm:text-sm font-semibold text-slate-600 mt-1 text-center">Tap 'Start Check-in' above to begin recording attendance</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
