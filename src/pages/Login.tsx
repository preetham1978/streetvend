import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Phone, ArrowRight, UserCircle2, Lock, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useI18n } from '../lib/I18nContext';
import { supabase } from '../lib/supabase';

// TODO: Manual configuration in Supabase Dashboard -> Auth -> Providers -> Phone
// Enable Phone provider. Configure SMS Provider (e.g., Twilio for India).
// Required Environment Variables to configure in production:
// - SUPABASE_SMS_PROVIDER
// - TWILIO_ACCOUNT_SID
// - TWILIO_AUTH_TOKEN
// - TWILIO_PHONE_NUMBER

export default function Login() {
    const { t } = useI18n();
    const { login } = useAuth();
    const navigate = useNavigate();

    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [step, setStep] = useState<'request' | 'verify'>('request');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [errorMsg, setErrorMsg] = useState('');
    const [infoMsg, setInfoMsg] = useState('');

    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

    const demoAccounts = [
        { name: "Raju's Chaat Corner", phone: "+919876543210" },
        { name: "Fresh Green Organics", phone: "+919876543211" },
        { name: "Al-Noor Meat Shop", phone: "+919876543212" },
        { name: "Aunty's Dosa Point", phone: "+919876543214" },
        { name: "Preetham's Kabab", phone: "+917092006655" },
        { name: "Sai Kirana Store", phone: "+919876543213" },
        { name: "Preetham's Kebab", phone: "+919900112233" }
    ];

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const handleSendOtp = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setErrorMsg('');
        setInfoMsg('');

        // Normalize phone number to include +91
        const cleanPhoneDigits = phone.replace(/\D/g, '');
        if (cleanPhoneDigits.length !== 10) {
            setErrorMsg('Please enter a valid 10-digit mobile number');
            return;
        }

        const fullPhoneNumber = `+91${cleanPhoneDigits}`;
        setIsSubmitting(true);

        if (supabase) {
            try {
                const { error } = await supabase.auth.signInWithOtp({
                    phone: fullPhoneNumber,
                });

                if (error) {
                    if (error.message.includes('rate limit') || error.status === 429) {
                        setErrorMsg('Too many attempts. Please try again later.');
                    } else {
                        setErrorMsg(error.message);
                    }
                } else {
                    setStep('verify');
                    setCountdown(30);
                    setInfoMsg(`OTP sent successfully to ${fullPhoneNumber}`);
                    setTimeout(() => otpRefs.current[0]?.focus(), 100);
                }
            } catch (err: any) {
                setErrorMsg(err?.message || 'Error sending OTP. Please try again.');
            } finally {
                setIsSubmitting(false);
            }
        } else {
            // Mock Fallback
            setStep('verify');
            setCountdown(30);
            setInfoMsg(`[Mock Mode] OTP sent to ${fullPhoneNumber}. (Enter any digits to proceed)`);
            setTimeout(() => otpRefs.current[0]?.focus(), 100);
            setIsSubmitting(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setInfoMsg('');

        const token = otp.join('');
        if (token.length !== 6) {
            setErrorMsg('Please enter all 6 digits of the OTP');
            return;
        }

        const cleanPhoneDigits = phone.replace(/\D/g, '');
        const fullPhoneNumber = `+91${cleanPhoneDigits}`;
        setIsSubmitting(true);

        if (supabase) {
            try {
                const { data, error } = await supabase.auth.verifyOtp({
                    phone: fullPhoneNumber,
                    token,
                    type: 'sms'
                });

                if (error) {
                    if (error.message.includes('expired')) {
                        setErrorMsg('OTP expired. Please request a new one.');
                    } else if (error.message.includes('invalid') || error.message.includes('incorrect')) {
                        setErrorMsg('Invalid OTP. Please try again.');
                    } else {
                        setErrorMsg(error.message);
                    }
                } else {
                    // Store vendor session locally
                    await login(fullPhoneNumber);
                    navigate('/dashboard');
                }
            } catch (err: any) {
                setErrorMsg(err?.message || 'Verification failed.');
            } finally {
                setIsSubmitting(false);
            }
        } else {
            // Mock verification success
            await login(fullPhoneNumber);
            navigate('/dashboard');
            setIsSubmitting(false);
        }
    };

    const handleOtpChange = (index: number, val: string) => {
        if (isNaN(Number(val))) return;
        const newOtp = [...otp];
        newOtp[index] = val.substring(val.length - 1);
        setOtp(newOtp);

        // Auto-advance
        if (val && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleQuickLogin = async (targetPhone: string) => {
        setPhone(targetPhone.replace(/\D/g, '').substring(targetPhone.replace(/\D/g, '').length - 10));
        setIsSubmitting(true);
        try {
            await login(targetPhone);
            navigate('/dashboard');
        } catch (err) {
            console.error('Quick login error:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-[90vh] flex items-center justify-center py-20 px-4 sm:px-6 lg:px-8 bg-bg-base relative overflow-hidden">
            <div className="absolute inset-0 hero-glow opacity-50 pointer-events-none"></div>
            
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full relative z-10"
            >
                <div className="bg-bg-surface rounded-[2.5rem] p-10 sm:p-12 border border-border-subtle shadow-2xl relative overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl"></div>
                    
                    <div className="flex flex-col items-center mb-10">
                        <div className="w-20 h-20 bg-brand-500/10 rounded-[1.5rem] flex items-center justify-center mb-8 border border-brand-500/20 relative group overflow-hidden">
                            <div className="absolute inset-0 bg-brand-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <img src="/favicon.png" alt="Streetvend Logo" className="w-12 h-12 relative z-10" />
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-display font-bold text-text-primary text-center mb-3">
                            {step === 'request' ? t('nav.vendorLogin') : 'Verify Phone'}
                        </h1>
                        <p className="text-text-tertiary text-center font-bold uppercase tracking-widest text-[10px]">
                            {step === 'request' ? 'Streetvend Intelligence Access' : 'Enter 6-Digit OTP'}
                        </p>
                    </div>

                    {errorMsg && (
                        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold text-center">
                            {errorMsg}
                        </div>
                    )}

                    {infoMsg && (
                        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold text-center">
                            {infoMsg}
                        </div>
                    )}

                    {step === 'request' ? (
                        <form onSubmit={handleSendOtp} className="space-y-6 mb-10">
                            <div>
                                <label htmlFor="phone" className="block text-[10px] font-bold text-text-tertiary mb-3 uppercase tracking-widest">
                                    Indian Mobile Number
                                </label>
                                <div className="relative group flex items-center">
                                    <div className="absolute left-5 text-text-primary font-bold text-lg select-none">
                                        +91
                                    </div>
                                    <input
                                        id="phone"
                                        type="tel"
                                        required
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').substring(0, 10))}
                                        className="block w-full pl-16 pr-5 py-4 rounded-xl border border-border-subtle bg-bg-base text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all font-bold text-lg"
                                        placeholder="Enter 10 digits"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full flex items-center justify-center gap-3 py-4 px-6 border border-transparent rounded-xl shadow-xl text-sm font-bold text-white primary-button-gradient hover:scale-[1.02] active:scale-[0.95] disabled:opacity-50 transition-all uppercase tracking-widest"
                            >
                                {isSubmitting ? 'Sending OTP...' : 'Send OTP'}
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtp} className="space-y-6 mb-10">
                            <div>
                                <label className="block text-[10px] font-bold text-text-tertiary mb-4 uppercase tracking-widest text-center">
                                    Verification Code
                                </label>
                                <div className="flex justify-between gap-2">
                                    {otp.map((digit, i) => (
                                        <input
                                            key={i}
                                            type="text"
                                            maxLength={1}
                                            value={digit}
                                            ref={(el) => { otpRefs.current[i] = el; }}
                                            onChange={(e) => handleOtpChange(i, e.target.value)}
                                            onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                            className="w-12 h-14 text-center rounded-xl border border-border-subtle bg-bg-base text-text-primary font-bold text-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                        />
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full flex items-center justify-center gap-3 py-4 px-6 border border-transparent rounded-xl shadow-xl text-sm font-bold text-white primary-button-gradient hover:scale-[1.02] active:scale-[0.95] disabled:opacity-50 transition-all uppercase tracking-widest"
                            >
                                {isSubmitting ? 'Verifying...' : 'Verify OTP'}
                                <Sparkles className="w-5 h-5" />
                            </button>

                            <div className="text-center">
                                {countdown > 0 ? (
                                    <p className="text-xs text-text-tertiary font-bold">
                                        Resend OTP in <span className="text-brand-500">{countdown}s</span>
                                    </p>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => handleSendOtp()}
                                        className="text-xs text-brand-500 hover:underline font-bold uppercase tracking-wider"
                                    >
                                        Resend OTP
                                    </button>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => { setStep('request'); setErrorMsg(''); setInfoMsg(''); }}
                                className="w-full text-center text-xs text-text-tertiary font-bold uppercase hover:text-text-primary transition-colors"
                            >
                                ← Change Phone Number
                            </button>
                        </form>
                    )}

                    <div className="bg-bg-base/50 rounded-[1.5rem] p-6 border border-border-subtle mb-8">
                        <p className="text-[10px] font-bold text-text-tertiary mb-4 uppercase tracking-widest">Quick Demo Access:</p>
                        <div className="grid grid-cols-1 gap-2">
                            {demoAccounts.map((account, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => handleQuickLogin(account.phone)}
                                    className="w-full text-left flex justify-between items-center px-4 py-3 rounded-xl hover:bg-brand-500/5 transition-all border border-transparent hover:border-brand-500/20 group"
                                >
                                    <span className="text-xs font-bold text-text-secondary group-hover:text-text-primary transition-colors">{account.name}</span>
                                    <span className="text-[10px] text-text-tertiary font-bold group-hover:text-brand-500">{account.phone}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 text-center">
                        <p className="text-xs text-text-tertiary font-bold uppercase tracking-widest">
                            New vendor? <Link to="/register" className="text-brand-500 hover:underline ml-1">Register here</Link>
                        </p>
                        <div className="h-px bg-border-subtle w-12 mx-auto"></div>
                        <Link to="/admin/login" className="inline-flex items-center justify-center gap-2 text-xs text-text-tertiary font-bold uppercase tracking-widest hover:text-brand-500 transition-colors">
                            <Lock className="w-3 h-3" /> Admin Portal
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
