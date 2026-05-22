import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserRole } from '@cedoi/shared';

interface AuthState {
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  setAuth: (user: User | null, role: UserRole | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      isLoading: true,
      setAuth: (user, role) => set({ user, role, isLoading: false }),
      logout: () => set({ user: null, role: null, isLoading: false }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
