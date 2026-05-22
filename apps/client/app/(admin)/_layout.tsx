import React, { useState } from 'react';
import { Slot, Tabs, useRouter, usePathname } from 'expo-router';
import { LayoutDashboard, Users, CalendarDays, TrendingUp, LogOut, Bell, User as UserIcon } from 'lucide-react-native';
import { Platform, View, Text, Pressable, useWindowDimensions, useColorScheme } from 'react-native';
import { useAuthStore } from '../../src/store/authStore';
import { auth } from '../../src/services/firebase';
import { signOut } from 'firebase/auth';
import { useNotifications } from '../../src/modules/notifications/useNotifications';
import { NotificationCenterModal } from '../../src/components/ui/NotificationCenterModal';

export default function AdminLayout() {
  const { width } = useWindowDimensions();
  const { user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const colorScheme = useColorScheme();
  
  const isDark = false; // Lock navigation to light mode for consistent SaaS aesthetic
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [notifOpen, setNotifOpen] = useState(false);
  const { unreadCount } = useNotifications();

  const menuItems = [
    {
      name: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/(admin)/dashboard',
    },
    {
      name: 'meetings',
      label: 'Meetings',
      icon: CalendarDays,
      path: '/(admin)/meetings',
    },
    {
      name: 'members',
      label: 'Members',
      icon: Users,
      path: '/(admin)/members',
    },
    {
      name: 'reports',
      label: 'Reports',
      icon: TrendingUp,
      path: '/(admin)/reports',
    },
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActive = (itemPath: string) => {
    const name = itemPath.split('/').pop() || '';
    if (name === 'dashboard' && (pathname === '/' || pathname === '/dashboard' || pathname === '/(admin)/dashboard')) {
      return true;
    }
    return pathname.includes(name);
  };

  if (isDesktop) {
    return (
      <View style={{ flex: 1, flexDirection: 'row' }} className="bg-slate-50">
        {/* Modern Premium Sidebar */}
        <View className="w-64 bg-white border-r border-slate-200 flex justify-between p-4 py-6 shadow-sm">
          <View>
            {/* Header / Logo */}
            <View className="flex-row items-center px-3 mb-8">
              <View className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                <Text className="text-white font-extrabold text-xl">C</Text>
              </View>
              <View className="ml-3">
                <Text className="text-lg font-bold text-slate-800 leading-tight">CEDOI</Text>
                <Text className="text-xs text-slate-400 font-medium">Admin Portal</Text>
              </View>
            </View>

            {/* Menu Links */}
            <View className="space-y-1.5">
              {menuItems.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                return (
                  <Pressable
                    key={item.name}
                    onPress={() => router.push(item.path as any)}
                    className={`flex-row items-center px-4 py-3 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                      active
                        ? 'bg-blue-50 border-l-4 border-blue-600'
                        : 'hover:bg-slate-50'
                      }`}
                  >
                    <Icon size={20} color={active ? '#2563eb' : '#64748b'} />
                    <Text
                      className={`ml-3 font-semibold text-sm ${
                        active
                          ? 'text-blue-600 font-bold'
                          : 'text-slate-600'
                      }`}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}

              <Pressable
                onPress={() => setNotifOpen(true)}
                className="flex-row items-center px-4 py-3 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:bg-slate-50"
              >
                <View className="relative">
                  <Bell size={20} color="#64748b" />
                  {unreadCount > 0 && (
                    <View style={{ position: 'absolute', right: -4, top: -4, backgroundColor: '#ef4444', minWidth: 14, height: 14, borderRadius: 7, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 }}>
                      <Text style={{ color: '#fff', fontSize: 8, fontWeight: '800' }}>{unreadCount}</Text>
                    </View>
                  )}
                </View>
                <Text className="ml-3 font-semibold text-sm text-slate-600">
                  Notifications
                </Text>
              </Pressable>
            </View>
          </View>

          {/* User Profile + Logout at Bottom */}
          <View className="border-t border-slate-200 pt-4 space-y-3">
            <View className="flex-row items-center px-3 mb-3">
              <View className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center mr-3">
                <UserIcon size={18} color="#475569" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-sm font-semibold text-slate-800 truncate">
                  {user?.name || 'Administrator'}
                </Text>
                <Text className="text-xs text-slate-400 capitalize">
                  {user?.role?.toLowerCase() || 'admin'}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleLogout}
              className="flex-row items-center px-4 py-3 rounded-xl hover:bg-red-50 hover:scale-[1.02] active:scale-[0.98] group"
            >
              <LogOut size={18} color="#ef4444" />
              <Text className="ml-3 font-semibold text-sm text-red-600 group-hover:text-red-700">
                Logout
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Content Area */}
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
          <Slot />
        </View>
        <NotificationCenterModal visible={notifOpen} onClose={() => setNotifOpen(false)} />
      </View>
    );
  }

  // Mobile navigation using Tabs
  return (
    <>
      <Tabs
        sceneContainerStyle={{ backgroundColor: '#f8fafc' }}
        screenOptions={{
          tabBarActiveTintColor: '#2563eb',
          tabBarInactiveTintColor: isDark ? '#94a3b8' : '#64748b',
          tabBarStyle: {
            height: Platform.OS === 'web' ? 60 : 75,
            paddingBottom: Platform.OS === 'web' ? 10 : 20,
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            borderTopWidth: 1,
            borderTopColor: isDark ? '#334155' : '#e2e8f0',
          },
          headerShown: true,
          headerStyle: {
            backgroundColor: isDark ? '#0f172a' : '#f8fafc',
          },
          headerTitleStyle: {
            color: isDark ? '#ffffff' : '#0f172a',
          },
          headerShadowVisible: false,
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 20 }}>
              <Pressable 
                onPress={() => setNotifOpen(true)}
                style={{ marginRight: 16, position: 'relative' }}
                className="active:scale-[0.9] transition-transform duration-100"
              >
                <Bell size={18} color="#475569" />
                {unreadCount > 0 && (
                  <View style={{ position: 'absolute', right: -4, top: -4, backgroundColor: '#ef4444', minWidth: 14, height: 14, borderRadius: 7, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 }}>
                    <Text style={{ color: '#fff', fontSize: 8, fontWeight: '800' }}>{unreadCount}</Text>
                  </View>
                )}
              </Pressable>
              
              <Pressable 
                onPress={handleLogout} 
                className="active:scale-[0.9] transition-transform duration-100"
              >
                <LogOut size={18} color="#ef4444" />
              </Pressable>
            </View>
          ),
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color }) => <LayoutDashboard size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="meetings"
          options={{
            title: 'Meetings',
            tabBarIcon: ({ color }) => <CalendarDays size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="members"
          options={{
            title: 'Members',
            tabBarIcon: ({ color }) => <Users size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: 'Reports',
            tabBarIcon: ({ color }) => <TrendingUp size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="add-member"
          options={{
            href: null,
            title: 'Add Member',
          }}
        />
        <Tabs.Screen
          name="create-meeting"
          options={{
            href: null,
            title: 'Create Meeting',
          }}
        />
      </Tabs>
      <NotificationCenterModal visible={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  );
}
