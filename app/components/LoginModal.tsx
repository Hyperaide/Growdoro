'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, EnvelopeSimple, SignIn, CircleNotch } from '@phosphor-icons/react';
import { useAuth } from '../contexts/auth-context';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
    const { db, GoogleSignInButton } = useAuth();
    const [authMethod, setAuthMethod] = useState<'choose' | 'magic-code'>('choose');
    const [email, setEmail] = useState('');
    const [sentEmail, setSentEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Create a component from the GoogleSignInButton function with handleClose callback
    const GoogleButton = () => GoogleSignInButton(handleClose);

    const handleClose = () => {
        setAuthMethod('choose');
        setEmail('');
        setSentEmail('');
        setError('');
        setIsLoading(false);
        onClose();
    };

    const handleSendMagicCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await db.auth.sendMagicCode({ email });
            setSentEmail(email);
            setIsLoading(false);
        } catch (err: any) {
            setError(err.body?.message || 'Failed to send magic code');
            setIsLoading(false);
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const code = (form.elements.namedItem('code') as HTMLInputElement).value;
        
        setIsLoading(true);
        setError('');

        try {
            await db.auth.signInWithMagicCode({ email: sentEmail, code });
            handleClose();
        } catch (err: any) {
            setError(err.body?.message || 'Invalid code');
            setIsLoading(false);
            (form.elements.namedItem('code') as HTMLInputElement).value = '';
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                        onClick={handleClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
                    >
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 pointer-events-auto">
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-100">
                                <h2 className="text-xl font-semibold text-gray-900">
                                    {authMethod === 'choose' ? 'Sign in to Growdoro' : 'Enter your email'}
                                </h2>
                                <button
                                    onClick={handleClose}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X size={20} className="text-gray-500" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                {error && (
                                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                                        {error}
                                    </div>
                                )}

                                {authMethod === 'choose' && !sentEmail && (
                                    <div className="space-y-4">
                                        {/* Google Sign In */}
                                        <div className="flex justify-center">
                                            <GoogleButton />
                                        </div>

                                        <div className="relative">
                                            <div className="absolute inset-0 flex items-center">
                                                <div className="w-full border-t border-gray-200" />
                                            </div>
                                            <div className="relative flex justify-center text-sm">
                                                <span className="px-2 bg-white text-gray-500">or</span>
                                            </div>
                                        </div>

                                        {/* Magic Code Option */}
                                        <button
                                            onClick={() => setAuthMethod('magic-code')}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            <EnvelopeSimple size={20} className="text-gray-600" />
                                            <span className="text-gray-700 text-sm font-medium">Continue with email</span>
                                        </button>
                                    </div>
                                )}

                                {authMethod === 'magic-code' && !sentEmail && (
                                    <form onSubmit={handleSendMagicCode} className="space-y-4">
                                        <div>
                                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                                Email address
                                            </label>
                                            <input
                                                id="email"
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="you@example.com"
                                                required
                                                autoFocus
                                                disabled={isLoading}
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isLoading ? (
                                                <CircleNotch size={20} className="animate-spin" />
                                            ) : (
                                                <>
                                                    <SignIn size={20} />
                                                    <span>Send magic code</span>
                                                </>
                                            )}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setAuthMethod('choose')}
                                            className="w-full text-sm text-gray-600 hover:text-gray-800 transition-colors"
                                        >
                                            Back to sign in options
                                        </button>
                                    </form>
                                )}

                                {sentEmail && (
                                    <form onSubmit={handleVerifyCode} className="space-y-4">
                                        <div>
                                            <p className="text-sm text-gray-600 mb-4">
                                                We sent a magic code to <strong>{sentEmail}</strong>. 
                                                Check your email and enter the code below.
                                            </p>
                                            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                                                Verification code
                                            </label>
                                            <input
                                                id="code"
                                                name="code"
                                                type="text"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="123456"
                                                required
                                                autoFocus
                                                disabled={isLoading}
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isLoading ? (
                                                <CircleNotch size={20} className="animate-spin" />
                                            ) : (
                                                <>
                                                    <SignIn size={20} />
                                                    <span>Verify code</span>
                                                </>
                                            )}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSentEmail('');
                                                setEmail('');
                                                setError('');
                                            }}
                                            className="w-full text-sm text-gray-600 hover:text-gray-800 transition-colors"
                                        >
                                            Try a different email
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
} 