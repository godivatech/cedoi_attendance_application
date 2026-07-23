import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, getCountFromServer } from 'firebase/firestore';
import { db } from '../../services/firebase';

export const useDashboardMetrics = () => {
  const [metrics, setMetrics] = useState({
    totalMembers: 0,
    totalMeetings: 0,
    totalRevenue: 0,
    loading: true,
  });

  useEffect(() => {
    let unsubscribeMeetings = () => {};

    const fetchCounts = async () => {
      try {
        const membersColl = collection(db, 'members');
        const meetingsColl = collection(db, 'meetings');
        
        const membersCount = await getCountFromServer(membersColl).catch(() => ({ data: () => ({ count: 0 }) }));
        const meetingsCount = await getCountFromServer(meetingsColl).catch(() => ({ data: () => ({ count: 0 }) }));

        // Simple revenue aggregation from meeting metrics
        unsubscribeMeetings = onSnapshot(
          meetingsColl,
          (snapshot) => {
            let revenue = 0;
            snapshot.docs.forEach(doc => {
              revenue += doc.data().metrics?.totalCollected || 0;
            });
            
            setMetrics({
              totalMembers: membersCount.data().count,
              totalMeetings: meetingsCount.data().count,
              totalRevenue: revenue,
              loading: false,
            });
          },
          (error) => {
            console.warn('Dashboard metrics quota notice:', error);
            setMetrics(prev => ({ ...prev, loading: false }));
          }
        );
      } catch (error) {
        console.warn('Error fetching counts:', error);
        setMetrics(prev => ({ ...prev, loading: false }));
      }
    };

    fetchCounts();
    return () => unsubscribeMeetings();
  }, []);

  return metrics;
};
