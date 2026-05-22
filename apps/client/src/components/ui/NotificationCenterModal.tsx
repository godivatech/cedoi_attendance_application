import React from 'react';
import { View, Text, Modal, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { X, Bell, Check, Info, AlertTriangle } from 'lucide-react-native';
import { useNotifications } from '../../modules/notifications/useNotifications';
import { useAuthStore } from '../../store/authStore';

interface NotificationCenterModalProps {
  visible: boolean;
  onClose: () => void;
}

export function NotificationCenterModal({ visible, onClose }: NotificationCenterModalProps) {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const { user } = useAuthStore();
  const userId = user?.uid || user?.email || '';

  const formatNotificationTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <View style={{ width: '100%', maxHeight: '80%', backgroundColor: '#fff', borderRadius: 20, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10, overflow: 'hidden' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1, borderColor: '#f1f5f9' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Bell size={20} color="#1e293b" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#1e293b' }}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={{ backgroundColor: '#eff6ff', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563eb' }}>{unreadCount} new</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <X size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Action Bar */}
          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={markAllAsRead}
              style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginHorizontal: 20, marginTop: 12, paddingVertical: 4 }}
            >
              <Check size={13} color="#2563eb" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563eb' }}>Mark all as read</Text>
            </TouchableOpacity>
          )}

          {/* Content */}
          {loading ? (
            <View style={{ padding: 40, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#2563eb" />
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 20, gap: 10 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isUnread = !item.readBy?.includes(userId);
                const isPendingReport = item.type === 'PENDING_AMOUNT';

                return (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => isUnread && markAsRead(item.id)}
                    style={{
                      flexDirection: 'row',
                      backgroundColor: isUnread ? '#f8fafc' : '#fff',
                      borderWidth: 1,
                      borderColor: isUnread ? '#e2e8f0' : '#f1f5f9',
                      padding: 14,
                      borderRadius: 14,
                      alignItems: 'flex-start',
                    }}
                  >
                    {/* Icon Column */}
                    <View style={{
                      backgroundColor: isPendingReport ? '#fef2f2' : '#eff6ff',
                      padding: 8,
                      borderRadius: 10,
                      marginRight: 12,
                    }}>
                      {isPendingReport ? (
                        <AlertTriangle size={15} color="#ef4444" />
                      ) : (
                        <Info size={15} color="#2563eb" />
                      )}
                    </View>

                    {/* Content Column */}
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e293b', flex: 1 }}>{item.title}</Text>
                        <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '500', marginLeft: 6 }}>{formatNotificationTime(item.createdAt)}</Text>
                      </View>
                      <Text style={{ fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 16 }}>{item.message}</Text>
                    </View>

                    {/* Unread Indicator */}
                    {isUnread && (
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#2563eb', marginTop: 6 }} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={() => (
                <View style={{ paddingVertical: 48, alignItems: 'center' }}>
                  <Bell size={32} color="#e2e8f0" style={{ marginBottom: 12 }} />
                  <Text style={{ color: '#94a3b8', fontWeight: '600', fontSize: 13 }}>All caught up!</Text>
                  <Text style={{ color: '#cbd5e1', fontSize: 11, marginTop: 4 }}>No notifications found.</Text>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
