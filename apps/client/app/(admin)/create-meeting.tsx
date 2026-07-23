import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, ActivityIndicator, Platform } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../src/services/firebase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { showAlert } from '../../src/utils/platformAlert';

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;

  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const ampm = match[3].toUpperCase();

  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}


function determineMeetingStatus(date: string, startTime: string, endTime: string): 'SCHEDULED' | 'ONGOING' | 'COMPLETED' {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  const currentTimeStr = timeFormatter.format(now);
  const currentMinutes = parseTimeToMinutes(currentTimeStr);
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);

  if (date < todayStr) {
    return 'COMPLETED';
  } else if (date === todayStr) {
    if (currentMinutes >= endMinutes) {
      return 'COMPLETED';
    } else if (currentMinutes >= startMinutes) {
      return 'ONGOING';
    } else {
      return 'SCHEDULED';
    }
  } else {
    return 'SCHEDULED';
  }
}

function getDefaultTimes() {
  const now = new Date();
  const start = new Date(now);
  // Round to next hour
  start.setHours(now.getHours() + 1, 0, 0, 0);

  const end = new Date(start);
  end.setHours(start.getHours() + 2);

  const formatTime12 = (d: Date) => {
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  };

  return {
    startTime: formatTime12(start),
    endTime: formatTime12(end)
  };
}

export default function CreateMeetingScreen() {
  const router = useRouter();
  const { meetingId } = useLocalSearchParams<{ meetingId?: string }>();
  const isEditMode = !!meetingId;
  const [initialLoading, setInitialLoading] = useState(isEditMode);

  const defaultTimes = getDefaultTimes();

  const { control, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm({
    defaultValues: {
      title: '',
      venue: 'Marriott Madurai',
      date: new Date().toISOString().split('T')[0],
      startTime: defaultTimes.startTime,
      endTime: defaultTimes.endTime,
      entryFee: '500',
      maxCapacity: '100',
      description: '',
    }
  });

  useEffect(() => {
    if (isEditMode && meetingId) {
      const fetchMeeting = async () => {
        try {
          const docRef = doc(db, 'meetings', meetingId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            reset({
              title: data.title || '',
              venue: data.venue || 'Marriott Madurai',
              date: data.date || '',
              startTime: data.startTime || '08:00 AM',
              endTime: data.endTime || '10:00 AM',
              entryFee: String(data.entryFee || 500),
              maxCapacity: String(data.maxCapacity || 100),
              description: data.description || '',
            });
          }
        } catch (error) {
          console.error(error);
        } finally {
          setInitialLoading(false);
        }
      };
      fetchMeeting();
    }
  }, [meetingId, isEditMode]);

  const onSubmit = async (data: any) => {
    try {
      // Validate time formats
      const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s*(AM|PM)$/i;
      if (!timeRegex.test(data.startTime)) {
        showAlert('Validation Error', `Start time "${data.startTime}" must be in HH:MM AM/PM format (e.g., 08:00 AM).`);
        return;
      }
      if (!timeRegex.test(data.endTime)) {
        showAlert('Validation Error', `End time "${data.endTime}" must be in HH:MM AM/PM format (e.g., 10:00 AM).`);
        return;
      }

      const startMins = parseTimeToMinutes(data.startTime);
      const endMins = parseTimeToMinutes(data.endTime);

      if (endMins <= startMins) {
        showAlert('Validation Error', `Meeting end time (${data.endTime}) must be after the start time (${data.startTime}).`);
        return;
      }

      // Check for past date/time validation
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      const timeFormatter = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      const currentTimeStr = timeFormatter.format(now);
      const currentMinutes = parseTimeToMinutes(currentTimeStr);

      if (data.date < todayStr) {
        showAlert('Validation Error', `Cannot schedule a meeting on a past date. Selected date: ${data.date}, current date is: ${todayStr}.`);
        return;
      }

      if (data.date === todayStr && endMins <= currentMinutes) {
        showAlert('Validation Error', `Cannot schedule a meeting that has already ended. Selected time is ${data.startTime} - ${data.endTime}, but current local time is ${currentTimeStr}.`);
        return;
      }

      const computedStatus = determineMeetingStatus(data.date, data.startTime, data.endTime);
      const payload = {
        ...data,
        entryFee: parseInt(data.entryFee) || 0,
        maxCapacity: parseInt(data.maxCapacity) || 0,
        status: computedStatus,
      };

      if (isEditMode && meetingId) {
        const docRef = doc(db, 'meetings', meetingId);
        await updateDoc(docRef, payload);
        showAlert('Success', 'Meeting updated successfully', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        await addDoc(collection(db, 'meetings'), {
          ...payload,
          metrics: { totalAttendees: 0, totalCollected: 0 }
        });
        showAlert('Success', 'Meeting created successfully', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const onInvalid = (formErrors: any) => {
    const firstError = Object.values(formErrors)[0] as any;
    if (firstError) {
      showAlert('Validation Error', firstError.message || 'Please check the required fields.');
    }
  };

  if (initialLoading) {
    return (
      <View style={{ backgroundColor: '#f8fafc' }} className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: '#f8fafc' }}
      className="flex-1"
      contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ maxWidth: 880, width: '100%', alignSelf: 'center' }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#0d5984', marginBottom: 24 }}>
          {isEditMode ? 'Edit Meeting Details' : 'Create New Meeting'}
        </Text>

        <Card className="space-y-5 mb-10 p-8 bg-white border border-slate-100 rounded-2xl shadow-sm">
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 }}>Title</Text>
            <Controller
              control={control}
              name="title"
              rules={{ required: "Meeting title is required" }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={{ height: 48, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, fontSize: 14, color: '#1e293b' }}
                  placeholder="Enter meeting title"
                  placeholderTextColor="#94a3b8"
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.title && (
              <Text className="text-rose-500 text-xs mt-1.5 font-medium">{errors.title.message}</Text>
            )}
          </View>

          {/* Row 1: Date & Entry Fee */}
          <View style={{ flexDirection: Platform.OS === 'web' ? 'row' : 'column', gap: 16, marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 }}>Date</Text>
              <Controller
                control={control}
                name="date"
                rules={{ required: "Date is required" }}
                render={({ field: { onChange, value } }) => (
                  Platform.OS === 'web' ? (
                    <input
                      type="date"
                      style={{
                        padding: '0 16px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        color: '#1e293b',
                        fontSize: '14px',
                        height: '48px',
                        outline: 'none',
                        fontFamily: 'inherit',
                        width: '100%',
                        boxSizing: 'border-box',
                        cursor: 'pointer'
                      }}
                      onClick={(e: any) => { try { e.currentTarget.showPicker?.(); } catch (err) { } }}
                      onChange={(e) => onChange(e.target.value)}
                      value={value || ''}
                    />
                  ) : (
                    <TextInput
                      style={{ height: 48, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, fontSize: 14, color: '#1e293b' }}
                      placeholder="Enter date (YYYY-MM-DD)"
                      placeholderTextColor="#94a3b8"
                      onChangeText={onChange}
                      value={value}
                    />
                  )
                )}
              />
              {errors.date && (
                <Text className="text-rose-500 text-xs mt-1.5 font-medium">{errors.date.message}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 }}>Entry Fee (₹)</Text>
              <Controller
                control={control}
                name="entryFee"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={{ height: 48, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, fontSize: 14, color: '#1e293b' }}
                    keyboardType="numeric"
                    placeholder="Enter entry fee amount"
                    placeholderTextColor="#94a3b8"
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
            </View>
          </View>

          {/* Row 2: Start Time & End Time */}
          <View style={{ flexDirection: Platform.OS === 'web' ? 'row' : 'column', gap: 16, marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 }}>Start Time</Text>
              <Controller
                control={control}
                name="startTime"
                rules={{ required: "Start time is required" }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={{ flex: 1, width: '100%', height: 48, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, fontSize: 14, color: '#1e293b' }}
                    placeholder="e.g., 08:30 AM"
                    placeholderTextColor="#94a3b8"
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.startTime && (
                <Text className="text-rose-500 text-xs mt-1.5 font-medium">{errors.startTime.message}</Text>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 }}>End Time</Text>
              <Controller
                control={control}
                name="endTime"
                rules={{ required: "End time is required" }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={{ flex: 1, width: '100%', height: 48, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, fontSize: 14, color: '#1e293b' }}
                    placeholder="e.g., 11:30 AM"
                    placeholderTextColor="#94a3b8"
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.endTime && (
                <Text className="text-rose-500 text-xs mt-1.5 font-medium">{errors.endTime.message}</Text>
              )}
            </View>
          </View>

          {/* Row 3: Maximum Capacity & Venue */}
          <View style={{ flexDirection: Platform.OS === 'web' ? 'row' : 'column', gap: 16, marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 }}>Maximum Capacity</Text>
              <Controller
                control={control}
                name="maxCapacity"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={{ height: 48, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, fontSize: 14, color: '#1e293b' }}
                    keyboardType="numeric"
                    placeholder="Enter maximum capacity"
                    placeholderTextColor="#94a3b8"
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 }}>Venue</Text>
              <Controller
                control={control}
                name="venue"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={{ height: 48, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, fontSize: 14, color: '#1e293b' }}
                    placeholder="Enter meeting venue"
                    placeholderTextColor="#94a3b8"
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
            </View>
          </View>

          {/* Row 4: Description */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 }}>Description</Text>
            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={{ minHeight: 90, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 14, color: '#1e293b', textAlignVertical: 'top' }}
                  placeholder="Enter meeting description or agenda"
                  placeholderTextColor="#94a3b8"
                  multiline={true}
                  numberOfLines={3}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
          </View>

          <Button
            label="Save Meeting"
            onPress={handleSubmit(onSubmit, onInvalid)}
            loading={isSubmitting}
            className="mt-4"
          />
        </Card>
      </View>
    </ScrollView>
  );
}
