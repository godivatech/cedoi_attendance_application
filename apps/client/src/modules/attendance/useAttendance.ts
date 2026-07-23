import { useState } from 'react';
import { doc, setDoc, serverTimestamp, increment, writeBatch } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Attendance, Member, Meeting, PaymentStatus, PaymentMode, AttireStatus, PunctualityStatus } from '@cedoi/shared';
import { useAuthStore } from '../../store/authStore';

export const calculatePunctuality = (
  startTimeStr?: string,
  checkInDate: Date = new Date()
): PunctualityStatus => {
  if (!startTimeStr) return 'ON_TIME';

  try {
    const match = startTimeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return 'ON_TIME';

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3]?.toUpperCase();

    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    const startDateTime = new Date(checkInDate);
    startDateTime.setHours(hours, minutes, 0, 0);

    const diffMins = Math.floor((checkInDate.getTime() - startDateTime.getTime()) / (1000 * 60));

    if (diffMins <= 5) {
      return 'ON_TIME';
    } else if (diffMins <= 30) {
      return 'GRACE_PERIOD';
    } else {
      return 'LATE';
    }
  } catch (e) {
    return 'ON_TIME';
  }
};

export const useAttendanceActions = (meetingId: string, meetingStartTime?: string) => {
  const { user } = useAuthStore();
  const [processing, setProcessing] = useState(false);

  const markAttendance = async (
    member: Member,
    paymentStatus: PaymentStatus = 'PENDING',
    paymentMode?: PaymentMode,
    amountCollected: number = 0,
    prevAttendance?: { paymentStatus: PaymentStatus; amountCollected: number; checkInTime?: any; attireStatus?: AttireStatus; punctualityStatus?: PunctualityStatus } | null,
    attireStatus: AttireStatus = 'PERFECT'
  ) => {
    if (!user) return;
    setProcessing(true);

    try {
      const batch = writeBatch(db);

      const attendanceRef = doc(db, `meetings/${meetingId}/attendance`, member.id);
      const meetingRef = doc(db, 'meetings', meetingId);

      const isPresent = paymentStatus !== 'ABSENT';
      const punctuality: PunctualityStatus = isPresent 
        ? (prevAttendance?.punctualityStatus || calculatePunctuality(meetingStartTime))
        : 'ON_TIME';

      const attendanceData: any = {
        id: member.id,
        memberId: member.id,
        memberSnapshot: {
          fullName: member.fullName,
          companyName: member.companyName,
        },
        checkInTime: paymentStatus === 'ABSENT' 
          ? null 
          : (prevAttendance?.checkInTime || serverTimestamp()),
        paymentStatus,
        amountCollected,
        checkedInBy: user.uid,
        isAbsent: paymentStatus === 'ABSENT',
        attireStatus: isPresent ? attireStatus : 'PERFECT',
        punctualityStatus: punctuality,
      };

      if (paymentMode !== undefined) {
        attendanceData.paymentMode = paymentMode;
      }

      batch.set(attendanceRef, attendanceData);

      // Calculate deltas
      let attendeeDelta = 0;
      let collectedDelta = 0;

      const wasPresent = prevAttendance && prevAttendance.paymentStatus !== 'ABSENT';

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
