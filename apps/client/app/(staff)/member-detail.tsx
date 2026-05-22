import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../src/services/firebase';
import { Member, PaymentMode, PaymentStatus } from '@cedoi/shared';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { useAttendanceActions } from '../../src/modules/attendance/useAttendance';
import { Check, CreditCard, Banknote, ShieldCheck } from 'lucide-react-native';
import { showAlert } from '../../src/utils/platformAlert';

export default function MemberDetailScreen() {
  const { memberId, meetingId } = useLocalSearchParams<{ memberId: string; meetingId: string }>();
  const [member, setMember] = useState<Member | null>(null);
  const [meetingFee, setMeetingFee] = useState<number>(500);
  const [meetingTitle, setMeetingTitle] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { markAttendance, processing } = useAttendanceActions(meetingId);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch member
        const memberRef = doc(db, 'members', memberId);
        const memberSnap = await getDoc(memberRef);
        if (memberSnap.exists()) {
          setMember({ id: memberSnap.id, ...memberSnap.data() } as Member);
        }

        // Fetch meeting fee dynamically
        if (meetingId) {
          const meetingRef = doc(db, 'meetings', meetingId);
          const meetingSnap = await getDoc(meetingRef);
          if (meetingSnap.exists()) {
            const meetingData = meetingSnap.data();
            setMeetingFee(meetingData.entryFee ?? 500);
            setMeetingTitle(meetingData.title || '');
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

  const handleCheckIn = async (status: PaymentStatus, mode?: PaymentMode, amount: number = 0) => {
    if (!member) return;
    try {
      await markAttendance(member, status, mode, amount);
      showAlert('Success', 'Attendance marked successfully', [
        { text: 'OK', onPress: () => router.replace('/(staff)/today') }
      ]);
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const promptPendingPayment = () => {
    showAlert(
      'Collect payment now?',
      `Would you like to collect the entry fee of ₹${meetingFee} now?`,
      [
        {
          text: 'Pay Cash',
          onPress: () => handleCheckIn('PAID', 'CASH', meetingFee)
        },
        {
          text: 'Pay UPI',
          onPress: () => handleCheckIn('PAID', 'UPI', meetingFee)
        },
        {
          text: 'Keep Pending',
          onPress: () => handleCheckIn('PENDING', undefined, 0),
          style: 'destructive'
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ backgroundColor: '#f8fafc' }} className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!member) {
    return (
      <View style={{ backgroundColor: '#f8fafc' }} className="flex-1 justify-center items-center p-6">
        <Text className="text-slate-500 font-medium">Member not found</Text>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: '#f8fafc' }} className="flex-1 p-6">
      <Card className="mb-6 bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
        <Text className="text-2xl font-extrabold text-slate-800 mb-1">{member.fullName}</Text>
        <Text className="text-slate-400 font-medium mb-1">{member.companyName}</Text>
        {meetingTitle ? (
          <Text className="text-xs font-semibold text-blue-600">Event: {meetingTitle}</Text>
        ) : null}
        
        <View className="flex-row items-center py-3 border-t border-slate-50 mt-4">
          <Text className="text-slate-400 font-bold text-xs uppercase tracking-wider flex-1">Mobile</Text>
          <Text className="font-semibold text-slate-800 text-sm">{member.mobileNumber}</Text>
        </View>
        <View className="flex-row items-center py-3 border-t border-slate-50">
          <Text className="text-slate-400 font-bold text-xs uppercase tracking-wider flex-1">Category</Text>
          <Text className="font-semibold text-slate-800 text-sm">{member.businessCategory}</Text>
        </View>
      </Card>

      <Text className="text-xl font-bold text-slate-800 mb-4">Mark Attendance & Payment</Text>
      
      <View className="space-y-4">
        {/* Cash Check-in */}
        <TouchableOpacity 
          className="bg-emerald-600 hover:bg-emerald-700 p-4 rounded-xl flex-row items-center justify-between shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          onPress={() => handleCheckIn('PAID', 'CASH', meetingFee)}
          disabled={processing}
        >
          <View className="flex-row items-center">
            <Banknote color="white" size={20} />
            <Text className="text-white font-bold ml-3 text-base">Paid - Cash (₹{meetingFee})</Text>
          </View>
          <Check color="white" size={20} />
        </TouchableOpacity>

        {/* UPI Check-in */}
        <TouchableOpacity 
          className="bg-indigo-600 hover:bg-indigo-700 p-4 rounded-xl flex-row items-center justify-between shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          onPress={() => handleCheckIn('PAID', 'UPI', meetingFee)}
          disabled={processing}
        >
          <View className="flex-row items-center">
            <CreditCard color="white" size={20} />
            <Text className="text-white font-bold ml-3 text-base">Paid - UPI (₹{meetingFee})</Text>
          </View>
          <Check color="white" size={20} />
        </TouchableOpacity>

        {/* Waived Check-in */}
        <TouchableOpacity 
          className="bg-slate-100 hover:bg-slate-200 p-4 rounded-xl flex-row items-center justify-between border border-slate-200/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          onPress={() => handleCheckIn('WAIVED', 'COMPLIMENTARY', 0)}
          disabled={processing}
        >
          <View className="flex-row items-center">
            <ShieldCheck color="#475569" size={20} />
            <Text className="text-slate-700 font-bold ml-3 text-base">Complimentary / Waived</Text>
          </View>
          <Check color="#475569" size={20} />
        </TouchableOpacity>

        {/* Pending Check-in */}
        <Button 
          label="Mark as Pending" 
          variant="outline" 
          onPress={promptPendingPayment}
          disabled={processing}
          loading={processing}
          className="mt-2 border-slate-200"
        />
      </View>
    </View>
  );
}
