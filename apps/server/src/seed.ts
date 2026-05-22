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

async function seed() {
  console.log('🌱 Seeding database...');

  // 1. Create Admin User in Auth and Firestore
  try {
    const adminUser = await auth.createUser({
      email: 'admin@godivatech.com',
      password: 'Password@123',
      displayName: 'Super Admin',
    });

    await db.collection('users').doc(adminUser.uid).set({
      uid: adminUser.uid,
      name: 'Super Admin',
      email: 'admin@godivatech.com',
      role: 'ADMIN',
      isActive: true,
    });
    console.log('✅ Admin user created');
  } catch (e) {
    console.log('⚠️ Admin user might already exist');
  }

  // 2. Create Staff User
  try {
    const staffUser = await auth.createUser({
      email: 'staff@godivatech.com',
      password: 'Password@123',
      displayName: 'Staff Operator',
    });

    await db.collection('users').doc(staffUser.uid).set({
      uid: staffUser.uid,
      name: 'Staff Operator',
      email: 'staff@godivatech.com',
      role: 'STAFF',
      isActive: true,
    });
    console.log('✅ Staff user created');
  } catch (e) {
    console.log('⚠️ Staff user might already exist');
  }

  // 3. Create Sample Members
  const members = [
    { fullName: 'Rajesh Kumar', companyName: 'RK Textiles', mobileNumber: '9876543210', businessCategory: 'Textiles', city: 'Madurai', membershipType: 'PREMIUM' },
    { fullName: 'Priya Sharma', companyName: 'Creative Solutions', mobileNumber: '9876543211', businessCategory: 'Advertising', city: 'Madurai', membershipType: 'GOLD' },
    { fullName: 'Anand Viswanathan', companyName: 'AV Tech', mobileNumber: '9876543212', businessCategory: 'Software', city: 'Madurai', membershipType: 'SILVER' },
  ];

  for (const m of members) {
    const searchKeywords = [
      ...m.fullName.toLowerCase().split(' '),
      ...m.companyName.toLowerCase().split(' '),
      m.mobileNumber
    ];
    await db.collection('members').add({
      ...m,
      searchKeywords,
      joinDate: new Date().toISOString().split('T')[0],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  console.log('✅ Sample members created');

  // 4. Create Sample Meeting
  await db.collection('meetings').add({
    title: 'Monthly Chapter Meet - May 2026',
    venue: 'Marriott Madurai',
    date: '2026-05-16',
    startTime: '08:00 AM',
    endTime: '11:00 AM',
    entryFee: 500,
    status: 'ONGOING',
    metrics: { totalAttendees: 0, totalCollected: 0 },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('✅ Sample meeting created');

  console.log('🚀 Seeding complete!');
  process.exit();
}

seed();
