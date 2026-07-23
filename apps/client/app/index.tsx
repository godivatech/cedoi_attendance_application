import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { user, role, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (!user) {
    console.log('[Index] Declarative redirecting to login...');
    return <Redirect href="/(auth)/login" />;
  }

  if (role === 'ADMIN') {
    console.log('[Index] Declarative redirecting to admin...');
    return <Redirect href="/(admin)/dashboard" />;
  }

  console.log('[Index] Declarative redirecting to staff dashboard...');
  return <Redirect href="/(staff)/dashboard" />;
}
