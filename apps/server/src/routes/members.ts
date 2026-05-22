import { Router } from 'express';
import { authenticate, authorizeAdmin } from '../middleware/auth';
import { db } from '../services/firebase';

const router = Router();

// Bulk import members (Admin only)
router.post('/import', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { members } = req.body;
    if (!Array.isArray(members)) {
      return res.status(400).json({ error: 'Invalid input: members must be an array' });
    }

    const batch = db.batch();
    members.forEach((member: any) => {
      const memberRef = db.collection('members').doc();
      // Generate search keywords for fast client-side filtering
      const searchKeywords = [
        ...member.fullName.toLowerCase().split(' '),
        ...member.companyName.toLowerCase().split(' '),
        member.mobileNumber
      ];
      
      batch.set(memberRef, {
        ...member,
        searchKeywords,
        createdAt: new Date().toISOString()
      });
    });

    await batch.commit();
    res.json({ success: true, count: members.length });
  } catch (error: any) {
    console.error('Error importing members:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
