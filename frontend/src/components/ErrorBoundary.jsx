import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });

    // Log error to your error reporting service
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <div className="flex justify-center mb-4">
                <AlertTriangle className="h-12 w-12 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Something went wrong
              </h2>
              <p className="text-gray-600 mb-6">
                We're sorry, but there was an error loading this page. Please
                try again or contact support if the problem persists.
              </p>
              <div className="space-y-4">
                <Button
                  onClick={() => window.location.reload()}
                  className="w-full bg-black text-white hover:bg-gray-800"
                >
                  Reload Page
                </Button>
                <Button
                  onClick={() => window.history.back()}
                  variant="outline"
                  className="w-full"
                >
                  Go Back
                </Button>
              </div>
              {process.env.NODE_ENV === "development" && this.state.error && (
                <div className="mt-6 p-4 bg-gray-100 rounded-lg text-left">
                  <p className="font-mono text-sm text-red-600 whitespace-pre-wrap">
                    {this.state.error.toString()}
                  </p>
                  <p className="font-mono text-xs text-gray-600 mt-2 whitespace-pre-wrap">
                    {this.state.errorInfo?.componentStack}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
