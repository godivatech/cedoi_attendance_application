import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../src/services/firebase';
import { Member, PaymentMode, PaymentStatus } from '@cedoi/shared';
import { useAttendanceActions } from '../../src/modules/attendance/useAttendance';
import {
  UserCheck, UserX, Banknote, CreditCard, ShieldCheck, ChevronLeft, Clock, Phone, Briefcase
} from 'lucide-react-native';
import { showAlert } from '../../src/utils/platformAlert';

export default function MemberDetailScreen() {
  const { memberId, meetingId } = useLocalSearchParams<{ memberId: string; meetingId: string }>();
  const [member, setMember] = useState<Member | null>(null);
  const [meetingFee, setMeetingFee] = useState<number>(500);
  const [meetingTitle, setMeetingTitle] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'attendance' | 'payment'>('attendance');
  const { markAttendance, processing } = useAttendanceActions(meetingId);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const memberRef = doc(db, 'members', memberId);
        const memberSnap = await getDoc(memberRef);
        if (memberSnap.exists()) {
          setMember({ id: memberSnap.id, ...memberSnap.data() } as Member);
        }
        if (meetingId) {
          const meetingRef = doc(db, 'meetings', meetingId);
          const meetingSnap = await getDoc(meetingRef);
          if (meetingSnap.exists()) {
            const d = meetingSnap.data();
            setMeetingFee(d.entryFee ?? 500);
            setMeetingTitle(d.title || '');
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [memberId, meetingId]);

  const handleAbsent = async () => {
    if (!member) return;
    try {
      await markAttendance(member, 'ABSENT' as PaymentStatus, undefined, 0);
      showAlert('Marked Absent', `${member.fullName} has been marked absent.`, [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const handlePayment = async (status: PaymentStatus, mode?: PaymentMode, amount: number = 0) => {
    if (!member) return;
    try {
      await markAttendance(member, status, mode, amount);
      showAlert('Check-in Complete', `${member.fullName} has been checked in successfully.`, [
        { text: 'Done', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (!member) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ color: '#94a3b8', fontWeight: '600' }}>Member not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f8fafc' }} contentContainerStyle={{ padding: 20 }}>
      {/* Back button */}
      <TouchableOpacity
        onPress={() => step === 'payment' ? setStep('attendance') : router.back()}
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}
      >
        <ChevronLeft size={18} color="#4f46e5" />
        <Text style={{ color: '#4f46e5', fontWeight: '600', fontSize: 14, marginLeft: 4 }}>
          {step === 'payment' ? 'Back to Attendance' : 'Back to Members'}
        </Text>
      </TouchableOpacity>

      {/* Member Card */}
      <View style={{ backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#f1f5f9', padding: 20, marginBottom: 20, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 }}>
        {/* Avatar + Name */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#4f46e5' }}>{member.fullName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#0f172a' }}>{member.fullName}</Text>
            <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '500', marginTop: 2 }}>{member.companyName}</Text>
            {meetingTitle ? (
              <View style={{ backgroundColor: '#eff6ff', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6, alignSelf: 'flex-start' }}>
                <Text style={{ fontSize: 11, color: '#4f46e5', fontWeight: '700' }}>📅 {meetingTitle}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={{ borderTopWidth: 1, borderColor: '#f8fafc', gap: 10, paddingTop: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Phone size={14} color="#94a3b8" />
            <Text style={{ fontSize: 13, color: '#64748b', marginLeft: 8 }}>{member.mobileNumber}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Briefcase size={14} color="#94a3b8" />
            <Text style={{ fontSize: 13, color: '#64748b', marginLeft: 8 }}>{member.businessCategory}</Text>
          </View>
        </View>
      </View>

      {/* ─── STEP 1: Attendance ─── */}
      {step === 'attendance' && (
        <View>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>Mark Attendance</Text>
          <Text style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>Is this member present at today's meeting?</Text>

          {/* Present */}
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={processing}
            onPress={() => setStep('payment')}
            style={{ backgroundColor: '#4f46e5', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 12, shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4 }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
              <UserCheck size={22} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>Mark as Present</Text>
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 }}>Member is attending — select payment method next</Text>
            </View>
          </TouchableOpacity>

          {/* Absent */}
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={processing}
            onPress={handleAbsent}
            style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#fee2e2' }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
              <UserX size={22} color="#ef4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#ef4444', fontWeight: '800', fontSize: 16 }}>Mark as Absent</Text>
              <Text style={{ color: '#fca5a5', fontSize: 12, marginTop: 2 }}>Member did not attend this meeting</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* ─── STEP 2: Payment ─── */}
      {step === 'payment' && (
        <View>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>Collect Entry Fee</Text>
          <Text style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>Select how the entry fee of <Text style={{ fontWeight: '700', color: '#0f172a' }}>₹{meetingFee}</Text> was collected:</Text>

          {/* Cash */}
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={processing}
            onPress={() => handlePayment('PAID', 'CASH', meetingFee)}
            style={{ backgroundColor: '#059669', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 12, shadowColor: '#059669', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 3 }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
              <Banknote size={22} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>Paid – Cash</Text>
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 }}>₹{meetingFee} collected in cash</Text>
            </View>
          </TouchableOpacity>

          {/* UPI */}
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={processing}
            onPress={() => handlePayment('PAID', 'UPI', meetingFee)}
            style={{ backgroundColor: '#7c3aed', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 12, shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 3 }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
              <CreditCard size={22} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>Paid – UPI / Online</Text>
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 }}>₹{meetingFee} paid digitally</Text>
            </View>
          </TouchableOpacity>

          {/* Waived */}
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={processing}
            onPress={() => handlePayment('WAIVED', 'COMPLIMENTARY', 0)}
            style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
              <ShieldCheck size={22} color="#64748b" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#334155', fontWeight: '800', fontSize: 16 }}>Complimentary / Waived</Text>
              <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>No fee collected — entry is free</Text>
            </View>
          </TouchableOpacity>

          {/* Pending */}
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={processing}
            onPress={() => handlePayment('PENDING', undefined, 0)}
            style={{ backgroundColor: '#fff7ed', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#fed7aa' }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#ffedd5', justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
              <Clock size={22} color="#ea580c" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#ea580c', fontWeight: '800', fontSize: 16 }}>Mark as Pending</Text>
              <Text style={{ color: '#fdba74', fontSize: 12, marginTop: 2 }}>Present but fee not collected yet</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {processing && (
        <View style={{ alignItems: 'center', marginTop: 24 }}>
          <ActivityIndicator size="small" color="#4f46e5" />
          <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 8 }}>Saving...</Text>
        </View>
      )}
    </ScrollView>
  );
}
