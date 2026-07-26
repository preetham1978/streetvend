import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MessageSquare, Send, CheckCircle2, Phone, MessageCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ReEngagementModalProps {
    vendor: any | null;
    onClose: () => void;
}

export default function ReEngagementModal({ vendor, onClose }: ReEngagementModalProps) {
    if (!vendor) return null;

    const templates = [
        {
            id: 'miss-you',
            label: 'We Miss You',
            message: `Hi ${vendor.vendor_name}, we noticed you haven't used StreetVend for ${vendor.days_inactive} days. Is there anything we can help you with to get back on track?`
        },
        {
            id: 'offer',
            label: 'Special Offer',
            message: `Hi ${vendor.vendor_name}, as a valued ${vendor.plan_tier} partner, we'd love to help you optimize your sales this week. Let's chat!`
        },
        {
            id: 'feedback',
            label: 'Feedback Request',
            message: `Hi ${vendor.vendor_name}, we're always looking to improve. Since you've been inactive for a few days, could you let us know if you faced any issues?`
        }
    ];

    const [selectedTemplate, setSelectedTemplate] = React.useState(templates[0]);

    const handleSend = () => {
        // In a real app, this would trigger an API call or open WhatsApp
        const text = encodeURIComponent(selectedTemplate.message);
        window.open(`https://wa.me/?text=${text}`, '_blank');
        onClose();
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />
                
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-lg bg-bg-surface rounded-3xl shadow-2xl border border-border-subtle overflow-hidden"
                >
                    <div className="p-6 border-b border-border-subtle flex items-center justify-between bg-bg-surface-inset">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-500">
                                <MessageCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-display font-black text-lg text-text-primary">
                                    Re-engage Vendor
                                </h3>
                                <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest">
                                    {vendor.vendor_name} · {vendor.plan_tier}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-lg hover:bg-bg-surface text-text-tertiary">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">
                                Choose a Message Template
                            </label>
                            <div className="grid grid-cols-1 gap-2">
                                {templates.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setSelectedTemplate(t)}
                                        className={cn(
                                            "p-4 rounded-2xl text-left border transition-all",
                                            selectedTemplate.id === t.id 
                                                ? "bg-brand-500/10 border-brand-500 shadow-sm" 
                                                : "bg-bg-surface-inset border-border-subtle hover:border-text-tertiary"
                                        )}
                                    >
                                        <p className="text-xs font-black text-text-primary mb-1">{t.label}</p>
                                        <p className="text-[11px] text-text-secondary leading-relaxed line-clamp-2">{t.message}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-bg-surface border border-border-subtle">
                            <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest block mb-2">
                                Preview Message
                            </label>
                            <textarea 
                                className="w-full h-24 bg-transparent border-none focus:ring-0 text-sm font-medium text-text-primary resize-none"
                                value={selectedTemplate.message}
                                onChange={(e) => setSelectedTemplate({...selectedTemplate, message: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="p-6 bg-bg-surface-inset border-t border-border-subtle flex gap-3">
                        <button 
                            onClick={onClose}
                            className="flex-1 py-3.5 rounded-2xl border border-border-subtle text-text-primary font-black text-xs uppercase tracking-widest hover:bg-bg-surface transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSend}
                            className="flex-[2] py-3.5 bg-brand-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            <Send className="w-4 h-4" />
                            Send Message
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
