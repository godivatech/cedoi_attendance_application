import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

let serviceAccount: any = {};
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
} catch (e) {
  console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:', e);
}

if (!admin.apps.length) {
  if (serviceAccount.project_id || serviceAccount.projectId) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    admin.initializeApp();
  }
}

const db = admin.firestore();

async function cleanAllMeetings() {
  console.log('🧹 Starting cleanup of all meetings and attendance subcollections...');

  try {
    const meetingsSnap = await db.collection('meetings').get();
    console.log(`Found ${meetingsSnap.size} total meeting(s) to delete.`);

    let deletedMeetingsCount = 0;
    let deletedAttendanceDocsCount = 0;

    for (const meetingDoc of meetingsSnap.docs) {
      const meetingId = meetingDoc.id;
      const meetingData = meetingDoc.data();
      console.log(`\nDeleting meeting: [${meetingId}] "${meetingData.title || 'Untitled Meeting'}"`);

      // Delete attendance subcollection for this meeting
      const attendanceSnap = await db.collection(`meetings/${meetingId}/attendance`).get();
      if (!attendanceSnap.empty) {
        const batch = db.batch();
        attendanceSnap.docs.forEach((attDoc) => {
          batch.delete(attDoc.ref);
          deletedAttendanceDocsCount++;
        });
        await batch.commit();
        console.log(`  └─ Deleted ${attendanceSnap.size} attendance record(s).`);
      }

      // Delete the meeting doc itself
      await meetingDoc.ref.delete();
      deletedMeetingsCount++;
    }

    console.log('\n========================================');
    console.log(`✨ CLEANUP COMPLETE!`);
    console.log(`🗑️ Total Meetings Deleted: ${deletedMeetingsCount}`);
    console.log(`🗑️ Total Attendance Records Deleted: ${deletedAttendanceDocsCount}`);
    console.log('========================================\n');
  } catch (error) {
    console.error('❌ Error during meetings cleanup:', error);
  } finally {
    process.exit(0);
  }
}

cleanAllMeetings();
