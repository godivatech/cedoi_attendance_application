import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 justify-center items-center p-6 bg-slate-50">
          <Text className="text-xl font-bold text-slate-900 mb-2">Something went wrong.</Text>
          <Text className="text-slate-500 text-center mb-6">
            We encountered an unexpected error. Please try restarting the app.
          </Text>
          <TouchableOpacity
            className="bg-indigo-600 px-6 py-3 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            onPress={() => this.setState({ hasError: false })}
          >
            <Text className="text-white font-bold">Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}
