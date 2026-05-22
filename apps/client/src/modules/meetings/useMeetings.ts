import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, where, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Meeting } from '@cedoi/shared';

export const useUpcomingMeetings = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Order by date ascending (single field query) to avoid composite index requirements
    const q = query(
      collection(db, 'meetings'),
      orderBy('date', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allMeetings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Meeting[];
      
      // Filter status in client memory
      const upcoming = allMeetings.filter(m => 
        m.status === 'SCHEDULED' || m.status === 'ONGOING'
      );
      
      setMeetings(upcoming);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching upcoming meetings:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { meetings, loading };
};

export const useOngoingMeeting = () => {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'meetings'),
      where('status', '==', 'ONGOING'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setMeeting({
          id: snapshot.docs[0].id,
          ...snapshot.docs[0].data()
        } as Meeting);
      } else {
        setMeeting(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { meeting, loading };
};
