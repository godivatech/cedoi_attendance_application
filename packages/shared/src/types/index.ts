export type UserRole = 'ADMIN' | 'STAFF';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

export type MeetingStatus = 'DRAFT' | 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

export interface Meeting {
  id: string;
  title: string;
  description: string;
  venue: string;
  date: string;
  startTime: string;
  endTime: string;
  entryFee: number;
  maxCapacity: number;
  status: MeetingStatus;
  metrics: {
    totalAttendees: number;
    totalCollected: number;
  };
}

export type PaymentStatus = 'PAID' | 'PENDING' | 'WAIVED' | 'PARTIAL' | 'ABSENT';
export type PaymentMode = 'CASH' | 'UPI' | 'CARD' | 'COMPLIMENTARY';

export interface Member {
  id: string;
  fullName: string;
  companyName: string;
  mobileNumber: string;
  email: string;
  businessCategory: string;
  city: string;
  membershipType: string;
  joinDate: string;
  notes?: string;
  profilePhotoUrl?: string;
  searchKeywords: string[];
}

export interface Attendance {
  id: string; // Member ID
  memberId: string;
  memberSnapshot: {
    fullName: string;
    companyName: string;
  };
  checkInTime: any; // Firestore Timestamp or ISO string
  paymentStatus: PaymentStatus;
  paymentMode?: PaymentMode;
  amountCollected: number;
  checkedInBy: string; // User UID
  isAbsent?: boolean;
}
