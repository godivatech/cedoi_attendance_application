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
      style={{ flex: 1, backgroundColor: BRAND_COLORS.canvasBg }}
      className="justify-center items-center p-4"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', width: '100%', paddingVertical: 20 }}
        style={{ width: '100%', maxWidth: 440, alignSelf: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        <Card className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100 w-full my-4">
          
          {/* Official Brand Logo & Header */}
          <View className="items-center mb-8">
            <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: BRAND_COLORS.primary, justifyContent: 'center', alignItems: 'center', shadowColor: BRAND_COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, marginBottom: 16 }}>
              <Text className="text-white font-black text-2xl">C</Text>
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
              style={{ width: '100%', height: 50, backgroundColor: BRAND_COLORS.primary, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 12 }}
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-extrabold text-base">Sign In</Text>
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
