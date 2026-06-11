import { db } from './firebase';
import { collection, query, where, getDocs, writeBatch, doc, getDoc, setDoc, addDoc } from 'firebase/firestore';
import { Meeting } from '@cedoi/shared';

// Helper to convert "HH:MM AM/PM" to absolute minutes of the day for easy comparison
function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const ampm = match[3].toUpperCase();
  
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  
  return hours * 60 + minutes;
}

export const automateMeetingStatuses = async () => {
  console.log('⏱️ Checking meeting status transitions...');
  try {
    const now = new Date();
    
    // Format current date and time in Indian Standard Time (Asia/Kolkata)
    const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
    
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    const currentTimeStr = timeFormatter.format(now); // e.g. "03:47 PM"
    const currentMinutes = parseTimeToMinutes(currentTimeStr);

    const meetingsRef = collection(db, 'meetings');
    const q = query(meetingsRef, where('status', 'in', ['SCHEDULED', 'ONGOING']));
    const snapshot = await getDocs(q);

    const batch = writeBatch(db);
    let updates = 0;

    snapshot.forEach(docSnap => {
      const meeting = docSnap.data() as Meeting;
      const startMinutes = parseTimeToMinutes(meeting.startTime || '08:00 AM');
      const endMinutes = parseTimeToMinutes(meeting.endTime || '10:00 AM');

      let targetStatus = meeting.status;

      if (meeting.date < todayStr) {
        // Past days must always be COMPLETED
        targetStatus = 'COMPLETED';
      } else if (meeting.date === todayStr) {
        // Same-day check
        if (currentMinutes >= endMinutes) {
          targetStatus = 'COMPLETED';
        } else if (currentMinutes >= startMinutes) {
          targetStatus = 'ONGOING';
        } else {
          targetStatus = 'SCHEDULED';
        }
      } else {
        // Future days must remain SCHEDULED
        targetStatus = 'SCHEDULED';
      }

      if (targetStatus !== meeting.status) {
        console.log(`⏱️ Transitioning "${meeting.title}" (${meeting.date}) from ${meeting.status} -> ${targetStatus}`);
        batch.update(docSnap.ref, { status: targetStatus });
        updates++;
      }
    });

    if (updates > 0) {
      await batch.commit();
      console.log(`✅ Automated ${updates} meeting status transitions.`);
    }
  } catch (error) {
    console.error('Error running meeting status automator:', error);
  }
};

export const runNotificationAutomator = async () => {
  console.log('🔔 Running daily notification check...');

  try {
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const metaRef = doc(db, 'system', 'metadata');
    const metaSnap = await getDoc(metaRef);

    if (metaSnap.exists()) {
      const lastRun = metaSnap.data()?.lastNotificationRun;
      if (lastRun === todayStr) {
        console.log('🔔 Notifications already processed for today: ' + todayStr);
        return;
      }
    }

    // 1. Calculate and Notify Pending Collections (Admin Only)
    console.log('🔔 Analyzing pending collections...');
    const completedMeetingsSnap = await getDocs(
      query(collection(db, 'meetings'), where('status', '==', 'COMPLETED'))
    );

    let totalPending = 0;
    const pendingBreakdown: string[] = [];

    for (const meetingDoc of completedMeetingsSnap.docs) {
      const meetingData = meetingDoc.data();
      const attendanceSnap = await getDocs(
        query(collection(meetingDoc.ref, 'attendance'), where('paymentStatus', '==', 'PENDING'))
      );

      let meetingPending = 0;
      attendanceSnap.forEach(() => {
        const fee = meetingData.entryFee || 500;
        meetingPending += fee;
      });

      if (meetingPending > 0) {
        totalPending += meetingPending;
        pendingBreakdown.push(`${meetingData.title}: ₹${meetingPending}`);
      }
    }

    if (totalPending > 0) {
      const message = `There is a total of ₹${totalPending} pending collection from completed meetings. Breakdown: ${pendingBreakdown.join(', ')}`;
      await addDoc(collection(db, 'notifications'), {
        title: 'Morning Outstanding Fees Report',
        message,
        targetRole: 'ADMIN',
        createdAt: new Date().toISOString(),
        type: 'PENDING_AMOUNT',
        readBy: [],
      });
      console.log(`🔔 Created outstanding fee report for ₹${totalPending}`);
    }

    // 2. Schedule Upcoming Meeting Reminders (Admin & Staff)
    console.log('🔔 Checking for upcoming meetings...');
    const getOffsetDateString = (offsetDays: number) => {
      const d = new Date();
      d.setDate(d.getDate() + offsetDays);
      return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    };

    const dateIn3Days = getOffsetDateString(3);
    const dateIn1Day = getOffsetDateString(1);

    const upcomingMeetingsSnap = await getDocs(
      query(
        collection(db, 'meetings'),
        where('status', '==', 'SCHEDULED'),
        where('date', 'in', [dateIn3Days, dateIn1Day])
      )
    );

    for (const meetingDoc of upcomingMeetingsSnap.docs) {
      const meeting = meetingDoc.data();
      const daysLeft = meeting.date === dateIn3Days ? 3 : 1;
      const reminderId = `reminder_${meetingDoc.id}_${daysLeft}`;

      const reminderRef = doc(db, 'notifications', reminderId);
      const reminderSnap = await getDoc(reminderRef);

      if (!reminderSnap.exists()) {
        await setDoc(reminderRef, {
          title: `Upcoming Meeting Reminder (${daysLeft} Days Left)`,
          message: `"${meeting.title}" is scheduled in ${daysLeft} day(s) on ${meeting.date} at ${meeting.startTime} (${meeting.venue}).`,
          targetRole: 'ALL',
          createdAt: new Date().toISOString(),
          type: 'MEETING_REMINDER',
          readBy: [],
        });
        console.log(`🔔 Sent upcoming reminder for "${meeting.title}" (${daysLeft} days left)`);
      }
    }

    // Update metadata run log
    await setDoc(metaRef, { lastNotificationRun: todayStr }, { merge: true });
    console.log('🔔 Notification check completed successfully for ' + todayStr);

  } catch (error) {
    console.error('🔔 Error in notification automator:', error);
  }
};
