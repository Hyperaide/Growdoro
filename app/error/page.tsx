'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function ErrorContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');

  const getErrorMessage = () => {
    switch (reason) {
      case 'session_expired':
        return {
          title: 'Session Expired',
          message: 'Your payment session has expired. Please try again.',
          icon: '⏰'
        };
      case 'processing_error':
        return {
          title: 'Processing Error',
          message: 'There was an error processing your payment. Please try again or contact support.',
          icon: '⚠️'
        };
      default:
        return {
          title: 'Something went wrong',
          message: 'An unexpected error occurred. Please try again.',
          icon: '❌'
        };
    }
  };

  const error = getErrorMessage();

  return (
    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
      <div className="mb-6">
        <div className="text-6xl mb-4">{error.icon}</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{error.title}</h1>
        <p className="text-gray-600">{error.message}</p>
      </div>

      <div className="space-y-3">
        <Link 
          href="/"
          className="block w-full bg-gray-600 text-white rounded-lg px-4 py-3 font-medium hover:bg-gray-700 transition-colors"
        >
          Return to Garden
        </Link>
        
        <a 
          href="mailto:jp@hyperaide.com"
          className="block w-full border border-gray-300 text-gray-700 rounded-lg px-4 py-3 font-medium hover:bg-gray-50 transition-colors"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
}

export default function ErrorPage() {
  return (
    <main className="min-h-screen bg-gradient-to-tr from-red-50 to-orange-50 flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="text-6xl mb-4">⏳</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Loading...</h1>
            <p className="text-gray-600">Please wait while we load the error details.</p>
          </div>
        </div>
      }>
        <ErrorContent />
      </Suspense>
    </main>
  );
} 