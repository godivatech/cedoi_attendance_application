import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const auth = admin.auth();

async function fixUser() {
  console.log('🔄 Updating database user record from Staff Operator to Member...');
  try {
    // Find in Firestore
    const usersSnap = await db.collection('users').where('email', '==', 'staff@godivatech.com').get();
    if (usersSnap.empty) {
      console.log('❌ No user found in firestore with email staff@godivatech.com');
      return;
    }

    const doc = usersSnap.docs[0];
    await doc.ref.update({
      name: 'Member'
    });
    console.log(`✅ Firestore name updated to 'Member' for doc ID: ${doc.id}`);

    // Find in Firebase Auth and update displayName
    try {
      const authUser = await auth.getUserByEmail('staff@godivatech.com');
      await auth.updateUser(authUser.uid, {
        displayName: 'Member'
      });
      console.log('✅ Firebase Auth displayName updated to Member');
    } catch (authErr) {
      console.log('⚠️ Could not update Auth user:', authErr);
    }
  } catch (error) {
    console.error('❌ Error updating user:', error);
  }
}

fixUser();
