import { db } from './firebase';

export const runNotificationAutomator = async () => {
  console.log('🔔 Running daily notification check...');

  try {
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const metaRef = db.collection('system').doc('metadata');
    const metaSnap = await metaRef.get();

    if (metaSnap.exists) {
      const lastRun = metaSnap.data()?.lastNotificationRun;
      if (lastRun === todayStr) {
        console.log('🔔 Notifications already processed for today: ' + todayStr);
        return;
      }
    }

    // 1. Calculate and Notify Pending Collections (Admin Only)
    console.log('🔔 Analyzing pending collections...');
    const completedMeetingsSnap = await db.collection('meetings').where('status', '==', 'COMPLETED').get();

    let totalPending = 0;
    const pendingBreakdown: string[] = [];

    for (const meetingDoc of completedMeetingsSnap.docs) {
      const meetingData = meetingDoc.data();
      const attendanceSnap = await meetingDoc.ref.collection('attendance')
        .where('paymentStatus', '==', 'PENDING')
        .get();

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
      await db.collection('notifications').add({
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

    const upcomingMeetingsSnap = await db.collection('meetings')
      .where('status', '==', 'SCHEDULED')
      .where('date', 'in', [dateIn3Days, dateIn1Day])
      .get();

    for (const meetingDoc of upcomingMeetingsSnap.docs) {
      const meeting = meetingDoc.data();
      const daysLeft = meeting.date === dateIn3Days ? 3 : 1;
      const reminderId = `reminder_${meetingDoc.id}_${daysLeft}`;

      const reminderRef = db.collection('notifications').doc(reminderId);
      const reminderSnap = await reminderRef.get();

      if (!reminderSnap.exists) {
        await reminderRef.set({
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
    await metaRef.set({ lastNotificationRun: todayStr }, { merge: true });
    console.log('🔔 Notification check completed successfully for ' + todayStr);

  } catch (error) {
    console.error('🔔 Error in notification automator:', error);
  }
};
