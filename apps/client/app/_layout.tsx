import { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { Slot } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../src/services/firebase';
import { useAuthStore } from '../src/store/authStore';
import { User } from '@cedoi/shared';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { NativeWindStyleSheet } from 'nativewind';
import { NetworkStatus } from '../src/components/NetworkStatus';

NativeWindStyleSheet.setOutput({
  default: 'native',
});

export default function RootLayout() {
  const { setAuth, logout, isLoading } = useAuthStore();

  useEffect(() => {
    console.log('[_layout] Setting up Auth listener...');
    // Safety timeout: if Firebase never responds within 5s, force out of loading
    const safetyTimeout = setTimeout(() => {
      console.log('[_layout] Safety timeout reached, forcing loading to false');
      logout();
    }, 5000);

    let unsubscribe = () => { };
    try {
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        console.log('[_layout] Auth state changed, user:', firebaseUser?.uid);
        clearTimeout(safetyTimeout);
        if (firebaseUser) {
          try {
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data() as User;
              console.log('[_layout] Found Firestore user:', userData.email, 'role:', userData.role);
              setAuth(userData, userData.role);
            } else {
              console.log('[_layout] No user doc found in Firestore for UID:', firebaseUser.uid);
              logout();
            }
          } catch (e) {
            console.error('[_layout] Firestore error:', e);
            logout();
          }
        } else {
          console.log('[_layout] No firebase user, logging out');
          logout();
        }
      });
    } catch (e) {
      console.error('[_layout] Firebase Auth error:', e);
      clearTimeout(safetyTimeout);
      logout();
    }

    return () => {
      console.log('[_layout] Unsubscribing from Auth listener');
      clearTimeout(safetyTimeout);
      unsubscribe();
    };
  }, []);

  return (
    <ErrorBoundary>
      <View style={{ flex: 1, width: '100%', backgroundColor: '#f8fafc' }}>
        <NetworkStatus />
        {/* Always render Slot so Expo Router navigation is mounted from first render */}
        <Slot />

        {isLoading && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
            zIndex: 9999
          }}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={{ marginTop: 10, color: '#475569', fontSize: 16 }}>Loading CEDOI...</Text>
          </View>
        )}
      </View>
    </ErrorBoundary>
  );
}
