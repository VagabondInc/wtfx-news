import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-red-600 flex items-center justify-center p-8">
          <div className="bg-white rounded-lg p-8 max-w-md">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <p className="text-gray-700 mb-4">
              The application encountered an error. Please check the browser console for details.
            </p>
            <div className="bg-gray-100 p-4 rounded mb-4">
              <code className="text-sm text-gray-800">
                {this.state.error?.message || 'Unknown error'}
              </code>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
            >
              Reload Page
            </button>
            <button 
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Clear Data & Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
} 