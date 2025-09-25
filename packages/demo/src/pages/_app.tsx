/**
 * Next.js App Component
 */

import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import Layout from '@/components/Layout';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Load authentication token on app start
    apiClient.loadAuth();
  }, []);

  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}