import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, ScrollView, StyleSheet, TextInput, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../src/services/firebase';
import { Member, PaymentMode, PaymentStatus } from '@cedoi/shared';
import { useAttendanceActions } from '../../src/modules/attendance/useAttendance';
import {
  UserCheck, UserX, Banknote, CreditCard, ChevronLeft, Clock, Phone, Briefcase, AlertCircle, Edit2
} from 'lucide-react-native';
import { showAlert } from '../../src/utils/platformAlert';

export default function MemberDetailScreen() {
  const { memberId, meetingId } = useLocalSearchParams<{ memberId: string; meetingId: string }>();
  const [member, setMember] = useState<Member | null>(null);
  const [meetingFee, setMeetingFee] = useState<number>(500);
  const [meetingTitle, setMeetingTitle] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Store the live loaded attendance record for this member
  const [attendance, setAttendance] = useState<{
    paymentStatus: PaymentStatus;
    paymentMode?: PaymentMode;
    amountCollected: number;
    checkInTime?: any;
  } | null>(null);

  const { markAttendance, processing } = useAttendanceActions(meetingId);
  const router = useRouter();

  // Time editing modal states
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [selectedHour, setSelectedHour] = useState('12');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedAmPm, setSelectedAmPm] = useState('PM');

  const handleOpenTimeEditor = () => {
    if (!attendance || !attendance.checkInTime) return;
    const date = attendance.checkInTime.toDate ? attendance.checkInTime.toDate() : new Date(attendance.checkInTime);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    
    setSelectedHour(hours.toString());
    setSelectedMinute(minutes.toString().padStart(2, '0'));
    setSelectedAmPm(ampm);
    setIsEditingTime(true);
  };

  const handleSaveTime = async () => {
    if (!member || !attendance) return;
    
    const hr = parseInt(selectedHour);
    const min = parseInt(selectedMinute);
    
    if (isNaN(hr) || hr < 1 || hr > 12) {
      showAlert('Error', 'Please enter a valid hour (1-12)');
      return;
    }
    if (isNaN(min) || min < 0 || min > 59) {
      showAlert('Error', 'Please enter a valid minute (0-59)');
      return;
    }

    try {
      const baseDate = attendance.checkInTime?.toDate ? attendance.checkInTime.toDate() : new Date();
      
      let adjustedHour = hr;
      const isPm = selectedAmPm === 'PM';
      if (isPm && hr < 12) {
        adjustedHour += 12;
      } else if (!isPm && hr === 12) {
        adjustedHour = 0;
      }
      
      baseDate.setHours(adjustedHour);
      baseDate.setMinutes(min);
      baseDate.setSeconds(0);
      baseDate.setMilliseconds(0);

      const attendanceRef = doc(db, `meetings/${meetingId}/attendance`, memberId);
      await updateDoc(attendanceRef, {
        checkInTime: baseDate
      });
      
      setToast('Check-in time updated');
      setIsEditingTime(false);
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    let unsubAttendance = () => { };

    const fetchData = async () => {
      try {
        const memberRef = doc(db, 'members', memberId);
        const memberSnap = await getDoc(memberRef);
        if (memberSnap.exists()) {
          setMember({ id: memberSnap.id, ...memberSnap.data() } as Member);
        }

        if (meetingId) {
          const meetingRef = doc(db, 'meetings', meetingId);
          const meetingSnap = await getDoc(meetingRef);
          if (meetingSnap.exists()) {
            const d = meetingSnap.data();
            setMeetingFee(d.entryFee ?? 500);
            setMeetingTitle(d.title || '');
          }

          // Live listen to this member's attendance status
          const attendanceRef = doc(db, `meetings/${meetingId}/attendance`, memberId);
          unsubAttendance = onSnapshot(attendanceRef, (docSnap) => {
            if (docSnap.exists()) {
              const attData = docSnap.data();
              setAttendance({
                paymentStatus: attData.paymentStatus,
                paymentMode: attData.paymentMode,
                amountCollected: attData.amountCollected || 0,
                checkInTime: attData.checkInTime
              });
            } else {
              setAttendance(null);
            }
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    return () => unsubAttendance();
  }, [memberId, meetingId]);

  const handleSetAttendance = async (status: 'PRESENT' | 'ABSENT') => {
    if (!member) return;
    try {
      if (status === 'ABSENT') {
        await markAttendance(member, 'ABSENT', undefined, 0, attendance);
        setToast('Marked as Absent');
      } else {
        // Mark as Present with default PENDING payment status (if not already present)
        if (!attendance || attendance.paymentStatus === 'ABSENT') {
          await markAttendance(member, 'PENDING', undefined, 0, attendance);
          setToast('Marked as Present');
        }
      }
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const handleUpdatePayment = async (status: PaymentStatus, mode?: PaymentMode, amount: number = 0) => {
    if (!member) return;
    try {
      await markAttendance(member, status, mode, amount, attendance);
      setToast('Payment status updated');
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) {
      return '';
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (!member) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ color: '#94a3b8', fontWeight: '600' }}>Member not found</Text>
      </View>
    );
  }

  // Derived attendance values
  const isMarked = attendance !== null;
  const isAbsent = isMarked && attendance.paymentStatus === 'ABSENT';
  const isPresent = isMarked && attendance.paymentStatus !== 'ABSENT';

  // Format a friendly Status text
  let statusText = 'Not Checked In';
  let statusBadgeStyle = styles.badgeUnmarked;
  let statusTextStyle = styles.textUnmarked;

  if (isMarked) {
    if (isAbsent) {
      statusText = 'Marked Absent';
      statusBadgeStyle = styles.badgeAbsent;
      statusTextStyle = styles.textAbsent;
    } else {
      const modeText = attendance.paymentMode ? ` via ${attendance.paymentMode}` : '';
      if (attendance.paymentStatus === 'PAID') {
        statusText = `Present · Paid${modeText}`;
        statusBadgeStyle = styles.badgePaid;
        statusTextStyle = styles.textPaid;
      } else if (attendance.paymentStatus === 'WAIVED') {
        statusText = 'Present · Complimentary / Waived';
        statusBadgeStyle = styles.badgeWaived;
        statusTextStyle = styles.textWaived;
      } else {
        statusText = 'Present · Payment Pending';
        statusBadgeStyle = styles.badgePending;
        statusTextStyle = styles.textPending;
      }
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, backgroundColor: '#f8fafc' }} contentContainerStyle={{ padding: 20 }}>
        {/* Back button */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}
        >
          <ChevronLeft size={18} color="#4f46e5" />
          <Text style={{ color: '#4f46e5', fontWeight: '600', fontSize: 14, marginLeft: 4 }}>
            Back to Members
          </Text>
        </TouchableOpacity>

        {/* Member Info Card */}
        <View style={{ backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#f1f5f9', padding: 20, marginBottom: 16, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#4f46e5' }}>{member.fullName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>{member.fullName}</Text>
              <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '500', marginTop: 2 }}>{member.companyName}</Text>
            </View>
          </View>

          <View style={{ borderTopWidth: 1, borderColor: '#f8fafc', gap: 8, paddingTop: 12, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Phone size={14} color="#94a3b8" />
              <Text style={{ fontSize: 13, color: '#64748b', marginLeft: 8 }}>{member.mobileNumber}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Briefcase size={14} color="#94a3b8" />
              <Text style={{ fontSize: 13, color: '#64748b', marginLeft: 8 }}>{member.businessCategory}</Text>
            </View>
            {member.notes ? (
              <View style={{ borderTopWidth: 1, borderColor: '#f1f5f9', paddingTop: 12, marginTop: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                  Notes / Instructions
                </Text>
                <Text style={{ fontSize: 13, color: '#334155', fontStyle: 'italic', lineHeight: 18 }}>
                  "{member.notes}"
                </Text>
              </View>
            ) : null}
          </View>

          {/* Current status display badge */}
          <View style={[styles.statusBadgeBase, statusBadgeStyle]}>
            <Text style={[styles.statusBadgeText, statusTextStyle]}>{statusText}</Text>
          </View>

          {/* Time Badge (Only for present members) */}
          {isPresent && attendance?.checkInTime ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleOpenTimeEditor}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, gap: 6 }}
            >
              <Clock size={14} color="#64748b" />
              <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600' }}>
                Checked in at {formatTime(attendance.checkInTime)}
              </Text>
              <Edit2 size={12} color="#4f46e5" style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* SECTION 1: Attendance Controls */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 12 }}>1. Attendance Status</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {/* Present Option Toggle */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSetAttendance('PRESENT')}
              style={[
                styles.choiceBtn,
                isPresent ? styles.choiceBtnPresentActive : styles.choiceBtnInactive
              ]}
            >
              <UserCheck size={18} color={isPresent ? '#059669' : '#94a3b8'} />
              <Text style={[styles.choiceBtnText, isPresent ? styles.choiceBtnTextPresentActive : styles.choiceBtnTextInactive]}>
                Present
              </Text>
            </TouchableOpacity>

            {/* Absent Option Toggle */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSetAttendance('ABSENT')}
              style={[
                styles.choiceBtn,
                isAbsent ? styles.choiceBtnAbsentActive : styles.choiceBtnInactive
              ]}
            >
              <UserX size={18} color={isAbsent ? '#ef4444' : '#94a3b8'} />
              <Text style={[styles.choiceBtnText, isAbsent ? styles.choiceBtnTextAbsentActive : styles.choiceBtnTextInactive]}>
                Absent
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SECTION 2: Payment Option Grid (Only interactable if present) */}
        <View>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 4 }}>2. Payment Mode</Text>
          <Text style={{ fontSize: 12, color: '#94a3b8', marginBottom: 14 }}>
            {isPresent
              ? `Manage entry fee (₹${meetingFee}) details below:`
              : 'Mark member as Present to configure payment mode.'}
          </Text>

          <View style={{ opacity: isPresent ? 1 : 0.45 }} pointerEvents={isPresent ? 'auto' : 'none'}>
            {/* Option cards */}
            <View style={{ gap: 10 }}>
              {/* Cash */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleUpdatePayment('PAID', 'CASH', meetingFee)}
                style={[
                  styles.payCard,
                  (isPresent && attendance?.paymentStatus === 'PAID' && attendance?.paymentMode === 'CASH') ? styles.payCardCashActive : styles.payCardInactive
                ]}
              >
                <View style={[styles.payCardIconBg, { backgroundColor: '#e6f4ea' }]}>
                  <Banknote size={20} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.payCardTitle}>Paid – Cash</Text>
                  <Text style={styles.payCardSub}>Collected ₹{meetingFee} in cash</Text>
                </View>
              </TouchableOpacity>

              {/* UPI */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleUpdatePayment('PAID', 'UPI', meetingFee)}
                style={[
                  styles.payCard,
                  (isPresent && attendance?.paymentStatus === 'PAID' && attendance?.paymentMode === 'UPI') ? styles.payCardUPIActive : styles.payCardInactive
                ]}
              >
                <View style={[styles.payCardIconBg, { backgroundColor: '#f5f3ff' }]}>
                  <CreditCard size={20} color="#7c3aed" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.payCardTitle}>Paid – UPI / Online</Text>
                  <Text style={styles.payCardSub}>Paid online/UPI directly</Text>
                </View>
              </TouchableOpacity>

              {/* Pending */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleUpdatePayment('PENDING', undefined, 0)}
                style={[
                  styles.payCard,
                  (isPresent && attendance?.paymentStatus === 'PENDING') ? styles.payCardPendingActive : styles.payCardInactive
                ]}
              >
                <View style={[styles.payCardIconBg, { backgroundColor: '#fff7ed' }]}>
                  <Clock size={20} color="#ea580c" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.payCardTitle}>Keep Pending</Text>
                  <Text style={styles.payCardSub}>Checked in, payment remaining</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {processing ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, gap: 8 }}>
            <ActivityIndicator size="small" color="#4f46e5" />
            <Text style={{ color: '#64748b', fontSize: 13, fontWeight: '600' }}>Saving changes...</Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, gap: 6 }}>
            <Text style={{ color: '#059669', fontSize: 13, fontWeight: '600' }}>✓ Changes saved automatically</Text>
          </View>
        )}

        {/* Done / Save & Close Button */}
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.8}
          style={{
            backgroundColor: '#4f46e5',
            borderRadius: 14,
            height: 52,
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 24,
            marginBottom: 20,
            shadowColor: '#4f46e5',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
            Done
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Time Modal */}
      <Modal
        visible={isEditingTime}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsEditingTime(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 320, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 16, textAlign: 'center' }}>
              Edit Check-in Time
            </Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 24, gap: 10 }}>
              {/* Hour Input */}
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8', marginBottom: 4 }}>HOUR</Text>
                <TextInput
                  value={selectedHour}
                  onChangeText={(txt) => {
                    const sanitized = txt.replace(/[^0-9]/g, '');
                    const num = parseInt(sanitized);
                    if (!sanitized || (num >= 1 && num <= 12)) {
                      setSelectedHour(sanitized);
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={2}
                  style={{ width: 60, height: 50, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, textAlign: 'center', fontSize: 18, fontWeight: '700', color: '#1e293b' }}
                />
              </View>
              
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#cbd5e1', marginTop: 16 }}>:</Text>
              
              {/* Minute Input */}
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8', marginBottom: 4 }}>MINUTE</Text>
                <TextInput
                  value={selectedMinute}
                  onChangeText={(txt) => {
                    const sanitized = txt.replace(/[^0-9]/g, '');
                    const num = parseInt(sanitized);
                    if (!sanitized || (num >= 0 && num <= 59)) {
                      setSelectedMinute(sanitized);
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={2}
                  style={{ width: 60, height: 50, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, textAlign: 'center', fontSize: 18, fontWeight: '700', color: '#1e293b' }}
                />
              </View>

              {/* AM/PM Toggle */}
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8', marginBottom: 4 }}>AM/PM</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setSelectedAmPm(prev => prev === 'AM' ? 'PM' : 'AM')}
                  style={{ width: 60, height: 50, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#475569' }}>{selectedAmPm}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setIsEditingTime(false)}
                style={{ flex: 1, height: 48, backgroundColor: '#f1f5f9', borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}
              >
                <Text style={{ fontWeight: '600', color: '#475569', fontSize: 14 }}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleSaveTime}
                style={{ flex: 1, height: 48, backgroundColor: '#4f46e5', borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}
              >
                <Text style={{ fontWeight: '700', color: '#fff', fontSize: 14 }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {toast && (
        <View style={{
          position: 'absolute',
          bottom: 30,
          left: 20,
          right: 20,
          backgroundColor: '#0f172a',
          borderRadius: 12,
          paddingVertical: 14,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
          elevation: 6,
          zIndex: 9999,
        }}>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
            {toast}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  statusBadgeBase: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: '800',
  },
  badgeUnmarked: {
    backgroundColor: '#f1f5f9',
  },
  textUnmarked: {
    color: '#475569',
  },
  badgeAbsent: {
    backgroundColor: '#fef2f2',
  },
  textAbsent: {
    color: '#ef4444',
  },
  badgePaid: {
    backgroundColor: '#e6f4ea',
  },
  textPaid: {
    color: '#059669',
  },
  badgeWaived: {
    backgroundColor: '#eff6ff',
  },
  textWaived: {
    color: '#1d4ed8',
  },
  badgePending: {
    backgroundColor: '#fff7ed',
  },
  textPending: {
    color: '#ea580c',
  },

  choiceBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  choiceBtnInactive: {
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  choiceBtnTextInactive: {
    color: '#64748b',
  },
  choiceBtnPresentActive: {
    borderColor: '#059669',
    backgroundColor: '#e6f4ea',
  },
  choiceBtnTextPresentActive: {
    color: '#059669',
  },
  choiceBtnAbsentActive: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  choiceBtnTextAbsentActive: {
    color: '#ef4444',
  },
  choiceBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },

  payCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 14,
  },
  payCardInactive: {
    borderColor: '#f1f5f9',
    backgroundColor: '#fff',
  },
  payCardCashActive: {
    borderColor: '#059669',
    backgroundColor: '#f0fdf4',
  },
  payCardUPIActive: {
    borderColor: '#7c3aed',
    backgroundColor: '#f5f3ff',
  },
  payCardPendingActive: {
    borderColor: '#ea580c',
    backgroundColor: '#fff7ed',
  },
  payCardIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
  },
  payCardSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
});
