import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
  });
}

export const auth = admin.auth();
export const db = admin.firestore();
