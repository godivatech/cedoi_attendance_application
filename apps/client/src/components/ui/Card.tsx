import { View } from 'react-native';
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card = ({ children, className = '' }: CardProps) => {
  return (
    <View 
      style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: 1 }}
      className={`p-4 rounded-2xl shadow-sm ${className}`}
    >
      {children}
    </View>
  );
};
