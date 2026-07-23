import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useUpcomingMeetings } from '../../src/modules/meetings/useMeetings';
import { useMembers } from '../../src/modules/members/useMembers';
import { Card } from '../../src/components/ui/Card';
import {
  Calendar, MapPin, Users, ChevronRight, Clock,
  DollarSign, AlertCircle, CheckCircle2, MessageSquare,
  FileText, Activity, Search, LayoutDashboard, TrendingUp
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { formatDate } from '../../src/utils/date';
import { BRAND_COLORS } from '../../src/theme/colors';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../src/services/firebase';
import { useAuthStore } from '../../src/store/authStore';

export default function StaffDashboard() {
  const { meetings, loading } = useUpcomingMeetings();
  const { members } = useMembers();
  const { user } = useAuthStore();
  const router = useRouter();

  const todaysMeeting = meetings[0];

  const [recentCheckIns, setRecentCheckIns] = useState<any[]>([]);
  const [liveAttendanceCount, setLiveAttendanceCount] = useState<number>(0);
  const [liveCollectedAmount, setLiveCollectedAmount] = useState<number>(0);
  const [livePendingCount, setLivePendingCount] = useState<number>(0);

  useEffect(() => {
    if (!todaysMeeting?.id) return;

    // Listen to live attendance collection for real-time feed & metrics
    const attendanceRef = collection(db, `meetings/${todaysMeeting.id}/attendance`);
    
    const unsub = onSnapshot(attendanceRef, (snap) => {
      let count = 0;
      let totalMoney = 0;
      let pendingDues = 0;
      const list: any[] = [];

      snap.forEach((d) => {
        const data = d.data();
        if (data.paymentStatus !== 'ABSENT') {
          count++;
        }
        if (data.paymentStatus === 'PAID') {
          totalMoney += Number(data.amountPaid || todaysMeeting.entryFee || 1040);
        } else if (data.paymentStatus === 'PENDING') {
          pendingDues++;
        }
        list.push({
          id: d.id,
          memberFullName: data.memberFullName || 'CEDOI Member',
          paymentStatus: data.paymentStatus || 'PENDING',
          updatedAt: data.updatedAt || new Date().toISOString(),
          amountPaid: data.amountPaid || todaysMeeting.entryFee || 1040,
        });
      });

      // Sort by latest checkins
      list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      setLiveAttendanceCount(count);
      setLiveCollectedAmount(totalMoney);
      setLivePendingCount(pendingDues);
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

  const checkedInCount = liveAttendanceCount || todaysMeeting?.metrics?.totalAttendees || 0;
  const collectedTotal = liveCollectedAmount || todaysMeeting?.metrics?.totalCollected || 0;
  const totalRosterCount = members.length || 40;
  const attendancePercentage = totalRosterCount > 0 ? Math.round((checkedInCount / totalRosterCount) * 100) : 0;

  return (
    <ScrollView style={{ backgroundColor: BRAND_COLORS.canvasBg }} className="flex-1">
      {/* Top Greeting Header */}
      <View className="px-4 sm:px-6 pt-6 pb-3 flex-row items-center justify-between">
        <View>
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-wide">Operator Portal</Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: BRAND_COLORS.primary, letterSpacing: -0.5 }} className="mt-0.5">
            Staff Dashboard 👋
          </Text>
        </View>
        <View style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderWidth: 1 }} className="px-3 py-1.5 rounded-full flex-row items-center">
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981', marginRight: 6 }} />
          <Text style={{ color: '#15803d', fontSize: 11, fontWeight: '800' }}>Active</Text>
        </View>
      </View>

      {todaysMeeting ? (
        <View className="px-4 sm:px-6 gap-4 pb-12">
          {/* Main Hero Meeting Card */}
          <View style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: BRAND_COLORS.border }} className="shadow-2xs overflow-hidden">
            {/* Top Status Banner */}
            <View style={{ backgroundColor: BRAND_COLORS.primary, paddingVertical: 10, paddingHorizontal: 16 }} className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: todaysMeeting.status === 'ONGOING' ? '#10b981' : BRAND_COLORS.secondary, marginRight: 8 }} />
                <Text style={{ color: 'white', fontWeight: '800', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>
                  {todaysMeeting.status === 'ONGOING' ? 'In Progress' : todaysMeeting.status}
                </Text>
              </View>
              <Text className="text-white/80 text-xs font-bold">{formatDate(todaysMeeting.date)}</Text>
            </View>

            <View className="p-4 sm:p-5">
              <Text style={{ fontSize: 20, fontWeight: '800', color: BRAND_COLORS.textHeading, lineHeight: 26 }} className="mb-3">
                {todaysMeeting.title}
              </Text>

              {/* Meeting Info Grid */}
              <View className="gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4">
                <View className="flex-row items-center">
                  <Clock size={15} color={BRAND_COLORS.primary} style={{ marginRight: 8 }} />
                  <Text className="text-xs font-semibold text-slate-700">{todaysMeeting.startTime} – {todaysMeeting.endTime}</Text>
                </View>
                <View className="flex-row items-center">
                  <MapPin size={15} color={BRAND_COLORS.primary} style={{ marginRight: 8 }} />
                  <Text numberOfLines={1} className="text-xs font-semibold text-slate-700 flex-1 truncate">{todaysMeeting.venue}</Text>
                </View>
              </View>

              {/* 4-Stat Metric Grid */}
              <View className="flex-row flex-wrap gap-2.5">
                {/* Stat 1: Checked In */}
                <View style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1 }} className="flex-1 min-w-[130px] p-3 rounded-xl">
                  <View className="flex-row items-center justify-between">
                    <Text style={{ color: '#1d4ed8' }} className="text-[11px] font-extrabold uppercase">Checked In</Text>
                    <Users size={14} color="#1d4ed8" />
                  </View>
                  <Text style={{ color: '#1e40af' }} className="text-2xl font-black mt-1">
                    {checkedInCount}
                  </Text>
                  <Text style={{ color: '#3b82f6' }} className="text-[10px] font-bold mt-0.5">of {totalRosterCount} members</Text>
                </View>

                {/* Stat 2: Total Collected */}
                <View style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderWidth: 1 }} className="flex-1 min-w-[130px] p-3 rounded-xl">
                  <View className="flex-row items-center justify-between">
                    <Text style={{ color: '#15803d' }} className="text-[11px] font-extrabold uppercase">Collected</Text>
                    <DollarSign size={14} color="#15803d" />
                  </View>
                  <Text style={{ color: '#166534' }} className="text-2xl font-black mt-1">
                    ₹{collectedTotal.toLocaleString('en-IN')}
                  </Text>
                  <Text style={{ color: '#22c55e' }} className="text-[10px] font-bold mt-0.5">Fees Received</Text>
                </View>

                {/* Stat 3: Pending Dues */}
                <View style={{ backgroundColor: '#fff1f2', borderColor: '#fecdd3', borderWidth: 1 }} className="flex-1 min-w-[130px] p-3 rounded-xl">
                  <View className="flex-row items-center justify-between">
                    <Text style={{ color: '#be123c' }} className="text-[11px] font-extrabold uppercase">Pending Dues</Text>
                    <AlertCircle size={14} color="#be123c" />
                  </View>
                  <Text style={{ color: '#9f1239' }} className="text-2xl font-black mt-1">
                    {livePendingCount}
                  </Text>
                  <Text style={{ color: '#f43f5e' }} className="text-[10px] font-bold mt-0.5">Unpaid Attendees</Text>
                </View>

                {/* Stat 4: Turnout Rate */}
                <View style={{ backgroundColor: '#faf5ff', borderColor: '#e9d5ff', borderWidth: 1 }} className="flex-1 min-w-[130px] p-3 rounded-xl">
                  <View className="flex-row items-center justify-between">
                    <Text style={{ color: '#6b21a8' }} className="text-[11px] font-extrabold uppercase">Turnout</Text>
                    <TrendingUp size={14} color="#6b21a8" />
                  </View>
                  <Text style={{ color: '#581c87' }} className="text-2xl font-black mt-1">
                    {attendancePercentage}%
                  </Text>
                  <Text style={{ color: '#a855f7' }} className="text-[10px] font-bold mt-0.5">Attendance Rate</Text>
                </View>
              </View>
            </View>

            {/* Primary Action Button: Start Check-in */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={{ margin: 16, marginTop: 0, backgroundColor: BRAND_COLORS.primary, borderRadius: 12, height: 48 }}
              className="flex-row items-center justify-center px-4 shadow-sm"
              onPress={() => router.push({
                pathname: '/(staff)/check-in',
                params: { meetingId: todaysMeeting.id }
              })}
            >
              <Users size={18} color="white" style={{ marginRight: 8 }} />
              <Text className="color-white font-extrabold text-sm">Start Member Check-in</Text>
              <ChevronRight size={18} color="rgba(255,255,255,0.7)" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          </View>

          {/* Quick Workflow Action Bar */}
          <View className="gap-2">
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wide px-1">Quick Actions</Text>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/(staff)/check-in', params: { meetingId: todaysMeeting.id } })}
                activeOpacity={0.8}
                style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 1 }}
                className="flex-1 p-3 rounded-xl flex-row items-center justify-between shadow-2xs"
              >
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-lg bg-blue-50 items-center justify-center mr-2.5">
                    <Search size={16} color="#2563eb" />
                  </View>
                  <Text className="text-xs font-bold text-slate-800">Find Member</Text>
                </View>
                <ChevronRight size={14} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/(staff)/reports')}
                activeOpacity={0.8}
                style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 1 }}
                className="flex-1 p-3 rounded-xl flex-row items-center justify-between shadow-2xs"
              >
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-lg bg-emerald-50 items-center justify-center mr-2.5">
                    <FileText size={16} color="#16a34a" />
                  </View>
                  <Text className="text-xs font-bold text-slate-800">Meeting Report</Text>
                </View>
                <ChevronRight size={14} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Live Check-in Stream Feed */}
          <View style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 1 }} className="rounded-2xl p-4 shadow-2xs gap-3">
            <View className="flex-row items-center justify-between pb-2 border-b border-slate-100">
              <View className="flex-row items-center">
                <Activity size={16} color={BRAND_COLORS.primary} style={{ marginRight: 6 }} />
                <Text className="text-sm font-extrabold text-slate-900">Live Attendance Feed</Text>
              </View>
              <Text className="text-[11px] font-bold text-slate-400">{recentCheckIns.length} recent</Text>
            </View>

            {recentCheckIns.length > 0 ? (
              <View className="gap-2">
                {recentCheckIns.map((record) => {
                  const isPaid = record.paymentStatus === 'PAID';
                  return (
                    <View key={record.id} className="flex-row items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <View className="flex-row items-center flex-1 min-w-0 mr-2">
                        <View style={{ backgroundColor: isPaid ? '#f0fdf4' : '#fff1f2', width: 32, height: 32, borderRadius: 16 }} className="items-center justify-center mr-2 shrink-0">
                          <Text style={{ color: isPaid ? '#166534' : '#be123c', fontWeight: '900', fontSize: 13 }}>
                            {record.memberFullName?.charAt(0) || 'M'}
                          </Text>
                        </View>
                        <View className="flex-1 min-w-0">
                          <Text numberOfLines={1} className="text-xs font-bold text-slate-900 truncate">
                            {record.memberFullName}
                          </Text>
                          <Text className="text-[10px] font-medium text-slate-500 mt-0.5">
                            {new Date(record.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      </View>

                      <View className="items-end shrink-0">
                        {isPaid ? (
                          <View className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex-row items-center">
                            <CheckCircle2 size={10} color="#16a34a" style={{ marginRight: 3 }} />
                            <Text className="text-[10px] font-extrabold text-emerald-800">Paid ₹{record.amountPaid}</Text>
                          </View>
                        ) : (
                          <View className="bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md flex-row items-center">
                            <AlertCircle size={10} color="#be123c" style={{ marginRight: 3 }} />
                            <Text className="text-[10px] font-extrabold text-rose-800">Pending Dues</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View className="items-center justify-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Users size={28} color="#94a3b8" />
                <Text className="text-xs font-bold text-slate-600 mt-2">No check-ins recorded yet today</Text>
                <Text className="text-[11px] font-medium text-slate-400 mt-0.5">Tap 'Start Member Check-in' to begin tracking</Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        <View className="px-6 pt-4">
          <Card className="items-center py-16 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <Calendar size={48} color="#94a3b8" />
            <Text className="text-slate-700 mt-4 text-center font-bold text-base">No meetings scheduled for today</Text>
            <Text className="text-slate-400 mt-1 text-center text-xs">Check back later or contact your admin team.</Text>
          </Card>
        </View>
      )}
    </ScrollView>
  );
}
