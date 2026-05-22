import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthStore } from '../../store/authStore';

export function useNotifications() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Roles matching: ADMIN sees ADMIN + ALL, STAFF sees STAFF + ALL
    const roles = ['ALL'];
    if (user.role === 'ADMIN') {
      roles.push('ADMIN');
    } else {
      roles.push('STAFF');
    }

    const q = query(
      collection(db, 'notifications'),
      where('targetRole', 'in', roles)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by descending date
      list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setNotifications(list);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to notifications:', error);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'notifications', notificationId);
      await updateDoc(docRef, {
        readBy: arrayUnion(user.uid || user.email)
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      const userId = user.uid || user.email;
      const unread = notifications.filter(n => !n.readBy?.includes(userId));
      
      // Update each unread doc
      for (const n of unread) {
        const docRef = doc(db, 'notifications', n.id);
        await updateDoc(docRef, {
          readBy: arrayUnion(userId)
        });
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const unreadCount = notifications.filter(
    n => !n.readBy?.includes(user?.uid || user?.email)
  ).length;

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead };
}
