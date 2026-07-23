import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { memberSchema, MemberFormValues, generateSearchKeywords } from '@cedoi/shared';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../src/services/firebase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { showAlert } from '../../src/utils/platformAlert';

export default function AddMemberScreen() {
  const router = useRouter();
  const { memberId } = useLocalSearchParams<{ memberId?: string }>();
  const isEditMode = !!memberId;
  const [initialLoading, setInitialLoading] = useState(isEditMode);

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      fullName: '',
      companyName: '',
      mobileNumber: '',
      email: '',
      businessCategory: '',
      city: 'Madurai',
      joinDate: new Date().toISOString().split('T')[0],
      notes: '',
    }
  });

  useEffect(() => {
    if (isEditMode && memberId) {
      const fetchMember = async () => {
        try {
          const docRef = doc(db, 'members', memberId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            reset({
              fullName: data.fullName || '',
              companyName: data.companyName || '',
              mobileNumber: data.mobileNumber || '',
              email: data.email || '',
              businessCategory: data.businessCategory || '',
              city: data.city || 'Madurai',
              joinDate: data.joinDate || new Date().toISOString().split('T')[0],
              notes: data.notes || '',
            });
          }
        } catch (error) {
          console.error(error);
        } finally {
          setInitialLoading(false);
        }
      };
      fetchMember();
    }
  }, [memberId, isEditMode]);

  const onSubmit = async (data: MemberFormValues) => {
    try {
      const searchKeywords = generateSearchKeywords(
        data.fullName,
        data.companyName,
        data.mobileNumber
      );

      if (isEditMode && memberId) {
        const docRef = doc(db, 'members', memberId);
        await updateDoc(docRef, {
          ...data,
          searchKeywords
        });
        showAlert('Success', 'Member profile updated successfully', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        await addDoc(collection(db, 'members'), {
          ...data,
          searchKeywords,
          createdAt: serverTimestamp()
        });
        showAlert('Success', 'Member registered successfully', [
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
          {isEditMode ? 'Edit Member Profile' : 'Register New Member'}
        </Text>
        
        <Card className="space-y-5 mb-10 p-8 bg-white border border-slate-100 rounded-2xl shadow-sm">
        <View>
          <Text className="text-sm font-bold text-slate-600 mb-1.5">Full Name</Text>
          <Controller
            control={control}
            name="fullName"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className={`p-4 bg-slate-50 border rounded-xl text-slate-800 text-sm ${errors.fullName ? 'border-red-500' : 'border-slate-200'}`}
                placeholder="Enter full name"
                placeholderTextColor="#94a3b8"
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.fullName && (
            <Text className="text-rose-500 text-xs mt-1.5 font-medium">{errors.fullName.message}</Text>
          )}
        </View>

        <View>
          <Text className="text-sm font-bold text-slate-600 mb-1.5">Company Name</Text>
          <Controller
            control={control}
            name="companyName"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className={`p-4 bg-slate-50 border rounded-xl text-slate-800 text-sm ${errors.companyName ? 'border-red-500' : 'border-slate-200'}`}
                placeholder="Enter company name"
                placeholderTextColor="#94a3b8"
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.companyName && (
            <Text className="text-rose-500 text-xs mt-1.5 font-medium">{errors.companyName.message}</Text>
          )}
        </View>

        <View style={{ flexDirection: Platform.OS === 'web' ? 'row' : 'column', gap: 16, marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 }}>Mobile</Text>
            <Controller
              control={control}
              name="mobileNumber"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={{ height: 48, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: errors.mobileNumber ? '#ef4444' : '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, fontSize: 14, color: '#1e293b' }}
                  keyboardType="phone-pad"
                  placeholder="Enter mobile number"
                  placeholderTextColor="#94a3b8"
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.mobileNumber && (
              <Text className="text-rose-500 text-xs mt-1.5 font-medium">{errors.mobileNumber.message}</Text>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 }}>Category</Text>
            <Controller
              control={control}
              name="businessCategory"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={{ height: 48, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: errors.businessCategory ? '#ef4444' : '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, fontSize: 14, color: '#1e293b' }}
                  placeholder="Enter business category"
                  placeholderTextColor="#94a3b8"
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.businessCategory && (
              <Text className="text-rose-500 text-xs mt-1.5 font-medium">{errors.businessCategory.message}</Text>
            )}
          </View>
        </View>

        <View style={{ flexDirection: Platform.OS === 'web' ? 'row' : 'column', gap: 16, marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 }}>Email</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={{ height: 48, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: errors.email ? '#ef4444' : '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, fontSize: 14, color: '#1e293b' }}
                  keyboardType="email-address"
                  placeholder="Enter email address"
                  placeholderTextColor="#94a3b8"
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.email && (
              <Text className="text-rose-500 text-xs mt-1.5 font-medium">{errors.email.message}</Text>
            )}
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-slate-600 mb-1.5">City</Text>
            <Controller
              control={control}
              name="city"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  className={`p-4 bg-slate-50 border rounded-xl text-slate-800 text-sm ${errors.city ? 'border-red-500' : 'border-slate-200'}`}
                  placeholder="Enter city"
                  placeholderTextColor="#94a3b8"
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.city && (
              <Text className="text-rose-500 text-xs mt-1.5 font-medium">{errors.city.message}</Text>
            )}
          </View>
        </View>

        {/* Joining Date Field */}
        <View>
          <Text className="text-sm font-bold text-slate-600 mb-1.5">Joining Date (YYYY-MM-DD)</Text>
          <Controller
            control={control}
            name="joinDate"
            render={({ field: { onChange, value } }) => (
              Platform.OS === 'web' ? (
                <input
                  type="date"
                  min="2000-01-01"
                  max="2099-12-31"
                  value={value ? value.substring(0, 10) : ''}
                  onChange={(e) => onChange(e.target.value)}
                  style={{
                    padding: '14px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '12px',
                    fontSize: '14px',
                    color: '#1e293b',
                    width: '100%',
                    boxSizing: 'border-box',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              ) : (
                <TextInput
                  maxLength={10}
                  className={`p-4 bg-slate-50 border rounded-xl text-slate-800 text-sm ${errors.joinDate ? 'border-red-500' : 'border-slate-200'}`}
                  placeholder="YYYY-MM-DD (e.g. 2025-07-22)"
                  placeholderTextColor="#94a3b8"
                  onChangeText={onChange}
                  value={value}
                />
              )
            )}
          />
          {errors.joinDate && (
            <Text className="text-rose-500 text-xs mt-1.5 font-medium">{errors.joinDate.message}</Text>
          )}
        </View>


        <View>
          <Text className="text-sm font-bold text-slate-600 mb-1.5">Notes (Optional)</Text>
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm min-h-[60px]"
                placeholder="Enter notes or instructions"
                placeholderTextColor="#94a3b8"
                multiline={true}
                numberOfLines={2}
                onChangeText={onChange}
                value={value || ''}
              />
            )}
          />
        </View>

        <Button 
          label="Save Member" 
          onPress={handleSubmit(onSubmit, onInvalid)} 
          loading={isSubmitting}
          className="mt-4"
        />
      </Card>
    </View>
  </ScrollView>
);
}
