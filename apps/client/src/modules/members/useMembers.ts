import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Member } from '@cedoi/shared';

export const useMembers = (searchTerm: string = '') => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'members'),
      orderBy('fullName'),
      limit(100) // Initial limit for performance
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const memberList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Member[];
      
      setMembers(memberList);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const filteredMembers = members.filter(member => {
    if (!searchTerm) return true;
    const lowerSearch = searchTerm.toLowerCase();
    return (
      member.fullName.toLowerCase().includes(lowerSearch) ||
      member.companyName.toLowerCase().includes(lowerSearch) ||
      member.mobileNumber.includes(lowerSearch)
    );
  });

  return { members: filteredMembers, loading };
};
