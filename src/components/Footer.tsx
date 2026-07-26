import { Link } from 'react-router-dom';
import { useI18n } from '../lib/I18nContext';
import { Store, MessageCircle, BarChart3, Receipt, ScanBarcode } from 'lucide-react';

export default function Footer() {
    const { t } = useI18n();

    return (
        <footer className="border-t border-border-subtle bg-bg-base pt-16 pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                    <div className="md:col-span-2">
                        <Link to="/" className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center text-white">
                                <Store className="w-6 h-6" />
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-1 leading-tight">
                                    <span className="font-display font-bold text-xl text-text-primary">Velo</span>
                                    <span className="font-display font-bold text-xl text-brand-500">AI's</span>
                                    <span className="font-display font-bold text-xl text-brand-500">- Streetvend</span>
                                </div>
                            </div>
                        </Link>
                        <p className="text-text-secondary text-sm leading-relaxed max-w-sm">
                            {t('footer.tagline')}
                        </p>
                    </div>

                    <div>
                        <h3 className="font-semibold text-text-primary mb-6 uppercase tracking-wider text-xs">
                            {t('footer.quickLinks')}
                        </h3>
                        <ul className="space-y-4 text-sm">
                            <li><Link to="/register" className="text-text-secondary hover:text-brand-500 transition-colors">Register as Vendor</Link></li>
                            <li><Link to="/login" className="text-text-secondary hover:text-brand-500 transition-colors">Vendor Login</Link></li>
                            <li><Link to="/plans" className="text-text-secondary hover:text-brand-500 transition-colors">Pricing Plans</Link></li>
                            <li><Link to="/admin" className="text-text-secondary hover:text-brand-500 transition-colors">Admin Portal</Link></li>
                            <li><a href="#" className="text-text-secondary hover:text-brand-500 transition-colors">Supabase DB setup (step-by-step)</a></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold text-text-primary mb-6 uppercase tracking-wider text-xs">
                            {t('footer.platform')}
                        </h3>
                        <ul className="space-y-4 text-sm">
                            <li className="flex items-center gap-2 text-text-secondary">
                                <MessageCircle className="w-4 h-4 text-accent-green" /> WhatsApp Billing
                            </li>
                            <li className="flex items-center gap-2 text-text-secondary">
                                <BarChart3 className="w-4 h-4 text-accent-pink" /> AI Smart Pricing
                            </li>
                            <li className="flex items-center gap-2 text-text-secondary">
                                <Receipt className="w-4 h-4 text-accent-blue" /> Sales Analytics
                            </li>
                            <li className="flex items-center gap-2 text-text-secondary">
                                <ScanBarcode className="w-4 h-4 text-accent-purple" /> Barcode Scanner
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-border-subtle text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-text-tertiary">
                        {t('footer.copyright')}
                    </p>
                </div>
            </div>
        </footer>
    );
}
