import { useState, useEffect } from 'react';

/**
 * Hook to fetch the application version from version.txt
 * The file is served from /version.txt in production (copied from public folder)
 */
export const useAppVersion = () => {
  const [version, setVersion] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const response = await fetch('/version.txt');
        if (!response.ok) {
          throw new Error('Failed to fetch version');
        }
        const text = await response.text();
        setVersion(text.trim());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Fallback to empty string
        setVersion('');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVersion();
  }, []);

  return { version, isLoading, error };
};
