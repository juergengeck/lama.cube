import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@lama/ui';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class SettingsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[SettingsErrorBoundary] Error loading settings:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className="m-4">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <CardTitle>Settings Load Error</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              There was an error loading your settings. This may be due to a network issue or
              corrupted data.
            </p>

            {this.state.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm font-mono text-red-700">
                {this.state.error.message}
              </div>
            )}

            <div className="flex space-x-2">
              <Button onClick={this.handleReset} variant="default">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>

              <Button
                onClick={() => window.location.reload()}
                variant="outline"
              >
                Reload Application
              </Button>
            </div>

            <p className="text-xs text-gray-500">
              If the problem persists, please check the console logs or contact support.
            </p>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
