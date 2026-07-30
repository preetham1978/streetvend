import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Store, Check, ArrowRight, ChevronLeft, User, Phone, Mail, MapPin, Package } from 'lucide-react';
import { cn } from '../lib/utils';
import { mockDb, supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../lib/I18nContext';
import { PLANS_CONFIG, PlanTier } from '../config/pricing';

export default function Register() {
    const { t } = useI18n();
    const [step, setStep] = useState(1);
    const [isVerifying, setIsVerifying] = useState(false);
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
    
    const navigate = useNavigate();
    const { loginWithEmail, verifyOtp, session, updateUser, refreshProfile } = useAuth();
    
    // Form State
    const [storeName, setStoreName] = useState('');
    const [ownerName, setOwnerName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [category, setCategory] = useState('Street Food');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [plan, setPlan] = useState('free');

    React.useEffect(() => {
        if (session?.user?.email && !email) {
            setEmail(session.user.email);
        }
    }, [session]);

    const categories = [
        'Street Food', 'Vegetables & Fruits', 'Meat & Seafood', 'Groceries', 
        'Laundry', 'Key Maker', 'Mobile Accessories', 'Watch Repair\'s', 
        'Pan Shop', 'Fancy Store', 'Stationery'
    ];

    const plans = Object.values(PLANS_CONFIG);

    const createVendorRecord = async (userId: string) => {
        const cleanPhone = phone && phone.trim() ? phone.trim() : null;
        const newVendorDb = {
            id: 'v_' + Math.random().toString(36).substring(2, 9),
            user_id: userId,
            name: storeName || 'My Street Store',
            owner_name: ownerName || 'Vendor',
            phone: cleanPhone,
            email: email || session?.user?.email,
            category: category || 'Street Food',
            address: `${address || ''}${address && city ? ', ' : ''}${city || ''}`,
            subscription: plan || 'free',
            is_active: true,
            created_at: new Date().toISOString()
        };

        const res = await fetch('/api/register-vendor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newVendorDb)
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            let errMsg = errData.error || 'Registration failed';
            if (errMsg.includes('vendors_phone_key') || errMsg.includes('unique constraint')) {
                errMsg = 'This phone number is already registered to another store. Please use a different phone number.';
            }
            throw new Error(errMsg);
        }

        const resJson = await res.json();
        const savedVendor = resJson.vendor || newVendorDb;

        const vendorObj = mapVendorFromDb(savedVendor);
        updateUser(vendorObj);
        localStorage.setItem('vendor_user', JSON.stringify(vendorObj));
        await refreshProfile();
        navigate('/dashboard');
    };

    const handleStartRegistration = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        
        if (!email || !email.includes('@')) {
            setErrorMsg('Valid email is required for registration');
            return;
        }

        setIsSubmitting(true);
        try {
            if (session?.user) {
                // Auth session already created (e.g. verified OTP on login or previously)
                await createVendorRecord(session.user.id);
                return;
            }
            await loginWithEmail(email);
            setIsVerifying(true);
        } catch (err: any) {
            setErrorMsg(err?.message || 'Failed to send verification code');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVerifyAndComplete = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        const token = otp.join('');
        if (token.length !== 6) {
            setErrorMsg('Enter 6-digit verification code');
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Verify OTP (creates auth session)
            const { data, error: verifyError } = await (supabase?.auth.verifyOtp({
                email,
                token,
                type: 'email'
            }) as any);

            if (verifyError || !data?.user) throw verifyError || new Error("Verification failed");

            // 2. Create Vendor Row with user_id = data.user.id and all collected form data
            await createVendorRecord(data.user.id);
        } catch (err: any) {
            setErrorMsg(err?.message || 'Verification or registration failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOtpChange = (index: number, val: string) => {
        if (isNaN(Number(val))) return;
        const newOtp = [...otp];
        newOtp[index] = val.substring(val.length - 1);
        setOtp(newOtp);
        if (val && index < 5) otpRefs.current[index + 1]?.focus();
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
    };

    const nextStep = () => setStep(prev => Math.min(3, prev + 1));
    const prevStep = () => setStep(prev => Math.max(1, prev - 1));

    if (isVerifying) {
        return (
            <div className="min-h-screen flex items-center justify-center py-20 px-4 bg-bg-base relative overflow-hidden">
                <div className="absolute inset-0 hero-glow opacity-30 pointer-events-none"></div>
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full bg-bg-surface rounded-[2.5rem] p-10 border border-border-subtle shadow-2xl z-10"
                >
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center text-brand-500 mx-auto mb-6 border border-brand-500/20">
                            <Mail className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-display font-bold text-text-primary mb-2">Verify Your Email</h2>
                        <p className="text-xs text-text-tertiary font-bold uppercase tracking-widest">Sent to {email}</p>
                    </div>

                    {errorMsg && (
                        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold text-center">
                            {errorMsg}
                        </div>
                    )}

                    <form onSubmit={handleVerifyAndComplete} className="space-y-8">
                        <div className="grid grid-cols-6 gap-2">
                            {otp.map((digit, i) => (
                                <input
                                    key={i}
                                    type="text"
                                    maxLength={1}
                                    value={digit}
                                    ref={(el) => { otpRefs.current[i] = el; }}
                                    onChange={(e) => handleOtpChange(i, e.target.value)}
                                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                    className="w-full h-14 text-center rounded-xl border border-border-subtle bg-bg-base text-text-primary font-bold text-xl focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                                />
                            ))}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 rounded-xl primary-button-gradient text-white font-bold uppercase tracking-widest shadow-xl disabled:opacity-50 transition-all"
                        >
                            {isSubmitting ? 'Finalizing...' : 'Verify & Launch Store'}
                        </button>
                        
                        <button
                            type="button"
                            onClick={() => setIsVerifying(false)}
                            className="w-full text-center text-xs text-text-tertiary font-bold uppercase hover:text-text-primary transition-colors"
                        >
                            ← Back to Form
                        </button>
                    </form>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col py-20 px-4 sm:px-6 lg:px-8 bg-bg-base relative overflow-hidden">
            <div className="absolute inset-0 hero-glow opacity-30 pointer-events-none"></div>
            
            <div className="max-w-2xl w-full mx-auto relative z-10">
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <div className="w-20 h-20 bg-brand-500/10 rounded-[1.5rem] flex items-center justify-center text-brand-500 mx-auto mb-8 border border-brand-500/20 shadow-2xl relative group">
                        <div className="absolute inset-0 bg-brand-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <Store className="w-10 h-10 relative z-10" />
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-display font-bold text-text-primary mb-4 leading-none">Register Your Store</h1>
                    <p className="text-text-tertiary font-bold uppercase tracking-widest text-[10px]">Step {step} of 3 · Go Digital Today</p>
                </motion.div>

                {/* Step Indicator */}
                <div className="flex items-center justify-center mb-16 max-w-md mx-auto relative">
                    <div className="absolute top-1/2 left-0 w-full h-px bg-border-subtle -z-10"></div>
                    {[1, 2, 3].map((num) => (
                        <div key={num} className="flex items-center bg-bg-base px-6 first:pl-0 last:pr-0">
                            <motion.div 
                                animate={{ 
                                    scale: step === num ? 1.2 : 1,
                                    backgroundColor: step >= num ? "var(--brand-500)" : "var(--bg-surface)",
                                    borderColor: step >= num ? "var(--brand-500)" : "var(--border-subtle)"
                                }}
                                className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base border-2 transition-all shadow-xl",
                                    step >= num ? "text-white" : "text-text-tertiary"
                                )}
                            >
                                {step > num ? <Check className="w-6 h-6" /> : num}
                            </motion.div>
                        </div>
                    ))}
                </div>

                <motion.div 
                    layout
                    className="bg-bg-surface rounded-[2.5rem] p-8 sm:p-14 border border-border-subtle shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-brand-500/5 rounded-full blur-3xl"></div>
                    
                    <form onSubmit={step === 3 ? handleStartRegistration : (e) => { e.preventDefault(); nextStep(); }}>
                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <motion.div 
                                    key="step1"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-8"
                                >
                                    <div className="grid grid-cols-1 gap-8">
                                        <InputField 
                                            label="STORE NAME" 
                                            value={storeName} 
                                            onChange={setStoreName} 
                                            placeholder="e.g. Raju's Chaat Corner" 
                                            icon={<Store className="w-5 h-5" />} 
                                        />
                                        <InputField 
                                            label="OWNER NAME" 
                                            value={ownerName} 
                                            onChange={setOwnerName} 
                                            placeholder="Your full name" 
                                            icon={<User className="w-5 h-5" />} 
                                        />
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                            <InputField 
                                                label="PHONE" 
                                                value={phone} 
                                                onChange={(v) => setPhone(v.replace(/\D/g, '').substring(0, 10))} 
                                                placeholder="10-digit number" 
                                                type="tel"
                                                icon={<Phone className="w-5 h-5" />} 
                                            />
                                            <InputField 
                                                label="EMAIL (REQUIRED)" 
                                                value={email} 
                                                onChange={setEmail} 
                                                placeholder="you@email.com" 
                                                type="email"
                                                required
                                                icon={<Mail className="w-5 h-5" />} 
                                            />
                                        </div>
                                    </div>
                                    {errorMsg && <p className="text-red-500 text-xs font-bold text-center uppercase tracking-widest">{errorMsg}</p>}
                                </motion.div>
                            )}

                            {step === 2 && (
                                <motion.div 
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-8"
                                >
                                    <div>
                                        <label className="block text-[10px] font-bold text-text-tertiary mb-3 uppercase tracking-widest">STORE CATEGORY</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-text-tertiary group-focus-within:text-brand-500 transition-colors">
                                                <Package className="w-5 h-5" />
                                            </div>
                                            <select 
                                                value={category} 
                                                onChange={(e) => setCategory(e.target.value)} 
                                                className="w-full pl-14 pr-5 py-4 rounded-xl border border-border-subtle bg-bg-base text-text-primary focus:ring-2 focus:ring-brand-500 outline-none transition-all font-bold appearance-none"
                                            >
                                                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <InputField 
                                        label="STORE ADDRESS" 
                                        value={address} 
                                        onChange={setAddress} 
                                        placeholder="Street, Area" 
                                        icon={<MapPin className="w-5 h-5" />} 
                                    />
                                    <InputField 
                                        label="CITY" 
                                        value={city} 
                                        onChange={setCity} 
                                        placeholder="City" 
                                        icon={<MapPin className="w-5 h-5" />} 
                                    />
                                </motion.div>
                            )}

                            {step === 3 && (
                                <motion.div 
                                    key="step3"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-10"
                                >
                                    <div>
                                        <label className="block text-[10px] font-bold text-text-tertiary mb-8 uppercase tracking-widest text-center">SELECT SUBSCRIPTION PLAN</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {plans.map(p => (
                                                <div 
                                                    key={p.id}
                                                    onClick={() => setPlan(p.id)}
                                                    className={cn(
                                                        "cursor-pointer p-6 rounded-[2rem] border-2 transition-all relative group",
                                                        plan === p.id 
                                                            ? "border-brand-500 bg-brand-500/5 shadow-2xl shadow-brand-500/10" 
                                                            : "border-border-subtle bg-bg-base hover:border-brand-500/30"
                                                    )}
                                                >
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="font-bold text-xl text-text-primary">{p.name}</span>
                                                        {plan === p.id && (
                                                            <div className="w-6 h-6 rounded-lg bg-brand-500 flex items-center justify-center shadow-lg">
                                                                <Check className="w-4 h-4 text-white"/>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className={cn(
                                                        "text-xs font-bold uppercase tracking-widest",
                                                        plan === p.id ? "text-brand-500" : "text-text-tertiary"
                                                    )}>{p.id === 'free' ? '₹0' : `₹${p.monthlyPrice}/mo`}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-bg-base rounded-[2rem] p-8 border border-border-subtle relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1.5 h-full primary-button-gradient"></div>
                                        <h4 className="font-bold text-[10px] uppercase tracking-widest mb-6 text-text-tertiary">Registration Summary</h4>
                                        <div className="space-y-4 font-bold text-base">
                                            <div className="flex justify-between text-text-secondary"><span>Store:</span> <span className="text-text-primary">{storeName}</span></div>
                                            <div className="flex justify-between text-text-secondary"><span>Owner:</span> <span className="text-text-primary">{ownerName}</span></div>
                                            <div className="flex justify-between text-text-secondary"><span>Plan:</span> <span className="text-brand-500 uppercase">{plan}</span></div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="mt-12 flex gap-4">
                            {step > 1 && (
                                <button 
                                    type="button" 
                                    onClick={prevStep} 
                                    className="w-1/4 py-4 rounded-xl border border-border-subtle text-text-primary font-bold uppercase tracking-widest hover:bg-bg-base transition-all active:scale-95 flex items-center justify-center"
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                            )}
                            <button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="flex-1 flex items-center justify-center gap-3 py-4 rounded-xl primary-button-gradient text-white font-bold uppercase tracking-widest shadow-2xl shadow-brand-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                {isSubmitting ? 'Processing...' : step === 3 ? 'Register & Verify' : 'Next Step'}
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </form>
                </motion.div>

                <div className="text-center mt-12">
                    <p className="text-xs text-text-tertiary font-bold uppercase tracking-widest">
                        Already have an account? <Link to="/login" className="text-brand-500 hover:underline ml-1">Login here</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

function InputField({ label, value, onChange, placeholder, type = "text", icon, required = true }: { label: string, value: string, onChange: (v: string) => void, placeholder: string, type?: string, icon: React.ReactNode, required?: boolean }) {
    return (
        <div>
            <label className="block text-[10px] font-bold text-text-tertiary mb-3 uppercase tracking-widest">{label}</label>
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-text-tertiary group-focus-within:text-brand-500 transition-colors">
                    {icon}
                </div>
                <input 
                    required 
                    value={value} 
                    onChange={(e) => onChange(e.target.value)} 
                    type={type} 
                    className="w-full pl-14 pr-5 py-4 rounded-xl border border-border-subtle bg-bg-base text-text-primary focus:ring-2 focus:ring-brand-500 outline-none transition-all font-bold placeholder:text-text-tertiary" 
                    placeholder={placeholder} 
                />
            </div>
        </div>
    );
}
