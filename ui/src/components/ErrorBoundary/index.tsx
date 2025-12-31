import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Button, Typography } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { t } from 'i18next';
import styles from './index.module.css';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component that catches JavaScript errors anywhere in the child
 * component tree, logs those errors, and displays a fallback UI.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    // TODO: Log error to external service in production (e.g., Sentry)
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Allow custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Box className={styles.container} data-testid="error-boundary">
          <Box className={styles.content} data-testid="error-boundary-content">
            <ErrorOutlineIcon className={styles.icon} />
            <Typography variant="h5" className={styles.title}>
              {t('ErrorPage.Title')}
            </Typography>
            <Typography variant="body1" color="text.secondary" className={styles.message}>
              {t('ErrorPage.Message')}
            </Typography>
            {import.meta.env.DEV && this.state.error && (
              <Box className={styles.errorDetails}>
                <Typography variant="caption" component="pre" className={styles.errorText}>
                  {this.state.error.message}
                </Typography>
              </Box>
            )}
            <Box className={styles.actions}>
              <Button variant="contained" onClick={this.handleReload}>
                {t('ErrorPage.ReloadPage')}
              </Button>
              <Button variant="outlined" onClick={this.handleGoHome}>
                {t('ErrorPage.GoHome')}
              </Button>
            </Box>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
