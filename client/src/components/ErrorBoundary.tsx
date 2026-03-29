import { Component, ErrorInfo, ReactNode } from "react";
import i18next from "i18next";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: "page" | "component" | "inline";
  title?: string;
  description?: string;
  showReload?: boolean;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });

    this.props.onError?.(error, errorInfo);

    if (import.meta.env.PROD && typeof window !== "undefined") {
      console.error("[Production Error]", error.message, errorInfo.componentStack);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      const t = i18next.t.bind(i18next);
      const fallback = this.props.fallback || "page";
      const title = this.props.title || t('errorBoundary.unexpectedError');
      const description =
        this.props.description ||
        t('errorBoundary.errorDescription');

      if (fallback === "inline") {
        return (
          <Alert
            variant="destructive"
            className="my-2"
            data-testid="error-inline"
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t('errorBoundary.error')}</AlertTitle>
            <AlertDescription>
              {description}
              <Button
                onClick={this.handleReset}
                variant="ghost"
                size="sm"
                className="mt-2 h-auto p-1 text-xs"
                data-testid="button-retry-inline"
              >
                <RefreshCw className="h-3 w-3 ml-1" />
                {t('errorBoundary.retry')}
              </Button>
            </AlertDescription>
          </Alert>
        );
      }

      if (fallback === "component") {
        return (
          <Card className="w-full" data-testid="error-component">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 space-x-reverse mb-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <h3 className="font-medium text-destructive">{title}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {description}
              </p>
              {import.meta.env.DEV && this.state.error && (
                <details className="mb-3 text-xs">
                  <summary className="cursor-pointer text-muted-foreground">
                    {t('errorBoundary.errorDetails')}
                  </summary>
                  <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  size="sm"
                  data-testid="button-retry-component"
                >
                  <RefreshCw className="h-4 w-4 ml-1" />
                  {t('errorBoundary.retry')}
                </Button>
                {this.props.showReload && (
                  <Button
                    onClick={this.handleReload}
                    size="sm"
                    data-testid="button-reload-component"
                  >
                    <Home className="h-4 w-4 ml-1" />
                    {t('errorBoundary.backToHome')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      }

      return (
        <div
          className="min-h-screen flex items-center justify-center p-4 bg-background"
          data-testid="error-page"
        >
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle className="text-xl">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
              {import.meta.env.DEV && this.state.error && (
                <div className="mt-4 p-3 bg-muted rounded-md text-sm">
                  <p className="font-semibold text-destructive mb-2">
                    {t('errorBoundary.errorDetails')}:
                  </p>
                  <code className="text-xs break-all">
                    {this.state.error.message}
                  </code>
                  {this.state.errorInfo && (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer">
                        {t('errorBoundary.additionalInfo')}
                      </summary>
                      <pre className="mt-1 whitespace-pre-wrap text-xs">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex gap-2 justify-center">
              <Button
                onClick={this.handleReset}
                variant="outline"
                data-testid="button-retry-page"
              >
                <RefreshCw className="w-4 h-4 ml-2" />
                {t('errorBoundary.retry')}
              </Button>
              <Button
                onClick={this.handleReload}
                data-testid="button-reload-page"
              >
                {t('errorBoundary.reloadPage')}
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
