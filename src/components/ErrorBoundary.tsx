import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { AlertCircle } from 'lucide-react-native';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console for debugging
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <View style={{ flex: 1, backgroundColor: '#FAFAF8', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <AlertCircle size={64} color="#C9A227" />
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1a1a1a', marginTop: 24, textAlign: 'center' }}>
            Oops! Something went wrong
          </Text>
          <Text style={{ fontSize: 16, color: '#6B6B6B', marginTop: 12, textAlign: 'center', lineHeight: 24 }}>
            The app encountered an unexpected error. Please try restarting.
          </Text>

          {this.state.error && (
            <View
              style={{
                marginTop: 20,
                maxHeight: 160,
                width: '100%',
                backgroundColor: '#FFF',
                padding: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#E8E4D9',
              }}
            >
              <ScrollView nestedScrollEnabled>
                <Text selectable style={{ fontSize: 11, color: '#C9342A', fontFamily: 'monospace' }}>
                  {this.state.error.toString()}
                  {this.state.error.stack ? `\n\n${this.state.error.stack}` : ''}
                </Text>
              </ScrollView>
            </View>
          )}

          <Pressable
            onPress={this.handleReset}
            style={{
              marginTop: 24,
              backgroundColor: '#C9A227',
              paddingHorizontal: 32,
              paddingVertical: 16,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
              Try Again
            </Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}
