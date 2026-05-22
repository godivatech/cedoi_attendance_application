import { useState } from 'react';
import { doc, setDoc, serverTimestamp, increment, writeBatch } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Attendance, Member, Meeting, PaymentStatus, PaymentMode } from '@cedoi/shared';
import { useAuthStore } from '../../store/authStore';

export const useAttendanceActions = (meetingId: string) => {
  const { user } = useAuthStore();
  const [processing, setProcessing] = useState(false);

  const markAttendance = async (
    member: Member,
    paymentStatus: PaymentStatus = 'PENDING',
    paymentMode?: PaymentMode,
    amountCollected: number = 0
  ) => {
    if (!user) return;
    setProcessing(true);

    try {
      const batch = writeBatch(db);

      const attendanceRef = doc(db, `meetings/${meetingId}/attendance`, member.id);
      const meetingRef = doc(db, 'meetings', meetingId);

      const attendanceData: Attendance = {
        id: member.id,
        memberId: member.id,
        memberSnapshot: {
          fullName: member.fullName,
          companyName: member.companyName,
        },
        checkInTime: serverTimestamp(),
        paymentStatus,
        paymentMode,
        amountCollected,
        checkedInBy: user.uid,
        isAbsent: paymentStatus === 'ABSENT',
      };

      batch.set(attendanceRef, attendanceData);

      // Only increment attendee count if member is NOT absent
      if (paymentStatus !== 'ABSENT') {
        batch.update(meetingRef, {
          'metrics.totalAttendees': increment(1),
          'metrics.totalCollected': increment(amountCollected),
        });
      }

      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error marking attendance:', error);
      throw error;
    } finally {
      setProcessing(false);
    }
  };

  const updatePayment = async (
    memberId: string,
    paymentStatus: PaymentStatus,
    paymentMode: PaymentMode,
    amount: number
  ) => {
    setProcessing(true);
    try {
      const batch = writeBatch(db);
      const attendanceRef = doc(db, `meetings/${meetingId}/attendance`, memberId);
      const meetingRef = doc(db, 'meetings', meetingId);

      batch.update(attendanceRef, {
        paymentStatus,
        paymentMode,
        amountCollected: amount,
      });

      batch.update(meetingRef, {
        'metrics.totalCollected': increment(amount),
      });

      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error updating payment:', error);
      throw error;
    } finally {
      setProcessing(false);
    }
  };

  return { markAttendance, updatePayment, processing };
};
