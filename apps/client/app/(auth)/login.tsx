import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../src/services/firebase';
import { showAlert } from '../../src/utils/platformAlert';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { Mail, Lock } from 'lucide-react-native';
import { Card } from '../../src/components/ui/Card';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const { user, role } = useAuthStore();
  const router = useRouter();
  
  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    }
  });

  useEffect(() => {
    if (user) {
      console.log('[Login] Redirecting user with role:', role);
      if (role === 'ADMIN') {
        router.replace('/(admin)/dashboard');
      } else {
        router.replace('/(staff)/today');
      }
    }
  }, [user, role]);

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
    } catch (error: any) {
      showAlert('Login Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
      className="justify-center items-center p-4"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} className="w-full max-w-md">
        <Card className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100 w-full my-8">
          
          {/* Logo & Header */}
          <View className="items-center mb-8">
            <View className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4">
              <Text className="text-white font-black text-2xl">C</Text>
            </View>
            <Text className="text-2xl font-black text-slate-800 tracking-tight">CEDOI Platform</Text>
            <Text className="text-slate-400 text-xs font-semibold uppercase tracking-widest mt-1">
              Meeting Management
            </Text>
          </View>

          {/* Form */}
          <View className="space-y-4">
            
            {/* Email Field */}
            <View>
              <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email</Text>
              <View className="relative flex-row items-center">
                <View className="absolute left-4 z-10">
                  <Mail size={18} color="#94a3b8" />
                </View>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className={`flex-1 pl-12 pr-4 py-3.5 bg-slate-50 border text-slate-800 rounded-xl text-sm ${
                        errors.email ? 'border-red-500' : 'border-slate-200 focus:border-blue-500'
                      }`}
                      placeholder="name@company.com"
                      placeholderTextColor="#94a3b8"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  )}
                />
              </View>
              {errors.email && (
                <Text className="text-red-500 text-xs mt-1.5 ml-1 font-medium">{errors.email.message}</Text>
              )}
            </View>

            {/* Password Field */}
            <View className="mt-4">
              <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Password</Text>
              <View className="relative flex-row items-center">
                <View className="absolute left-4 z-10">
                  <Lock size={18} color="#94a3b8" />
                </View>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className={`flex-1 pl-12 pr-4 py-3.5 bg-slate-50 border text-slate-800 rounded-xl text-sm ${
                        errors.password ? 'border-red-500' : 'border-slate-200 focus:border-blue-500'
                      }`}
                      placeholder="••••••••"
                      placeholderTextColor="#94a3b8"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      secureTextEntry
                    />
                  )}
                />
              </View>
              {errors.password && (
                <Text className="text-red-500 text-xs mt-1.5 ml-1 font-medium">{errors.password.message}</Text>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              className="bg-blue-600 hover:bg-blue-700 p-4 rounded-xl flex-row justify-center items-center mt-6 shadow-md shadow-blue-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 active:opacity-90"
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="color-white font-extrabold text-base">Sign In</Text>
              )}
            </TouchableOpacity>
          </View>
        </Card>

        {/* Footer */}
        <Text className="text-center text-xs font-bold text-slate-400 tracking-wider">
          GODIVATECH © 2026
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
