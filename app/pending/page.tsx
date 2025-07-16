'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function PendingPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [dots, setDots] = useState('');

  useEffect(() => {
    // Animate loading dots
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-tr from-yellow-50 to-amber-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-yellow-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Processing{dots}</h1>
          <p className="text-gray-600">
            Your payment is being processed. This may take a few moments.
          </p>
        </div>

        <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Please do not close this window or navigate away while your payment is being processed.
          </p>
        </div>

        <div className="space-y-3">
          <Link 
            href="/"
            className="block w-full border border-gray-300 text-gray-700 rounded-lg px-4 py-3 font-medium hover:bg-gray-50 transition-colors"
          >
            Return to Garden
          </Link>
          
          {sessionId && (
            <p className="text-xs text-gray-500">
              Session ID: {sessionId.slice(0, 8)}...
            </p>
          )}
        </div>
      </div>
    </main>
  );
} 