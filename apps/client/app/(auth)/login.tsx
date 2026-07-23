import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../src/services/firebase';
import { showAlert } from '../../src/utils/platformAlert';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { Mail, Lock, Key, Shield, UserCheck } from 'lucide-react-native';
import { Card } from '../../src/components/ui/Card';
import { BRAND_COLORS } from '../../src/theme/colors';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const { user, role } = useAuthStore();
  const router = useRouter();

  const { control, handleSubmit, setValue, formState: { errors } } = useForm<LoginFormValues>({
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
        router.replace('/(staff)/dashboard');
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

  const handleAutofill = (email: string, pass: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', pass, { shouldValidate: true });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: BRAND_COLORS.canvasBg }}
      className="justify-center items-center p-4"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', width: '100%', paddingVertical: 20 }}
        style={{ width: '100%', maxWidth: 440, alignSelf: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        <Card className="bg-white p-6 sm:p-8 rounded-3xl shadow-lg border border-slate-100 w-full my-4">

          {/* Official Brand Logo & Header */}
          <View className="items-center mb-6">
            <View style={{ width: 220, height: 70, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 8 }}>
              <Image
                source={require('../../assets/Logo.png')}
                style={{ width: 260, height: 130, resizeMode: 'contain' }}
              />
            </View>
            <Text style={{ fontSize: 24, fontWeight: '900', color: BRAND_COLORS.primary, letterSpacing: -0.5 }}>CEDOI Platform</Text>
            <Text style={{ color: BRAND_COLORS.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 4, textAlign: 'center' }}>
              Meeting & Attendance Management
            </Text>
          </View>

          {/* Form */}
          <View style={{ width: '100%', gap: 16 }}>

            {/* Email Field */}
            <View style={{ width: '100%' }}>
              <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email</Text>
              <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', position: 'relative' }}>
                <View style={{ position: 'absolute', left: 16, zIndex: 10 }}>
                  <Mail size={18} color={BRAND_COLORS.textMuted} />
                </View>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={{ flex: 1, width: '100%', height: 48, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: errors.email ? '#ef4444' : '#e2e8f0', borderRadius: 12, paddingLeft: 44, paddingRight: 16, fontSize: 14, color: '#1e293b' }}
                      placeholder="Enter email address"
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
            <View style={{ width: '100%' }}>
              <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Password</Text>
              <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', position: 'relative' }}>
                <View style={{ position: 'absolute', left: 16, zIndex: 10 }}>
                  <Lock size={18} color={BRAND_COLORS.textMuted} />
                </View>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={{ flex: 1, width: '100%', height: 48, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: errors.password ? '#ef4444' : '#e2e8f0', borderRadius: 12, paddingLeft: 44, paddingRight: 16, fontSize: 14, color: '#1e293b' }}
                      placeholder="Enter password"
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
              style={{ width: '100%', height: 50, backgroundColor: BRAND_COLORS.primary, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 8 }}
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-extrabold text-base">Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Demo Accounts / Development Credentials Box */}
            <View style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1', borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 12 }}>
              <View className="flex-row items-center mb-2.5">
                <Key size={14} color="#475569" style={{ marginRight: 6 }} />
                <Text className="text-xs font-black text-slate-700 uppercase tracking-wide">
                  Development Demo Credentials
                </Text>
              </View>

              {/* Admin Creds */}
              <View className="bg-white p-2.5 rounded-xl border border-slate-200 mb-2 flex-row items-center justify-between">
                <View className="flex-1 min-w-0 mr-2">
                  <View className="flex-row items-center">
                    <Shield size={12} color="#0d5984" style={{ marginRight: 4 }} />
                    <Text className="text-xs font-black text-slate-800">Admin Account</Text>
                  </View>
                  <Text className="text-[11px] text-slate-600 font-semibold mt-0.5" numberOfLines={1}>
                    Email: admin@godivatech.com
                  </Text>
                  <Text className="text-[11px] text-slate-600 font-semibold" numberOfLines={1}>
                    Password: Password@123
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleAutofill('admin@godivatech.com', 'Password@123')}
                  activeOpacity={0.8}
                  style={{ backgroundColor: '#0d5984', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                >
                  <Text className="text-[11px] font-extrabold text-white">Use Admin</Text>
                </TouchableOpacity>
              </View>

              {/* Staff Creds */}
              <View className="bg-white p-2.5 rounded-xl border border-slate-200 flex-row items-center justify-between">
                <View className="flex-1 min-w-0 mr-2">
                  <View className="flex-row items-center">
                    <UserCheck size={12} color="#16a34a" style={{ marginRight: 4 }} />
                    <Text className="text-xs font-black text-slate-800">Staff Account</Text>
                  </View>
                  <Text className="text-[11px] text-slate-600 font-semibold mt-0.5" numberOfLines={1}>
                    Email: staff@godivatech.com
                  </Text>
                  <Text className="text-[11px] text-slate-600 font-semibold" numberOfLines={1}>
                    Password: Password@123
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleAutofill('staff@godivatech.com', 'Password@123')}
                  activeOpacity={0.8}
                  style={{ backgroundColor: '#16a34a', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                >
                  <Text className="text-[11px] font-extrabold text-white">Use Staff</Text>
                </TouchableOpacity>
              </View>
            </View>

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
