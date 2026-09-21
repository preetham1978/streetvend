import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type Language = 'en' | 'hi' | 'ta' | 'kn' | 'te' | 'mr';

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

        'trust.title': 'Business Health Score',
        'trust.regularly': 'How regularly you sell',
        'trust.steady': 'How steady your daily income is',
        'trust.growing': 'Whether your sales are growing',
        'trust.upi': 'How much you use UPI vs cash',
        'trust.tenure': "How long you've used StreetVend",
        'trust.reliability': 'How few orders get cancelled',
        'trust.notEnoughData': 'Keep using StreetVend daily — your Business Health Score unlocks after 14 days of activity.',
        'trust.consistencyTip': 'Selling 4 more days a month would raise this by ~3 points',
        'trust.stabilityTip': 'Keep your daily sales consistent; avoiding zero-revenue days will raise this score',
        'trust.growthTip': 'Increasing daily sales compared to last month will boost your growth score',
        'trust.digitalTip': 'Encouraging UPI payments over cash helps build your digital track record',
        'trust.tenureTip': 'This score will grow automatically as you spend more months on the platform',
        'trust.reliabilityTip': 'Fulfill all incoming orders to maintain a high reliability score',
        'trust.comingSoon': 'Lending Partners Integration (Coming Soon)',
        'trust.shareReport': 'Share PDF Report with Lenders',
        'trust.premiumOnly': 'Shareable PDF report is a Premium feature. Upgrade to unlock!'
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

        'trust.title': 'व्यापार स्वास्थ्य स्कोर',
        'trust.regularly': 'आप कितनी नियमितता से बेचते हैं',
        'trust.steady': 'आपकी दैनिक आय कितनी स्थिर है',
        'trust.growing': 'क्या आपकी बिक्री बढ़ रही है',
        'trust.upi': 'आप कैश के मुकाबले यूपीआई का कितना उपयोग करते हैं',
        'trust.tenure': 'आप कब से स्ट्रीटवेंड का उपयोग कर रहे हैं',
        'trust.reliability': 'आपके कितने कम ऑर्डर रद्द होते हैं',
        'trust.notEnoughData': 'स्ट्रीटवेंड का दैनिक उपयोग जारी रखें - 14 दिनों की गतिविधि के बाद आपका व्यापार स्वास्थ्य स्कोर अनलॉक हो जाएगा।',
        'trust.consistencyTip': 'महीने में 4 दिन और बेचने से यह स्कोर लगभग 3 अंक बढ़ जाएगा',
        'trust.stabilityTip': 'अपनी दैनिक बिक्री को स्थिर रखें; शून्य-राजस्व वाले दिनों से बचने से यह स्कोर बढ़ेगा',
        'trust.growthTip': 'पिछले महीने की तुलना में दैनिक बिक्री बढ़ाने से आपके विकास स्कोर को बढ़ावा मिलेगा',
        'trust.digitalTip': 'कैश के बजाय यूपीआई भुगतानों को बढ़ावा देने से आपका डिजिटल रिकॉर्ड मजबूत होगा',
        'trust.tenureTip': 'जैसे-जैसे आप प्लेटफॉर्म पर अधिक महीने बिताएंगे, यह स्कोर स्वचालित रूप से बढ़ेगा',
        'trust.reliabilityTip': 'उच्च विश्वसनीयता स्कोर बनाए रखने के लिए सभी आने वाले ऑर्डर्स को पूरा करें',
        'trust.comingSoon': 'ऋणदाता भागीदारी एकीकरण (जल्द ही आ रहा है)',
        'trust.shareReport': 'ऋणदाताओं के साथ पीडीएफ रिपोर्ट साझा करें',
        'trust.premiumOnly': 'साझा करने योग्य पीडीएफ रिपोर्ट एक प्रीमियम विशेषता है। अनलॉक करने के लिए अपग्रेड करें!'
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

        'trust.title': 'வணிக ஆரோக்கிய மதிப்பெண்',
        'trust.regularly': 'நீங்கள் எவ்வளவு வழக்கமாக விற்கிறீர்கள்',
        'trust.steady': 'உங்கள் தினசரி வருமானம் எவ்வளவு நிலையானது',
        'trust.growing': 'உங்கள் விற்பனை வளர்கிறதா இல்லையா',
        'trust.upi': 'பணத்திற்குப் பதிலாக நீங்கள் எவ்வளவு யுபிஐ பயன்படுத்துகிறீர்கள்',
        'trust.tenure': 'நீங்கள் எவ்வளவு காலமாக ஸ்ட்ரீட்வெண்ட் பயன்படுத்துகிறீர்கள்',
        'trust.reliability': 'எவ்வளவு குறைவான ஆர்டர்கள் ரத்து செய்யப்படுகின்றன',
        'trust.notEnoughData': 'ஸ்ட்ரீட்வெண்ட்டை தினமும் பயன்படுத்துங்கள் — 14 நாட்கள் செயல்பாட்டிற்குப் பிறகு உங்கள் வணிக ஆரோக்கிய மதிப்பெண் திறக்கப்படும்.',
        'trust.consistencyTip': 'மாதத்திற்கு இன்னும் 4 நாட்கள் விற்பது இதை ~3 புள்ளிகள் அதிகரிக்கும்',
        'trust.stabilityTip': 'உங்கள் தினசரி விற்பனையை சீராக வைத்திருங்கள்; பூஜ்ஜிய வருவாய் நாட்களைத் தவிர்ப்பது இந்த மதிப்பெண்ணை உயர்த்தும்',
        'trust.growthTip': 'கடந்த மாதத்துடன் ஒப்பிடும்போது தினசரி விற்பனையை அதிகரிப்பது உங்கள் வளர்ச்சி மதிப்பெண்ணை உயர்த்தும்',
        'trust.digitalTip': 'பணத்திற்குப் பதிலாக யுபிஐ கொடுப்பனவுகளை ஊக்குவிப்பது உங்கள் டிஜிட்டல் பதிவை உருவாக்க உதவுகிறது',
        'trust.tenureTip': 'நீங்கள் மேடையில் அதிக மாதங்கள் செலவிடும்போது இந்த மதிப்பெண் தானாகவே வளரும்',
        'trust.reliabilityTip': 'உயர் நம்பகத்தன்மை மதிப்பெண்ணைப் பராமரிக்க உள்வரும் அனைத்து ஆர்டர்களையும் நிறைவேற்றுங்கள்',
        'trust.comingSoon': 'கடன் கூட்டாளர் ஒருங்கமைப்பு (விரைவில்)',
        'trust.shareReport': 'கடன் வழங்குநர்களுடன் பிடிஎஃப் அறிக்கையைப் பகிரவும்',
        'trust.premiumOnly': 'பகிரக்கூடிய பிடிஎஃப் அறிக்கை ஒரு பிரீமியம் அம்சமாகும். திறக்க மேம்படுத்தவும்!'
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

        'trust.title': 'ವ್ಯವಹಾರ ಆರೋಗ್ಯ ಸ್ಕೋರ್',
        'trust.regularly': 'ನೀವು ಎಷ್ಟು ನಿಯಮಿತವಾಗಿ ಮಾರಾಟ ಮಾಡುತ್ತೀರಿ',
        'trust.steady': 'ನಿಮ್ಮ ದೈನಂದಿನ ಆದಾಯ ಎಷ್ಟು ಸ್ಥಿರವಾಗಿದೆ',
        'trust.growing': 'ನಿಮ್ಮ ಮಾರಾಟವು ಬೆಳೆಯುತ್ತಿದೆಯೇ',
        'trust.upi': 'ನಗದಿಗೆ ಹೋಲಿಸಿದರೆ ನೀವು ಎಷ್ಟು ಯುಪಿಐ ಬಳಸುತ್ತೀರಿ',
        'trust.tenure': 'ನೀವು ಎಷ್ಟು ಸಮಯದಿಂದ ಸ್ಟ್ರೀಟ್‌ವೆಂಡ್ ಬಳಸುತ್ತಿದ್ದೀರಿ',
        'trust.reliability': 'ಎಷ್ಟು ಕಡಿಮೆ ಆರ್ಡರ್‌ಗಳು ರದ್ದಾಗುತ್ತವೆ',
        'trust.notEnoughData': 'ಪ್ರತಿದಿನ ಸ್ಟ್ರೀಟ್‌ವೆಂಡ್ ಬಳಸಿ — 14 ದಿನಗಳ ಚಟುವಟಿಕೆಯ ನಂತರ ನಿಮ್ಮ ವ್ಯವಹಾರ ಆರೋಗ್ಯ ಸ್ಕೋರ್ ಅನ್‌ಲಾಕ್ ಆಗುತ್ತದೆ.',
        'trust.consistencyTip': 'ತಿಂಗಳಿಗೆ ಇನ್ನೂ 4 ದಿನಗಳು ಮಾರಾಟ ಮಾಡುವುದರಿಂದ ಇದನ್ನು ~3 ಅಂಕಗಳಷ್ಟು ಹೆಚ್ಚಿಸಬಹುದು',
        'trust.stabilityTip': 'ನಿಮ್ಮ ದೈನಂದಿನ ಮಾರಾಟವನ್ನು ಸ್ಥಿರವಾಗಿಡಿ; ಶೂನ್ಯ ಆದಾಯದ ದಿನಗಳನ್ನು ತಪ್ಪಿಸುವುದು ಈ ಸ್ಕೋರ್ ಹೆಚ್ಚಿಸುತ್ತದೆ',
        'trust.growthTip': 'ಕಳೆದ ತಿಂಗಳಿಗೆ ಹೋಲಿಸಿದರೆ ದೈನಂದಿನ ಮಾರಾಟವನ್ನು ಹೆಚ್ಚಿಸುವುದು ನಿಮ್ಮ ಬೆಳವಣಿಗೆಯ ಸ್ಕೋರ್ ಅನ್ನು ಹೆಚ್ಚಿಸುತ್ತದೆ',
        'trust.digitalTip': 'ನಗದಿನ ಬದಲು ಯುಪಿಐ ಪಾವತಿಗಳನ್ನು ಪ್ರೋತ್ಸಾಹಿಸುವುದು ನಿಮ್ಮ ಡಿಜಿಟಲ್ ದಾಖಲೆಯನ್ನು ನಿರ್ಮಿಸಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ',
        'trust.tenureTip': 'ನೀವು ವೇದಿಕೆಯಲ್ಲಿ ಹೆಚ್ಚಿನ ತಿಂಗಳುಗಳನ್ನು ಕಳೆದಂತೆ ಈ ಸ್ಕೋರ್ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಬೆಳೆಯುತ್ತದೆ',
        'trust.reliabilityTip': 'ಉನ್ನತ ವಿಶ್ವಾಸಾರ್ಹತೆ ಸ್ಕೋರ್ ಅನ್ನು ನಿರ್ವಹಿಸಲು ಎಲ್ಲಾ ಒಳಬರುವ ಆರ್ಡರ್‌ಗಳನ್ನು ಪೂರೈಸಿ',
        'trust.comingSoon': 'ಸಾಲ ಪಾಲುದಾರರ ಸಂಯೋಜನೆ (ಶೀಘ್ರದಲ್ಲೇ ಬರಲಿದೆ)',
        'trust.shareReport': 'ಸಾಲದಾತರೊಂದಿಗೆ ಪಿಡಿಎಫ್ ವರದಿ ಹಂಚಿಕೊಳ್ಳಿ',
        'trust.premiumOnly': 'ಹಂಚಿಕೊಳ್ಳಬಹುದಾದ ಪಿಡಿಎಫ್ ವರದಿ ಪ್ರೀಮಿಯಂ ವೈಶಿಷ್ಟ್ಯವಾಗಿದೆ. ಅನ್‌ಲಾಕ್ ಮಾಡಲು ಅಪ್‌ಗ್ರೇಡ್ ಮಾಡಿ!'
    },
    te: {
        'nav.home': 'హోమ్',
        'nav.plans': 'ప్లాన్లు',
        'nav.vendorLogin': 'విక్రేత లాగిన్',
        'nav.register': 'రిజిస్టర్',
        'nav.logoutAdmin': 'అడ్మిన్ లాగౌట్',
        'nav.dashboard': 'డ్యాష్‌బోర్డ్',
        'nav.products': 'ఉత్పత్తులు',
        'nav.cart': 'కార్ట్',
        'nav.aiAssistant': 'AI సహాయకుడు',
        'nav.aiInsights': 'AI అంతర్దృష్టులు',
        
        'footer.tagline': 'VeloAI మేధస్సుతో నడిచే Streetvend. వీధి ఆహార బండ్లు, కిరాణా దుకాణాలు, మాంసం దుకాణాలు మరియు తాజా ఉత్పత్తుల విక్రేతలను నిర్వహించండి.',
        'footer.quickLinks': 'త్వరిత లింకులు',
        'footer.platform': 'ప్లాట్‌ఫారమ్',
        'footer.copyright': '© 2026 VeloAI\'s - Streetvend',
        
        'home.hero.title1': 'మీ వీధి',
        'home.hero.title2': 'బండి,',
        'home.hero.title3': 'ఇప్పుడు',
        'home.hero.title4': 'డిజిటల్',
        'home.hero.subtitle': 'మీ వీధి ఆహార బండి, కూరగాయల స్టాల్, మాంసం దుకాణం లేదా కిరాణా దుకాణాన్ని సులభంగా నిర్వహించండి.',
        'home.hero.cta.start': 'ఉచితంగా ప్రారంభించండి',
        'home.hero.cta.plans': 'ప్లాన్లను చూడండి',

        'trust.title': 'వ్యాపార ఆరోగ్య స్కోర్',
        'trust.regularly': 'మీరు ఎంత క్రమం తప్పకుండా విక్రయిస్తున్నారు',
        'trust.steady': 'మీ రోజువారీ ఆదాయం ఎంత స్థిరంగా ఉంది',
        'trust.growing': 'మీ విక్రయాలు పెరుగుతున్నాయా',
        'trust.upi': 'నగదుతో పోలిస్తే మీరు UPI ఎంత ఉపయోగిస్తున్నారు',
        'trust.tenure': 'మీరు ఎంతకాలంగా స్ట్రీట్‌వెండ్ ఉపయోగిస్తున్నారు',
        'trust.reliability': 'ఎంత తక్కువ ఆర్డర్‌లు రద్దవుతున్నాయి',
        'trust.notEnoughData': 'స్ట్రీట్‌వెండ్‌ను ప్రతిరోజూ ఉపయోగించడం కొనసాగించండి — 14 రోజుల యాక్టివిటీ తర్వాత మీ వ్యాపార ఆరోగ్య స్కోర్ అన్‌లాక్ అవుతుంది.',
        'trust.consistencyTip': 'నెలలో మరో 4 రోజులు విక్రయించడం వల్ల ఈ స్కోరు ~3 పాయింట్లు పెరుగుతుంది',
        'trust.stabilityTip': 'మీ రోజువారీ విక్రయాలను స్థిరంగా ఉంచండి; సున్నా-ఆదాయ రోజులను నివారించడం ఈ స్కోర్‌ను పెంచుతుంది',
        'trust.growthTip': 'గత నెలతో పోలిస్తే రోజువారీ విక్రయాలను పెంచడం మీ వృద్ధి స్కోర్‌ను పెంచుతుంది',
        'trust.digitalTip': 'నగదు కంటే UPI చెల్లింపులను ప్రోత్సహించడం మీ డిజిటల్ ట్రాక్ రికార్డ్‌ను నిర్మించడంలో సహాయపడుతుంది',
        'trust.tenureTip': 'మీరు ప్లాట్‌ఫారమ్‌లో ఎక్కువ నెలలు గడిపేకొద్దీ ఈ స్కోరు స్వయంచాలితంగా పెరుగుతుంది',
        'trust.reliabilityTip': 'అధిక విశ్వసనీయత స్కోర్‌ను నిర్వహించడానికి వచ్చే అన్ని ఆర్డర్‌లను పూర్తి చేయండి',
        'trust.comingSoon': 'రుణ భాగస్వామ్యాల అనుసంధానం (త్వరలో రానుంది)',
        'trust.shareReport': 'రుణదాతలతో పిడిఎఫ్ నివేదికను పంచుకోండి',
        'trust.premiumOnly': 'భాగస్వామ్యం చేయగల పిడిఎఫ్ నివేదిక ప్రీమియం ఫీచర్. అన్‌లాక్ చేయడానికి అప్‌గ్రేడ్ చేయండి!'
    },
    mr: {
        'nav.home': 'होम',
        'nav.plans': 'प्लॅन्स',
        'nav.vendorLogin': 'विक्रेता लॉगिन',
        'nav.register': 'रजिस्टर',
        'nav.logoutAdmin': 'अ‍ॅडमिन लॉगआउट',
        'nav.dashboard': 'डॅशबोर्ड',
        'nav.products': 'उत्पादने',
        'nav.cart': 'कार्ट',
        'nav.aiAssistant': 'AI सहाय्यक',
        'nav.aiInsights': 'AI इनसाइट्स',
        
        'footer.tagline': 'VeloAI च्या बुद्धिमत्तेद्वारे समर्थित Streetvend. स्ट्रीट फूड कार्ट, किराणा दुकान, मांस दुकान आणि ताज्या उत्पादनांच्या विक्रेत्यांचे व्यवस्थापन करा.',
        'footer.quickLinks': 'क्विक लिंक्स',
        'footer.platform': 'प्लॅटफॉर्म',
        'footer.copyright': '© 2026 VeloAI\'s - Streetvend',
        
        'home.hero.title1': 'तुमचा रस्ता',
        'home.hero.title2': 'कार्ट,',
        'home.hero.title3': 'आता',
        'home.hero.title4': 'डिजिटल',
        'home.hero.subtitle': 'तुमची स्ट्रीट फूड कार्ट, भाजीपाला स्टॉल, मांसाचे दुकान किंवा किराणा दुकान सहज व्यवस्थापित करा.',
        'home.hero.cta.start': 'मोफत सुरू करा',
        'home.hero.cta.plans': 'प्लॅन्स पहा',

        'trust.title': 'व्यवसाय आरोग्य स्कोअर',
        'trust.regularly': 'तुम्ही किती नियमितपणे विक्री करता',
        'trust.steady': 'तुमचे दैनंदिन उत्पन्न किती स्थिर आहे',
        'trust.growing': 'तुमची विक्री वाढत आहे का',
        'trust.upi': 'रोखीच्या तुलनेत तुम्ही युपीआयचा किती वापर करता',
        'trust.tenure': 'तुम्ही किती काळापासून स्ट्रीटवेंड वापरत आहात',
        'trust.reliability': 'तुमच्या किती कमी ऑर्डर्स रद्द होतात',
        'trust.notEnoughData': 'स्ट्रीटवेंडचा रोज वापर करा - १४ दिवसांच्या सक्रियतेनंतर तुमचा व्यवसाय आरोग्य स्कोअर अनलॉक होईल.',
        'trust.consistencyTip': 'महिन्यात आणखी ४ दिवस विक्री केल्यास हा स्कोअर ~३ अंकांनी वाढेल',
        'trust.stabilityTip': 'तुमची दैनंदिन विक्री स्थिर ठेवा; शून्य-उत्पन्नाचे दिवस टाळल्यास हा स्कोअर वाढेल',
        'trust.growthTip': 'मागील महिन्याच्या तुलनेत दैनंदिन विक्री वाढवल्यास तुमच्या वाढीचा स्कोअर वाढेल',
        'trust.digitalTip': 'रोखीऐवजी यूपीआय पेमेंटला प्रोत्साहन दिल्याने तुमचा डिजिटल रेकॉर्ड मजबूत होईल',
        'trust.tenureTip': 'तुम्ही प्लॅटफॉर्मवर अधिक महिने घालवल्यास हा स्कोअर आपोआप वाढेल',
        'trust.reliabilityTip': 'उच्च विश्वसनीयता स्कोअर राखण्यासाठी सर्व येणाऱ्या ऑर्डर्स पूर्ण करा',
        'trust.comingSoon': 'कर्जदार भागीदारी एकत्रीकरण (लवकरच येत आहे)',
        'trust.shareReport': 'कर्जदारांसह पीडीएफ अहवाल सामायिक करा',
        'trust.premiumOnly': 'सामायिक करण्यायोग्य पीडीएफ अहवाल हे एक प्रीमियम वैशिष्ट्य आहे. अनलॉक करण्यासाठी अपग्रेड करा!'
    }
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState<Language>('en');

    useEffect(() => {
        const storedLang = localStorage.getItem('streetvend_lang') as Language;
        if (storedLang && ['en', 'hi', 'ta', 'kn', 'te', 'mr'].includes(storedLang)) {
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
