'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import confetti from 'canvas-confetti';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const email = searchParams.get('email');
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // Trigger confetti animation
    if (!showConfetti) {
      setShowConfetti(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [showConfetti]);

  return (
    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
      <div className="mb-6">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
        <p className="text-gray-600">
          Thank you for subscribing! Your payment has been processed successfully.
        </p>
      </div>

      {email && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            A confirmation email has been sent to:
          </p>
          <p className="font-medium text-gray-900">{email}</p>
        </div>
      )}

      <div className="space-y-3">
        <Link 
          href="/"
          className="block w-full bg-green-600 text-white rounded-lg px-4 py-3 font-medium hover:bg-green-700 transition-colors"
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
  );
}

export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-gradient-to-tr from-green-100 to-sky-100 flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Loading...</h1>
            <p className="text-gray-600">Please wait while we load your payment details.</p>
          </div>
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </main>
  );
} 