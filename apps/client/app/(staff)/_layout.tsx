import React, { useState } from 'react';
import { Slot, Tabs, useRouter, usePathname } from 'expo-router';
import { Clock, History, LogOut, Bell, User as UserIcon, FileText, LayoutDashboard } from 'lucide-react-native';
import { Platform, View, Text, Pressable, useWindowDimensions, useColorScheme, Image } from 'react-native';
import { useAuthStore } from '../../src/store/authStore';
import { auth } from '../../src/services/firebase';
import { signOut } from 'firebase/auth';
import { useNotifications } from '../../src/modules/notifications/useNotifications';
import { NotificationCenterModal } from '../../src/components/ui/NotificationCenterModal';
import { BRAND_COLORS } from '../../src/theme/colors';

export default function StaffLayout() {
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
      label: 'Overview',
      icon: LayoutDashboard,
      path: '/(staff)/dashboard',
    },
    {
      name: 'today',
      label: 'Today',
      icon: Clock,
      path: '/(staff)/today',
    },
    {
      name: 'history',
      label: 'History',
      icon: History,
      path: '/(staff)/history',
    },
    {
      name: 'reports',
      label: 'Reports',
      icon: FileText,
      path: '/(staff)/reports',
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
    if (name === 'today' && (pathname === '/' || pathname === '/today' || pathname === '/(staff)/today')) {
      return true;
    }
    return pathname.includes(name);
  };

  if (isDesktop) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: BRAND_COLORS.canvasBg }}>
        {/* Modern Premium Sidebar */}
        <View style={{ width: 256, backgroundColor: BRAND_COLORS.cardBg, borderRightWidth: 1, borderRightColor: BRAND_COLORS.border, justifyContent: 'space-between', padding: 16, paddingVertical: 24 }}>
          <View>
            {/* Header / Logo */}
            <View style={{ paddingHorizontal: 4, marginBottom: 16, height: 64, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
              <Image
                source={require('../../assets/Logo.png')}
                style={{ width: 220, height: 120, resizeMode: 'contain' }}
              />
            </View>

            {/* Menu Links */}
            <View style={{ gap: 6 }}>
              {menuItems.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                return (
                  <Pressable
                    key={item.name}
                    onPress={() => router.push(item.path as any)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 12,
                      backgroundColor: active ? BRAND_COLORS.primaryLight : 'transparent',
                      borderLeftWidth: active ? 4 : 0,
                      borderLeftColor: active ? BRAND_COLORS.primary : 'transparent',
                    }}
                  >
                    <Icon size={20} color={active ? BRAND_COLORS.primary : BRAND_COLORS.textBody} />
                    <Text
                      style={{
                        marginLeft: 12,
                        fontSize: 14,
                        fontWeight: active ? '700' : '600',
                        color: active ? BRAND_COLORS.primary : BRAND_COLORS.textBody,
                      }}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* User Profile + Logout at Bottom */}
          <View style={{ borderTopWidth: 1, borderColor: BRAND_COLORS.border, paddingTop: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 8 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: BRAND_COLORS.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <UserIcon size={18} color={BRAND_COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND_COLORS.textHeading }}>
                  {user?.name === 'Staff Operator' ? 'Member' : (user?.name || 'Member')}
                </Text>
                <Text style={{ fontSize: 11, color: BRAND_COLORS.textMuted, textTransform: 'capitalize' }}>
                  Member Account
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleLogout}
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#fef2f2' }}
            >
              <LogOut size={18} color={BRAND_COLORS.danger} />
              <Text style={{ marginLeft: 12, fontWeight: '700', fontSize: 13, color: BRAND_COLORS.danger }}>
                Logout
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Content Area */}
        <View style={{ flex: 1, backgroundColor: BRAND_COLORS.canvasBg }}>
          {/* Sleek Top Header for Desktop */}
          <View style={{ height: 64, borderBottomWidth: 1, borderColor: BRAND_COLORS.border, backgroundColor: BRAND_COLORS.cardBg, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 32 }}>
            
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* Notification Bell */}
              <Pressable 
                onPress={() => setNotifOpen(true)}
                style={{ marginRight: 20, position: 'relative', padding: 8, borderRadius: 8, backgroundColor: BRAND_COLORS.primaryLight }}
              >
                <Bell size={18} color={BRAND_COLORS.primary} />
                {unreadCount > 0 && (
                  <View style={{ position: 'absolute', right: 2, top: 2, backgroundColor: BRAND_COLORS.accent, minWidth: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#fff' }}>
                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{unreadCount}</Text>
                  </View>
                )}
              </Pressable>

              <View style={{ height: 20, width: 1, backgroundColor: BRAND_COLORS.border, marginRight: 20 }} />

              {/* User Profile Info */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: BRAND_COLORS.secondaryLight, borderWidth: 1, borderColor: BRAND_COLORS.secondaryBorder, justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                  <UserIcon size={16} color={BRAND_COLORS.primary} />
                </View>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND_COLORS.textHeading }}>
                    {user?.name === 'Staff Operator' ? 'Member' : (user?.name || 'Member')}
                  </Text>
                  <Text style={{ fontSize: 10, color: BRAND_COLORS.textMuted, fontWeight: '700' }}>
                    Member Portal
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Page Content */}
          <View style={{ flex: 1 }}>
            <Slot />
          </View>
        </View>
        <NotificationCenterModal visible={notifOpen} onClose={() => setNotifOpen(false)} />
      </View>
    );
  }

  // Mobile navigation using Tabs
  return (
    <>
      <Tabs
        sceneContainerStyle={{ backgroundColor: BRAND_COLORS.canvasBg }}
        screenOptions={{
          tabBarActiveTintColor: BRAND_COLORS.primary,
          tabBarInactiveTintColor: BRAND_COLORS.textMuted,
          tabBarLabelPosition: 'below-icon',
          tabBarStyle: {
            height: Platform.OS === 'web' ? 60 : 75,
            paddingBottom: Platform.OS === 'web' ? 10 : 20,
            backgroundColor: BRAND_COLORS.cardBg,
            borderTopWidth: 1,
            borderTopColor: BRAND_COLORS.border,
          },
          headerShown: true,
          headerTitle: '',
          headerLeftContainerStyle: { paddingLeft: 0, marginLeft: 0 },
          headerLeft: () => (
            <View style={{ marginLeft: 4, width: 140, height: 38, justifyContent: 'center', alignItems: 'flex-start', overflow: 'hidden' }}>
              <Image
                source={require('../../assets/Logo.png')}
                style={{ width: 180, height: 90, marginLeft: -25, resizeMode: 'contain' }}
              />
            </View>
          ),
          headerStyle: {
            backgroundColor: BRAND_COLORS.cardBg,
          },
          headerTitleStyle: {
            color: BRAND_COLORS.primary,
            fontWeight: '800',
          },
          headerShadowVisible: false,
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 20 }}>
              <Pressable
                onPress={() => setNotifOpen(true)}
                style={{ marginRight: 16, position: 'relative' }}
              >
                <Bell size={18} color={BRAND_COLORS.primary} />
                {unreadCount > 0 && (
                  <View style={{ position: 'absolute', right: -4, top: -4, backgroundColor: BRAND_COLORS.accent, minWidth: 14, height: 14, borderRadius: 7, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 }}>
                    <Text style={{ color: '#fff', fontSize: 8, fontWeight: '800' }}>{unreadCount}</Text>
                  </View>
                )}
              </Pressable>

              <Pressable
                onPress={handleLogout}
              >
                <LogOut size={18} color={BRAND_COLORS.danger} />
              </Pressable>
            </View>
          ),
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Overview',
            tabBarIcon: ({ color }) => <LayoutDashboard size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="today"
          options={{
            title: 'Today',
            tabBarIcon: ({ color }) => <Clock size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarIcon: ({ color }) => <History size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: 'Reports',
            tabBarIcon: ({ color }) => <FileText size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="check-in"
          options={{
            href: null,
            title: 'Check In',
          }}
        />
        <Tabs.Screen
          name="member-detail"
          options={{
            href: null,
            title: 'Member Detail',
          }}
        />
      </Tabs>
      <NotificationCenterModal visible={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  );
}
