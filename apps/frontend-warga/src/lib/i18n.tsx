import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Locale = 'id' | 'su' | 'en';

const STORAGE_KEY = 'sipera_locale';

const TRANSLATIONS: Record<Locale, Record<string, string>> = {
  id: {
    'login.title': 'Sipera — Masuk',
    'login.subtitle': 'Sistem Perizinan Tata Ruang Bandung',
    'login.no_telp': 'No. Handphone',
    'login.password': 'Password',
    'login.submit': 'Masuk',
    'login.submitting': 'Memproses...',
    'login.hint': 'Demo: 081234567890 / Masuk123@',
    'login.error.title': 'Gagal masuk',
    'public_map.button': '🗺️ Jelajah Peta Publik',

    'dashboard.title': 'Sipera',
    'dashboard.logout': 'Keluar',
    'dashboard.permohonan_saya': 'Permohonan Saya',
    'dashboard.permohonan_baru': '+ Permohonan Baru',
    'dashboard.membuat': 'Membuat...',
    'dashboard.memuat': 'Memuat...',
    'dashboard.belum_ada': 'Belum ada permohonan.',
    'dashboard.belum_ada_hint': 'Klik "+ Permohonan Baru" untuk mulai.',

    'wizard.title': 'Permohonan Baru',
    'wizard.kembali': '← Kembali',
    'wizard.sebelumnya': '← Sebelumnya',
    'wizard.selanjutnya': 'Selanjutnya →',
    'wizard.submit': '✓ Submit Permohonan',
    'wizard.submitting': 'Mengirim...',
    'wizard.step.pemohon': 'Pemohon',
    'wizard.step.lahan': 'Lahan',
    'wizard.step.perusahaan': 'Perusahaan',
    'wizard.step.peta': 'Peta',
    'wizard.step.dokumen': 'Dokumen',

    'map.legend.title': 'Legend Zona',
    'map.public_title': '🗺️ Peta Zona RDTR Bandung',
    'map.public_sub': 'Jelajah zona tata ruang publik — tanpa perlu login',

    'common.loading': 'Memuat...',
    'common.close': 'Tutup',
  },

  su: {
    'login.title': 'Sipera — Asup',
    'login.subtitle': 'Sistem Perizinan Tata Ruang Bandung',
    'login.no_telp': 'No. HP',
    'login.password': 'Sandi',
    'login.submit': 'Asup',
    'login.submitting': 'Diproses...',
    'login.hint': 'Demo: 081234567890 / Masuk123@',
    'login.error.title': 'Gagal asup',
    'public_map.button': '🗺️ Jugjugkeun Peta Umum',

    'dashboard.title': 'Sipera',
    'dashboard.logout': 'Kaluar',
    'dashboard.permohonan_saya': 'Pamohonan Abdi',
    'dashboard.permohonan_baru': '+ Pamohonan Anyar',
    'dashboard.membuat': 'Nyieun...',
    'dashboard.memuat': 'Ngamuat...',
    'dashboard.belum_ada': 'Henteu acan aya pamohonan.',
    'dashboard.belum_ada_hint': 'Pencet "+ Pamohonan Anyar" pikeun ngamimitian.',

    'wizard.title': 'Pamohonan Anyar',
    'wizard.kembali': '← Mulang',
    'wizard.sebelumnya': '← Saméméhna',
    'wizard.selanjutnya': 'Salajengna →',
    'wizard.submit': '✓ Kintunkeun Pamohonan',
    'wizard.submitting': 'Ngirim...',
    'wizard.step.pemohon': 'Nu Mohon',
    'wizard.step.lahan': 'Lahan',
    'wizard.step.perusahaan': 'Pausahaan',
    'wizard.step.peta': 'Peta',
    'wizard.step.dokumen': 'Dokumén',

    'map.legend.title': 'Pituduh Warna Zona',
    'map.public_title': '🗺️ Peta Zona RDTR Bandung',
    'map.public_sub': 'Lalajo zona tata ruang umum — teu kedah asup',

    'common.loading': 'Ngamuat...',
    'common.close': 'Tutup',
  },

  en: {
    'login.title': 'Sipera — Sign In',
    'login.subtitle': 'Bandung Spatial Planning Permit System',
    'login.no_telp': 'Phone Number',
    'login.password': 'Password',
    'login.submit': 'Sign In',
    'login.submitting': 'Processing...',
    'login.hint': 'Demo: 081234567890 / Masuk123@',
    'login.error.title': 'Sign in failed',
    'public_map.button': '🗺️ Explore Public Map',

    'dashboard.title': 'Sipera',
    'dashboard.logout': 'Sign Out',
    'dashboard.permohonan_saya': 'My Applications',
    'dashboard.permohonan_baru': '+ New Application',
    'dashboard.membuat': 'Creating...',
    'dashboard.memuat': 'Loading...',
    'dashboard.belum_ada': 'No applications yet.',
    'dashboard.belum_ada_hint': 'Click "+ New Application" to start.',

    'wizard.title': 'New Application',
    'wizard.kembali': '← Back',
    'wizard.sebelumnya': '← Previous',
    'wizard.selanjutnya': 'Next →',
    'wizard.submit': '✓ Submit Application',
    'wizard.submitting': 'Submitting...',
    'wizard.step.pemohon': 'Applicant',
    'wizard.step.lahan': 'Land',
    'wizard.step.perusahaan': 'Business',
    'wizard.step.peta': 'Map',
    'wizard.step.dokumen': 'Documents',

    'map.legend.title': 'Zone Legend',
    'map.public_title': '🗺️ Bandung RDTR Zone Map',
    'map.public_sub': 'Explore public spatial planning zones — no login required',

    'common.loading': 'Loading...',
    'common.close': 'Close',
  },
};

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === 'undefined') return 'id';
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'id' || saved === 'su' || saved === 'en') return saved;
    return 'id';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, locale);
      document.documentElement.lang = locale;
    }
  }, [locale]);

  function setLocale(l: Locale) {
    setLocaleState(l);
  }

  function t(key: string): string {
    return TRANSLATIONS[locale][key] ?? TRANSLATIONS.id[key] ?? key;
  }

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}

const LOCALE_LABELS: Record<Locale, { flag: string; name: string }> = {
  id: { flag: '🇮🇩', name: 'Indonesia' },
  su: { flag: '🌾', name: 'Sunda' },
  en: { flag: '🇬🇧', name: 'English' },
};

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      style={{
        padding: '4px 8px',
        border: '1px solid #cbd5e1',
        borderRadius: 4,
        background: 'white',
        fontSize: 13,
        cursor: 'pointer',
      }}
      aria-label="Pilih Bahasa"
    >
      {(['id', 'su', 'en'] as Locale[]).map((l) => (
        <option key={l} value={l}>
          {LOCALE_LABELS[l].flag} {LOCALE_LABELS[l].name}
        </option>
      ))}
    </select>
  );
}
