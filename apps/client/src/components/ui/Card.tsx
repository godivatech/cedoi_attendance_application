import { View, ViewStyle, StyleProp } from 'react-native';
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export const Card = ({ children, className = '', style }: CardProps) => {
  return (
    <View 
      style={[{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: 1 }, style]}
      className={`p-4 rounded-2xl shadow-sm ${className}`}
    >
      {children}
    </View>
  );
};
