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
    // Total Members Count
    const fetchCounts = async () => {
      const membersColl = collection(db, 'members');
      const meetingsColl = collection(db, 'meetings');
      
      const membersCount = await getCountFromServer(membersColl);
      const meetingsCount = await getCountFromServer(meetingsColl);

      // Simple revenue aggregation from meeting metrics
      const unsubscribeMeetings = onSnapshot(meetingsColl, (snapshot) => {
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
      });

      return () => unsubscribeMeetings();
    };

    fetchCounts();
  }, []);

  return metrics;
};
