import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

const translations = {
  en: {
    title: 'QueueCure SmartReturn',
    tagline: 'Clinic wait-time intelligence',
    yourToken: 'YOUR TOKEN',
    currentlySeeing: 'Currently Seeing',
    tokensAhead: 'Tokens Ahead of You',
    estimatedWait: 'Approx. Wait Time',
    returnBy: 'Return By',
    status: 'SmartReturn Advice',
    queueStatus: 'Queue Status',
    timeline: 'Live Timeline',
    language: 'Language',
    minutes: 'minutes',
    noWait: 'Immediate service',
    refreshing: 'Syncing live...',
    reconnecting: 'Connection lost. Reconnecting...',
    synced: 'Synced successfully',
    
    // SmartReturn Statuses
    PLEASE_ENTER: 'Please enter consultation room',
    YOU_ARE_NEXT: 'You are next. Please be ready',
    START_RETURNING: 'Start returning to clinic',
    STAY_NEARBY: 'Stay nearby / waiting room',
    SAFE_TO_LEAVE: 'Safe to wait outside/leave nearby',
    MISSED_TURN: 'You missed your turn. Contact reception',
    WAITING: 'Waiting in queue',

    // Messages
    welcome: 'Welcome to Sri Care Clinic',
    scanQr: 'Scan QR to track your live queue',
  },
  ta: {
    title: 'கியூக்யூர் ஸ்மார்ட்ரிட்டர்ன்',
    tagline: 'கிளினிக் காத்திருப்பு நேர கண்காணிப்பு',
    yourToken: 'உங்கள் டோக்கன்',
    currentlySeeing: 'இப்போது பார்க்கும் டோக்கன்',
    tokensAhead: 'உங்களுக்கு முன்னால் உள்ள டோக்கன்கள்',
    estimatedWait: 'மதிப்பிடப்பட்ட நேரம்',
    returnBy: 'திரும்பி வர வேண்டிய நேரம்',
    status: 'பாதுகாப்பு அறிவுறுத்தல்',
    queueStatus: 'வரிசை நிலை',
    timeline: 'நேரடி நகர்வுகள்',
    language: 'மொழி',
    minutes: 'நிமிடங்கள்',
    noWait: 'உடனடி சேவை',
    refreshing: 'இணைக்கப்படுகிறது...',
    reconnecting: 'இணைய இணைப்பு துண்டிக்கப்பட்டது. மீள இணைக்கப்படுகிறது...',
    synced: 'வெற்றிகரமாக இணைக்கப்பட்டது',

    // SmartReturn Statuses
    PLEASE_ENTER: 'ஆலோசனை அறைக்குள் நுழையவும்',
    YOU_ARE_NEXT: 'அடுத்தது உங்கள் டோக்கன். தயாராக இருக்கவும்',
    START_RETURNING: 'கிளினிக்கிற்கு திரும்ப வரத் தொடங்கவும்',
    STAY_NEARBY: 'அருகில் காத்திருக்கவும்',
    SAFE_TO_LEAVE: 'வெளியே காத்திருக்கலாம் / பின்னர் வரலாம்',
    MISSED_TURN: 'டோக்கன் தவறவிடப்பட்டது. வரவேற்பறை அணுகவும்',
    WAITING: 'வரிசையில் காத்திருக்கிறது',

    // Messages
    welcome: 'ஸ்ரீ கேர் கிளினிக்கிற்கு வரவேற்கிறோம்',
    scanQr: 'உங்கள் வரிசையை கண்காணிக்க QR குறியீட்டை ஸ்கேன் செய்க',
  }
};

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('queuecure_lang') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('queuecure_lang', lang);
  }, [lang]);

  const t = (key) => {
    return translations[lang][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
};
