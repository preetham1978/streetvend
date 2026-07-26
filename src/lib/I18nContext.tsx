import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type Language = 'en' | 'hi' | 'ta' | 'kn';

interface I18nContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
    en: {
        'metadata.tagline': 'Streetvend Powered by VeloAI\'s Intelligence',
        'nav.home': 'Home',
        'nav.plans': 'Plans',
        'nav.vendorLogin': 'Vendor Login',
        'nav.register': 'Register',
        'nav.logoutAdmin': 'Logout Admin',
        'nav.dashboard': 'Dashboard',
        'nav.products': 'Products',
        'nav.cart': 'Cart',
        'nav.aiAssistant': 'AI Assistant',
        'nav.aiInsights': 'AI Insights',
        
        'footer.tagline': 'Streetvend Powered by VeloAI\'s Intelligence. Manage street food carts, kirana stores, meat shops, and fresh produce sellers — products, billing, WhatsApp, analytics & smart insights.',
        'footer.quickLinks': 'Quick Links',
        'footer.platform': 'Platform',
        'footer.copyright': '© 2026 VeloAI\'s - Streetvend · Streetvend Powered by VeloAI\'s Intelligence',
        
        'home.hero.title1': 'Your Street',
        'home.hero.title2': 'Cart,',
        'home.hero.title3': 'Now',
        'home.hero.title4': 'Digital',
        'home.hero.subtitle': 'Manage your street food cart, veggie stall, meat shop or kirana store with ease. Add products, create bills, and send via WhatsApp — all from your phone.',
        'home.hero.cta.start': 'Start Selling Free',
        'home.hero.cta.plans': 'View Plans',
        'home.hero.stats.vendors': '5K+ Vendors',
        'home.hero.stats.bills': '1.2L+ Bills Sent',
        'home.hero.stats.wa': 'WA Integrated',
        
        'home.categories.title': 'Built for Every Kind of Vendor',
        'home.categories.subtitle': 'Whether you sell chaat or chicken, tomatoes or toothpaste — Streetvend works for you.',
        'home.features.title': 'Everything You Need to Sell Smarter',
        'home.features.subtitle': 'Simple tools + AI intelligence designed for the way street vendors actually work.',
        'home.steps.title': 'Get Started in 3 Simple Steps',
        'home.ai.badge': 'AI Powered',
        'home.ai.title': 'Run your cart like a smart business',
        'home.ai.subtitle': 'Forecasting, stock predictions, customer intelligence, and natural-language business chat — built into every vendor dashboard.',
        'home.final.title': 'Ready to Go Digital?',
        'home.final.subtitle': 'Join thousands of street vendors who are already managing their business smarter with Streetvend.',
        
        'plans.title': 'Choose Your Plan',
        'plans.subtitle': 'Start free. Upgrade with secure UPI, card, or net banking — payments go to VeloAI and unlock AI pricing, analytics, multi-device login, and more.',
        'plans.free': 'Free',
        'plans.starter': 'Starter',
        'plans.professional': 'Professional',
        'plans.enterprise': 'Enterprise',
    },
    hi: {
        'nav.home': 'होम',
        'nav.plans': 'प्लान्स',
        'nav.vendorLogin': 'विक्रेता लॉगिन',
        'nav.register': 'रजिस्टर',
        'nav.logoutAdmin': 'एडमिन लॉगआउट',
        'nav.dashboard': 'डैशबोर्ड',
        'nav.products': 'उत्पाद',
        'nav.cart': 'कार्ट',
        'nav.aiAssistant': 'AI सहायक',
        'nav.aiInsights': 'AI इनसाइट्स',
        
        'footer.tagline': 'VeloAI की बुद्धिमत्ता द्वारा संचालित Streetvend। स्ट्रीट फूड कार्ट, किराना स्टोर, मांस की दुकानों और ताजे उत्पादों के विक्रेताओं का प्रबंधन करें।',
        'footer.quickLinks': 'त्वरित लिंक',
        'footer.platform': 'प्लेटफार्म',
        'footer.copyright': '© 2026 VeloAI\'s - Streetvend',
        
        'home.hero.title1': 'आपकी सड़क',
        'home.hero.title2': 'कार्ट,',
        'home.hero.title3': 'अब',
        'home.hero.title4': 'डिजिटल',
        'home.hero.subtitle': 'अपने स्ट्रीट फूड कार्ट, सब्जी स्टाल, मांस की दुकान या किराना स्टोर को आसानी से प्रबंधित करें। उत्पाद जोड़ें, बिल बनाएं और व्हाट्सएप के माध्यम से भेजें।',
        'home.hero.cta.start': 'मुफ्त में शुरू करें',
        'home.hero.cta.plans': 'प्लान देखें',
        
        'home.categories.title': 'हर तरह के विक्रेता के लिए निर्मित',
        'home.categories.subtitle': 'चाहे आप चाट बेचते हों या चिकन, टमाटर या टूथपेस्ट — Streetvend आपके लिए काम करता है।',
        'home.features.title': 'वह सब कुछ जो आपको स्मार्ट बेचने के लिए चाहिए',
        'home.features.subtitle': 'सरल उपकरण + AI बुद्धिमत्ता स्ट्रीट विक्रेताओं के काम करने के तरीके के लिए डिज़ाइन की गई है।',
        'home.final.title': 'डिजिटल होने के लिए तैयार हैं?',
        'home.final.subtitle': 'उन हजारों स्ट्रीट विक्रेताओं में शामिल हों जो पहले से ही Streetvend के साथ अपने व्यवसाय को स्मार्ट तरीके से प्रबंधित कर रहे हैं।',
    },
    ta: {
        'nav.home': 'முகப்பு',
        'nav.plans': 'திட்டங்கள்',
        'nav.vendorLogin': 'விற்பனையாளர் உள்நுழைவு',
        'nav.register': 'பதிவு',
        'nav.logoutAdmin': 'நிர்வாகி வெளியேறு',
        'nav.dashboard': 'டாஷ்போர்டு',
        'nav.products': 'தயாரிப்புகள்',
        'nav.cart': 'கூடை',
        'nav.aiAssistant': 'AI உதவியாளர்',
        'nav.aiInsights': 'AI நுண்ணறிவு',
        
        'footer.tagline': 'VeloAI நுண்ணறிவால் இயக்கப்படும் Streetvend. தெருவோர உணவுக் கூடைகள், மளிகைக் கடைகள், இறைச்சிக் கடைகள் மற்றும் புதிய உற்பத்தி விற்பனையாளர்களை நிர்வகிக்கவும்.',
        'footer.quickLinks': 'விரைவான இணைப்புகள்',
        'footer.platform': 'தளம்',
        'footer.copyright': '© 2026 VeloAI\'s - Streetvend',
        
        'home.hero.title1': 'உங்கள் தெரு',
        'home.hero.title2': 'வண்டி,',
        'home.hero.title3': 'இப்போது',
        'home.hero.title4': 'டிஜிட்டல்',
        'home.hero.subtitle': 'உங்கள் தெருவோர உணவுக் கூடை, காய்கறி கடை, இறைச்சிக் கடை அல்லது மளிகைக் கடையை எளிதாக நிர்வகிக்கவும்.',
        'home.hero.cta.start': 'இலவசமாக தொடங்கவும்',
        'home.hero.cta.plans': 'திட்டங்களைப் பார்க்கவும்',
    },
    kn: {
        'nav.home': 'ಮುಖಪುಟ',
        'nav.plans': 'ಯೋಜನೆಗಳು',
        'nav.vendorLogin': 'ಮಾರಾಟಗಾರರ ಲಾಗಿನ್',
        'nav.register': 'ನೋಂದಣಿ',
        'nav.logoutAdmin': 'ನಿರ್ವಾಹಕ ಲಾಗೌಟ್',
        'nav.dashboard': 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
        'nav.products': 'ಉತ್ಪನ್ನಗಳು',
        'nav.cart': 'ಕಾರ್ಟ್',
        'nav.aiAssistant': 'AI ಸಹಾಯಕ',
        'nav.aiInsights': 'AI ಒಳನೋಟಗಳು',
        
        'footer.tagline': 'VeloAI ಬುದ್ಧಿವಂತಿಕೆಯಿಂದ ನಡೆಸಲ್ಪಡುವ Streetvend. ಬೀದಿ ಆಹಾರ ಕಾರ್ಟ್‌ಗಳು, ಕಿರಾಣಿ ಅಂಗಡಿಗಳು, ಮಾಂಸದ ಅಂಗಡಿಗಳು ಮತ್ತು ತಾಜಾ ಉತ್ಪನ್ನಗಳ ಮಾರಾಟಗಾರರನ್ನು ನಿರ್ವಹಿಸಿ.',
        'footer.quickLinks': 'ತ್ವರಿತ ಲಿಂಕ್‌ಗಳು',
        'footer.platform': 'ಪ್ಲಾಟ್‌ಫಾರ್ಮ್',
        'footer.copyright': '© 2026 VeloAI\'s - Streetvend',
        
        'home.hero.title1': 'ನಿಮ್ಮ ರಸ್ತೆ',
        'home.hero.title2': 'ಕಾರ್ಟ್,',
        'home.hero.title3': 'ಈಗ',
        'home.hero.title4': 'ಡಿಜಿಟಲ್',
        'home.hero.subtitle': 'ನಿಮ್ಮ ಬೀದಿ ಆಹಾರ ಕಾರ್ಟ್, ತರಕಾರಿ ಸ್ಟಾಲ್, ಮಾಂಸದ ಅಂಗಡಿ ಅಥವಾ ಕಿರಾಣಿ ಅಂಗಡಿಯನ್ನು ಸುಲಭವಾಗಿ ನಿರ್ವಹಿಸಿ.',
        'home.hero.cta.start': 'ಉಚಿತವಾಗಿ ಪ್ರಾರಂಭಿಸಿ',
        'home.hero.cta.plans': 'ಯೋಜನೆಗಳನ್ನು ನೋಡಿ',
    }
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState<Language>('en');

    useEffect(() => {
        const storedLang = localStorage.getItem('streetvend_lang') as Language;
        if (storedLang && ['en', 'hi', 'ta', 'kn'].includes(storedLang)) {
            setLanguage(storedLang);
        }
    }, []);

    const handleSetLanguage = (lang: Language) => {
        setLanguage(lang);
        localStorage.setItem('streetvend_lang', lang);
    };

    const t = (key: string) => {
        return translations[language][key] || translations['en'][key] || key;
    };

    return (
        <I18nContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    const context = useContext(I18nContext);
    if (context === undefined) {
        throw new Error('useI18n must be used within an I18nProvider');
    }
    return context;
}
