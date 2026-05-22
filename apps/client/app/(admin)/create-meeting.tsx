import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../src/services/firebase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { showAlert } from '../../src/utils/platformAlert';

export default function CreateMeetingScreen() {
  const router = useRouter();
  const { meetingId } = useLocalSearchParams<{ meetingId?: string }>();
  const isEditMode = !!meetingId;
  const [initialLoading, setInitialLoading] = useState(isEditMode);

  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: {
      title: '',
      venue: 'Marriott Madurai',
      date: new Date().toISOString().split('T')[0],
      startTime: '08:00 AM',
      endTime: '10:00 AM',
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
      const payload = {
        ...data,
        entryFee: parseInt(data.entryFee) || 0,
        maxCapacity: parseInt(data.maxCapacity) || 0,
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
          status: 'SCHEDULED',
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

  if (initialLoading) {
    return (
      <View style={{ backgroundColor: '#f8fafc' }} className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: '#f8fafc' }} className="flex-1 p-6">
      <Text className="text-2xl font-extrabold text-slate-800 mb-6">
        {isEditMode ? 'Edit Meeting Details' : 'Create New Meeting'}
      </Text>
      
      <Card className="space-y-4 mb-10 p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
        <View>
          <Text className="text-sm font-bold text-slate-600 mb-1.5">Title</Text>
          <Controller
            control={control}
            name="title"
            rules={{ required: true }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm"
                placeholder="Business Networking Meeting"
                placeholderTextColor="#94a3b8"
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </View>

        <View className="flex-row space-x-4">
          <View className="flex-1 mr-2">
            <Text className="text-sm font-bold text-slate-600 mb-1.5">Date</Text>
            <Controller
              control={control}
              name="date"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm"
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94a3b8"
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
          </View>
          <View className="flex-1 ml-2">
            <Text className="text-sm font-bold text-slate-600 mb-1.5">Entry Fee (₹)</Text>
            <Controller
              control={control}
              name="entryFee"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm"
                  keyboardType="numeric"
                  placeholder="500"
                  placeholderTextColor="#94a3b8"
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
          </View>
        </View>

        <View className="flex-row space-x-4">
          <View className="flex-1 mr-2">
            <Text className="text-sm font-bold text-slate-600 mb-1.5">Start Time</Text>
            <Controller
              control={control}
              name="startTime"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm"
                  placeholder="08:00 AM"
                  placeholderTextColor="#94a3b8"
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
          </View>
          <View className="flex-1 ml-2">
            <Text className="text-sm font-bold text-slate-600 mb-1.5">End Time</Text>
            <Controller
              control={control}
              name="endTime"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm"
                  placeholder="10:00 AM"
                  placeholderTextColor="#94a3b8"
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
          </View>
        </View>

        <View className="flex-row space-x-4">
          <View className="flex-1 mr-2">
            <Text className="text-sm font-bold text-slate-600 mb-1.5">Maximum Capacity</Text>
            <Controller
              control={control}
              name="maxCapacity"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm"
                  keyboardType="numeric"
                  placeholder="100"
                  placeholderTextColor="#94a3b8"
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
          </View>
          <View className="flex-1 ml-2">
            <Text className="text-sm font-bold text-slate-600 mb-1.5">Venue</Text>
            <Controller
              control={control}
              name="venue"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm"
                  placeholder="Marriott Madurai"
                  placeholderTextColor="#94a3b8"
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
          </View>
        </View>

        <View>
          <Text className="text-sm font-bold text-slate-600 mb-1.5">Description</Text>
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm min-h-[80px]"
                placeholder="Brief description of the meeting agenda..."
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
          onPress={handleSubmit(onSubmit)} 
          loading={isSubmitting}
          className="mt-4"
        />
      </Card>
    </ScrollView>
  );
}
