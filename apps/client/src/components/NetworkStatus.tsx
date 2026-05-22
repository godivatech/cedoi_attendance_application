import React, { useState, useEffect } from 'react';
import { View, Text, Platform } from 'react-native';
import { WifiOff } from 'lucide-react-native';

export function NetworkStatus() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Get initial state
      setIsOffline(!window.navigator.onLine);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  if (!isOffline) return null;

  return (
    <View className="bg-amber-500 py-2 px-4 flex-row items-center justify-center space-x-2 shadow-sm">
      <WifiOff size={14} color="white" />
      <Text className="text-white text-xs font-bold text-center">
        Offline Mode — Changes will sync automatically when network returns
      </Text>
    </View>
  );
}
