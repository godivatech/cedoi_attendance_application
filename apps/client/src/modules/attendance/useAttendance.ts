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
    amountCollected: number = 0,
    prevAttendance?: { paymentStatus: PaymentStatus; amountCollected: number } | null
  ) => {
    if (!user) return;
    setProcessing(true);

    try {
      const batch = writeBatch(db);

      const attendanceRef = doc(db, `meetings/${meetingId}/attendance`, member.id);
      const meetingRef = doc(db, 'meetings', meetingId);

      const attendanceData: any = {
        id: member.id,
        memberId: member.id,
        memberSnapshot: {
          fullName: member.fullName,
          companyName: member.companyName,
        },
        checkInTime: serverTimestamp(),
        paymentStatus,
        amountCollected,
        checkedInBy: user.uid,
        isAbsent: paymentStatus === 'ABSENT',
      };

      if (paymentMode !== undefined) {
        attendanceData.paymentMode = paymentMode;
      }

      batch.set(attendanceRef, attendanceData);

      // Calculate deltas
      let attendeeDelta = 0;
      let collectedDelta = 0;

      const wasPresent = prevAttendance && prevAttendance.paymentStatus !== 'ABSENT';
      const isPresent = paymentStatus !== 'ABSENT';

      // 1. Calculate attendee delta
      if (!wasPresent && isPresent) {
        attendeeDelta = 1;
      } else if (wasPresent && !isPresent) {
        attendeeDelta = -1;
      }

      // 2. Calculate collected amount delta
      const prevCollected = prevAttendance ? prevAttendance.amountCollected : 0;
      collectedDelta = amountCollected - prevCollected;

      const updates: any = {};
      if (attendeeDelta !== 0) {
        updates['metrics.totalAttendees'] = increment(attendeeDelta);
      }
      if (collectedDelta !== 0) {
        updates['metrics.totalCollected'] = increment(collectedDelta);
      }

      if (Object.keys(updates).length > 0) {
        batch.update(meetingRef, updates);
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

  return { markAttendance, processing };
};
