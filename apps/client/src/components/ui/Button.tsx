import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import React from 'react';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export const Button = ({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled = false,
  className = '',
}: ButtonProps) => {
  const baseStyles = 'flex-row justify-center items-center transition-all duration-200 hover:scale-[1.02] active:scale-[0.97]';
  
  const sizeStyles = {
    sm: 'py-2 px-3 rounded-lg',
    md: 'py-2.5 px-4 rounded-xl',
    lg: 'py-3.5 px-6 rounded-xl',
  };

  const variantStyles = {
    primary: 'bg-indigo-600',
    secondary: 'bg-slate-200',
    outline: 'border border-slate-300',
    danger: 'bg-red-500',
  };

  const textStyles = {
    primary: 'text-white font-bold',
    secondary: 'text-slate-900 font-bold',
    outline: 'text-slate-900 font-bold',
    danger: 'text-white font-bold',
  };

  const textSizeStyles = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <TouchableOpacity
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${disabled || loading ? 'opacity-50' : ''} ${className}`}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'secondary' || variant === 'outline' ? '#000' : '#fff'} />
      ) : (
        <Text className={`${textStyles[variant]} ${textSizeStyles[size]}`}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};
