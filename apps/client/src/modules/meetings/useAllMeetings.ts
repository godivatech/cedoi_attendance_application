import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Meeting } from '@cedoi/shared';

export const useAllMeetings = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'meetings'), orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const meetingList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Meeting[];
        
        setMeetings(meetingList);
        setLoading(false);
      },
      (error) => {
        console.warn('Meetings query quota notice:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  return { meetings, loading };
};
