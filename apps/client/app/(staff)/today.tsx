import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { useUpcomingMeetings } from '../../src/modules/meetings/useMeetings';
import { useMembers } from '../../src/modules/members/useMembers';
import { Card } from '../../src/components/ui/Card';
import { Calendar, MapPin, Users, ChevronRight, Clock, Lock, CheckCircle2, Banknote } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { formatDate } from '../../src/utils/date';
import { BRAND_COLORS } from '../../src/theme/colors';
import { collection, onSnapshot, doc, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../../src/services/firebase';

export default function StaffToday() {
  const { meetings, loading } = useUpcomingMeetings();
  const { members } = useMembers();
  const router = useRouter();

  const todaysMeeting = meetings[0];

  const [liveAttendanceCount, setLiveAttendanceCount] = useState<number>(0);
  const [liveCollectedAmount, setLiveCollectedAmount] = useState<number>(0);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!todaysMeeting?.id) return;

    const attendanceRef = collection(db, `meetings/${todaysMeeting.id}/attendance`);
    const unsub = onSnapshot(attendanceRef, (snap) => {
      let count = 0;
      let totalMoney = 0;

      snap.forEach((d) => {
        const data = d.data();
        if (data.paymentStatus !== 'ABSENT') {
          count++;
        }
        if (data.paymentStatus === 'PAID') {
          totalMoney += Number(data.amountPaid || todaysMeeting.entryFee || 1040);
        }
      });

      setLiveAttendanceCount(count);
      setLiveCollectedAmount(totalMoney);
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

  const totalRosterCount = members.length || 40;
  const checkedInCount = liveAttendanceCount || todaysMeeting?.metrics?.totalAttendees || 0;
  const collectedTotal = liveCollectedAmount || todaysMeeting?.metrics?.totalCollected || 0;
  const unmarkedCount = Math.max(0, totalRosterCount - checkedInCount);
  const isMeetingCompleted = todaysMeeting?.status === 'COMPLETED';

  // Helper to check if meeting end time has passed
  const isEndTimePassed = () => {
    if (!todaysMeeting?.endTime) return false;
    try {
      const now = new Date();
      const endTimeStr = todaysMeeting.endTime; // e.g. "05:00 PM" or "17:00"
      let [timePart, modifier] = endTimeStr.split(' ');
      let [hoursStr, minutesStr] = timePart.split(':');
      let hours = parseInt(hoursStr, 10);
      let minutes = parseInt(minutesStr, 10) || 0;

      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;

      const endDateTime = new Date();
      endDateTime.setHours(hours, minutes, 0, 0);

      return now.getTime() >= endDateTime.getTime();
    } catch (e) {
      return false;
    }
  };

  const hasEnded = isEndTimePassed();

  const handleCloseMeetingAutoAbsent = async () => {
    if (!todaysMeeting?.id || closing || isMeetingCompleted || !hasEnded) return;

    const confirmed = Platform.OS === 'web'
      ? window.confirm(`Close "${todaysMeeting.title}"?\n\nMeeting end time (${todaysMeeting.endTime}) has passed.\nThis will mark remaining ${unmarkedCount} un-checked members as ABSENT (logged in Dues) and finalize the meeting.`)
      : true;

    if (!confirmed) return;

    setClosing(true);
    try {
      // 1. Fetch current attendance snapshot to find members without records
      const attendanceRef = collection(db, `meetings/${todaysMeeting.id}/attendance`);
      const attSnap = await getDocs(attendanceRef);
      const checkedMemberIds = new Set<string>();
      attSnap.forEach(d => checkedMemberIds.add(d.id));

      // 2. Batch write records for un-checked members
      const batch = writeBatch(db);
      members.forEach(member => {
        if (!checkedMemberIds.has(member.id)) {
          const docRef = doc(db, `meetings/${todaysMeeting.id}/attendance`, member.id);
          batch.set(docRef, {
            memberId: member.id,
            memberName: member.fullName,
            memberSnapshot: {
              fullName: member.fullName,
              companyName: member.companyName || '',
              mobileNumber: member.mobileNumber || '',
              businessCategory: member.businessCategory || '',
            },
            paymentStatus: 'PENDING',
            attendanceStatus: 'ABSENT',
            entryFee: todaysMeeting.entryFee || 1040,
            amountCollected: 0,
            meetingTitle: todaysMeeting.title,
            meetingDate: todaysMeeting.date,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      });

      // 3. Mark meeting status as COMPLETED
      const meetingRef = doc(db, 'meetings', todaysMeeting.id);
      batch.update(meetingRef, {
        status: 'COMPLETED',
        updatedAt: serverTimestamp(),
      });

      await batch.commit();

      if (Platform.OS === 'web') {
        alert(`Meeting successfully closed! ${unmarkedCount} members marked Absent and logged in Dues.`);
      }
    } catch (err: any) {
      console.error('Error closing meeting:', err);
      if (Platform.OS === 'web') {
        alert('Failed to close meeting: ' + err.message);
      }
    } finally {
      setClosing(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: BRAND_COLORS.canvasBg }} className="flex-1">
      {/* Header */}
      <View className="px-6 pt-8 pb-4">
        <Text style={{ fontSize: 26, fontWeight: '800', color: BRAND_COLORS.primary, letterSpacing: -0.5 }}>Today's Meeting</Text>
        <Text className="text-slate-500 text-sm mt-1 font-medium">{formatDate(new Date())}</Text>
      </View>

      {todaysMeeting ? (
        <View className="px-6">
          {/* Meeting Card with Official CEDOI Brand Palette */}
          <View style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: BRAND_COLORS.border, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 3, overflow: 'hidden', marginBottom: 20 }}>
            {/* Status Banner */}
            <View style={{ backgroundColor: isMeetingCompleted ? '#334155' : BRAND_COLORS.primary, paddingVertical: 12, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isMeetingCompleted ? '#94a3b8' : (todaysMeeting.status === 'ONGOING' ? '#10b981' : BRAND_COLORS.secondary), marginRight: 10 }} />
              <Text style={{ color: 'white', fontWeight: '800', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                {isMeetingCompleted ? 'Completed' : (todaysMeeting.status === 'ONGOING' ? 'In Progress' : todaysMeeting.status)}
              </Text>
            </View>

            <View style={{ padding: 24 }}>
              <Text style={{ fontSize: 24, fontWeight: '800', color: BRAND_COLORS.textHeading, marginBottom: 16, lineHeight: 30 }}>
                {todaysMeeting.title}
              </Text>

              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: BRAND_COLORS.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
                    <Calendar size={18} color={BRAND_COLORS.primary} />
                  </View>
                  <View>
                    <Text style={{ color: BRAND_COLORS.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Date</Text>
                    <Text style={{ color: BRAND_COLORS.textHeading, fontSize: 14, fontWeight: '600', marginTop: 1 }}>{formatDate(todaysMeeting.date)}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: BRAND_COLORS.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
                    <Clock size={18} color={BRAND_COLORS.primary} />
                  </View>
                  <View>
                    <Text style={{ color: BRAND_COLORS.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Time</Text>
                    <Text style={{ color: BRAND_COLORS.textHeading, fontSize: 14, fontWeight: '600', marginTop: 1 }}>{todaysMeeting.startTime} – {todaysMeeting.endTime}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: BRAND_COLORS.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
                    <MapPin size={18} color={BRAND_COLORS.primary} />
                  </View>
                  <View>
                    <Text style={{ color: BRAND_COLORS.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Venue</Text>
                    <Text style={{ color: BRAND_COLORS.textHeading, fontSize: 14, fontWeight: '600', marginTop: 1 }}>{todaysMeeting.venue}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center', marginRight: 14, borderWidth: 1, borderColor: '#bbf7d0' }}>
                    <Banknote size={18} color="#16a34a" />
                  </View>
                  <View>
                    <Text style={{ color: BRAND_COLORS.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Meeting Fee</Text>
                    <Text style={{ color: '#166534', fontSize: 14, fontWeight: '800', marginTop: 1 }}>₹{todaysMeeting.entryFee || 1040} per member</Text>
                  </View>
                </View>
              </View>

              {/* Stats Row */}
              <View style={{ flexDirection: 'row', marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderColor: BRAND_COLORS.border, gap: 12 }}>
                <View style={{ flex: 1, backgroundColor: BRAND_COLORS.primaryLight, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: BRAND_COLORS.primaryBorder }}>
                  <Text style={{ fontSize: 28, fontWeight: '800', color: BRAND_COLORS.primary }}>{checkedInCount}</Text>
                  <Text style={{ fontSize: 11, color: BRAND_COLORS.primary, fontWeight: '700', marginTop: 2 }}>Checked In</Text>
                </View>

                <View style={{ flex: 1, backgroundColor: BRAND_COLORS.accentLight, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: BRAND_COLORS.accentBorder }}>
                  <Text style={{ fontSize: 28, fontWeight: '800', color: BRAND_COLORS.accentText }}>₹{collectedTotal.toLocaleString('en-IN')}</Text>
                  <Text style={{ fontSize: 11, color: BRAND_COLORS.accentText, fontWeight: '700', marginTop: 2 }}>Collected</Text>
                </View>
              </View>
            </View>

            {/* Check-in CTA Button (Brand Deep Ocean Blue #0d5984) */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={{ margin: 20, marginTop: 0, backgroundColor: BRAND_COLORS.primary, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
              onPress={() => router.push({
                pathname: '/(staff)/check-in',
                params: { meetingId: todaysMeeting.id }
              })}
            >
              <Users size={20} color="white" />
              <Text style={{ color: 'white', fontWeight: '800', fontSize: 15, marginLeft: 10 }}>Start Member Check-in</Text>
              <ChevronRight size={18} color="rgba(255,255,255,0.7)" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            {/* Time-Locked Close Meeting Button */}
            {isMeetingCompleted ? (
              <View style={{ margin: 20, marginTop: 0, backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderWidth: 1, borderRadius: 14, padding: 14 }} className="flex-row items-center justify-center">
                <CheckCircle2 size={18} color="#16a34a" style={{ marginRight: 8 }} />
                <Text style={{ color: '#166534', fontWeight: '800', fontSize: 14 }}>
                  Meeting Completed & Attendance Finalized
                </Text>
              </View>
            ) : hasEnded ? (
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={closing}
                onPress={handleCloseMeetingAutoAbsent}
                style={{ margin: 20, marginTop: 0, backgroundColor: '#fff1f2', borderColor: '#fecdd3', borderWidth: 1.5, borderRadius: 14, padding: 14 }}
                className="flex-row items-center justify-center"
              >
                {closing ? (
                  <ActivityIndicator size="small" color="#be123c" />
                ) : (
                  <>
                    <Lock size={18} color="#be123c" style={{ marginRight: 8 }} />
                    <Text style={{ color: '#be123c', fontWeight: '800', fontSize: 14 }}>
                      Close Meeting & Auto-Mark Remaining ({unmarkedCount}) as Absent
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={{ margin: 20, marginTop: 0, backgroundColor: '#f8fafc', borderColor: '#cbd5e1', borderWidth: 1, borderRadius: 14, padding: 14 }} className="flex-row items-center justify-center">
                <Lock size={16} color="#64748b" style={{ marginRight: 8 }} />
                <Text style={{ color: '#64748b', fontWeight: '700', fontSize: 13 }}>
                  Close Meeting (Unlocks after {todaysMeeting.endTime})
                </Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        <View className="px-6">
          <Card className="items-center py-16 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <Calendar size={52} color="#e2e8f0" />
            <Text className="text-slate-400 mt-5 text-center font-semibold text-base">No meetings scheduled for today.</Text>
            <Text className="text-slate-300 mt-2 text-center text-sm">Check back later or contact your admin.</Text>
          </Card>
        </View>
      )}
    </ScrollView>
  );
}
