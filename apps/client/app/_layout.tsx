import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../src/services/firebase';
import { useAuthStore } from '../src/store/authStore';
import { User } from '@cedoi/shared';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { NativeWindStyleSheet } from 'nativewind';
import { NetworkStatus } from '../src/components/NetworkStatus';
import { AlertModal, AlertButton } from '../src/components/ui/AlertModal';
import { registerAlertHandler, unregisterAlertHandler } from '../src/utils/platformAlert';

NativeWindStyleSheet.setOutput({
  default: 'native',
});

export default function RootLayout() {
  const { user, role, setAuth, logout, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons?: AlertButton[];
  }>({
    visible: false,
    title: '',
    message: '',
  });

  useEffect(() => {
    registerAlertHandler((title, message, buttons) => {
      setAlertConfig({
        visible: true,
        title,
        message: message || '',
        buttons,
      });
    });
    return () => {
      unregisterAlertHandler();
    };
  }, []);

  // 1. Listen to auth state and fetch user details from Firestore
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

  // 2. Centralized Authentication Route Guard
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user) {
      // If user is logged out and not on a login screen, redirect to login
      if (!inAuthGroup) {
        console.log('[_layout] Guard: Redirecting to login');
        router.replace('/(auth)/login');
      }
    } else {
      // If user is logged in but stuck on a login screen, redirect to their home
      if (inAuthGroup || segments.length === 0 || segments[0] === '') {
        if (role === 'ADMIN') {
          console.log('[_layout] Guard: Redirecting Admin to dashboard');
          router.replace('/(admin)/dashboard');
        } else {
          console.log('[_layout] Guard: Redirecting Staff to today');
          router.replace('/(staff)/today');
        }
      }
    }
  }, [user, role, isLoading, segments]);

  return (
    <ErrorBoundary>
      <View style={{ flex: 1, width: '100%', backgroundColor: '#f8fafc' }}>
        <NetworkStatus />
        {/* Always render Slot so Expo Router navigation is mounted from first render */}
        <Slot />

        <AlertModal
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
        />

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
