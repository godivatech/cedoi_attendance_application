import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
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
      membershipType: 'GUEST',
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
              membershipType: data.membershipType || 'GUEST',
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
        {isEditMode ? 'Edit Member Profile' : 'Register New Member'}
      </Text>
      
      <Card className="space-y-4 mb-10 p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
        <View>
          <Text className="text-sm font-bold text-slate-600 mb-1.5">Full Name</Text>
          <Controller
            control={control}
            name="fullName"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className={`p-4 bg-slate-50 border rounded-xl text-slate-800 text-sm ${errors.fullName ? 'border-red-500' : 'border-slate-200'}`}
                placeholder="John Doe"
                placeholderTextColor="#94a3b8"
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </View>

        <View>
          <Text className="text-sm font-bold text-slate-600 mb-1.5">Company Name</Text>
          <Controller
            control={control}
            name="companyName"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className={`p-4 bg-slate-50 border rounded-xl text-slate-800 text-sm ${errors.companyName ? 'border-red-500' : 'border-slate-200'}`}
                placeholder="Acme Corp"
                placeholderTextColor="#94a3b8"
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </View>

        <View className="flex-row space-x-4">
          <View className="flex-1 mr-2">
            <Text className="text-sm font-bold text-slate-600 mb-1.5">Mobile</Text>
            <Controller
              control={control}
              name="mobileNumber"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  className={`p-4 bg-slate-50 border rounded-xl text-slate-800 text-sm ${errors.mobileNumber ? 'border-red-500' : 'border-slate-200'}`}
                  keyboardType="phone-pad"
                  placeholder="9876543210"
                  placeholderTextColor="#94a3b8"
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
          </View>
          <View className="flex-1 ml-2">
            <Text className="text-sm font-bold text-slate-600 mb-1.5">Category</Text>
            <Controller
              control={control}
              name="businessCategory"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  className={`p-4 bg-slate-50 border rounded-xl text-slate-800 text-sm ${errors.businessCategory ? 'border-red-500' : 'border-slate-200'}`}
                  placeholder="Retail, Tech, etc."
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
            <Text className="text-sm font-bold text-slate-600 mb-1.5">Email</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  className={`p-4 bg-slate-50 border rounded-xl text-slate-800 text-sm ${errors.email ? 'border-red-500' : 'border-slate-200'}`}
                  keyboardType="email-address"
                  placeholder="john@example.com"
                  placeholderTextColor="#94a3b8"
                  onChangeText={onChange}
                  value={value || ''}
                />
              )}
            />
          </View>
          <View className="flex-1 ml-2">
            <Text className="text-sm font-bold text-slate-600 mb-1.5">City</Text>
            <Controller
              control={control}
              name="city"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  className={`p-4 bg-slate-50 border rounded-xl text-slate-800 text-sm ${errors.city ? 'border-red-500' : 'border-slate-200'}`}
                  placeholder="Madurai"
                  placeholderTextColor="#94a3b8"
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
          </View>
        </View>

        <View>
          <Text className="text-sm font-bold text-slate-600 mb-2">Membership Type</Text>
          <Controller
            control={control}
            name="membershipType"
            render={({ field: { onChange, value } }) => (
              <View className="flex-row space-x-2">
                {['PREMIUM', 'GOLD', 'SILVER', 'GUEST'].map((type) => {
                  const isSelected = value === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      onPress={() => onChange(type)}
                      className={`flex-1 p-3.5 rounded-xl border items-center justify-center transition-all duration-150 ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 shadow-sm'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Text
                        className={`text-xs font-extrabold tracking-wider ${
                          isSelected ? 'text-white' : 'text-slate-600'
                        }`}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          />
        </View>

        <View>
          <Text className="text-sm font-bold text-slate-600 mb-1.5">Notes (Optional)</Text>
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm min-h-[60px]"
                placeholder="Any special requests or instructions..."
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
          onPress={handleSubmit(onSubmit)} 
          loading={isSubmitting}
          className="mt-4"
        />
      </Card>
    </ScrollView>
  );
}
