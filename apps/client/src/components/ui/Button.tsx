import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import React from 'react';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export const Button = ({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  className = '',
}: ButtonProps) => {
  const baseStyles = 'p-4 rounded-xl flex-row justify-center items-center transition-all duration-200 hover:scale-[1.02] active:scale-[0.97]';
  const variantStyles = {
    primary: 'bg-blue-600',
    secondary: 'bg-slate-200',
    outline: 'border border-slate-300',
    danger: 'bg-red-500',
  };

  const textStyles = {
    primary: 'text-white font-bold text-lg',
    secondary: 'text-slate-900 font-bold text-lg',
    outline: 'text-slate-900 font-bold text-lg',
    danger: 'text-white font-bold text-lg',
  };

  return (
    <TouchableOpacity
      className={`${baseStyles} ${variantStyles[variant]} ${disabled || loading ? 'opacity-50' : ''} ${className}`}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' || variant === 'outline' ? '#000' : '#fff'} />
      ) : (
        <Text className={textStyles[variant]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};
