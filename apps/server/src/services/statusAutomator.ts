import { db } from './firebase';
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

  const meetingsRef = db.collection('meetings');
  const snapshot = await meetingsRef.where('status', 'in', ['SCHEDULED', 'ONGOING']).get();

  const batch = db.batch();
  let updates = 0;

  snapshot.forEach(doc => {
    const meeting = doc.data() as Meeting;
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
      batch.update(doc.ref, { status: targetStatus });
      updates++;
    }
  });

  if (updates > 0) {
    await batch.commit();
    console.log(`✅ Automated ${updates} meeting status transitions.`);
  }
};
