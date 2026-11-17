import { Gender, LanguageCode, LanguageGroup } from '../types/dialogue';
import { SUPPORTED_LANGUAGES } from '../data/presets';

export interface FormattedVoiceOption {
  voice: SpeechSynthesisVoice;
  label: string;
  isGoogleAndroid: boolean;
  detectedGender: Gender | 'unknown';
  langCode: string;
  group: LanguageGroup;
  isLocal: boolean;
  samplePhrase: string;
}

const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  it: 'Italiano',
  en: 'Inglese',
  fr: 'Francese',
  es: 'Spagnolo',
  pt: 'Portoghese',
  de: 'Tedesco',
  nl: 'Olandese',
  ca: 'Catalano',
  ro: 'Rumeno',
  el: 'Greco',
  sv: 'Svedese',
  fi: 'Finlandese',
  hu: 'Ungherese',
  lv: 'Lettone',
  la: 'Latino',
  pl: 'Polacco',
  cs: 'Ceco',
  sk: 'Slovacco',
  ru: 'Russo',
  uk: 'Ucraino',
  bg: 'Bulgaro',
  hr: 'Croato',
  sr: 'Serbo',
  zh: 'Cinese',
  ja: 'Giapponese',
  ko: 'Coreano',
  tr: 'Turco',
  kn: 'Kannada',
  ar: 'Arabo',
  hi: 'Hindi',
  vi: 'Vietnamita',
  id: 'Indonesiano',
  th: 'Tailandese',
  nb: 'Norvegese',
  da: 'Danese',
};

const SLAVIC_LANG_PREFIXES = new Set(['pl', 'cs', 'sk', 'ru', 'uk', 'bg', 'hr', 'sr', 'sl', 'be', 'mk', 'bs']);
const EASTERN_LANG_PREFIXES = new Set(['zh', 'ja', 'ko', 'tr', 'kn', 'ar', 'hi', 'vi', 'id', 'th', 'ta', 'te', 'bn', 'mr', 'ur', 'fa', 'he', 'ms', 'fil']);

// Known Google Android TTS voice sub-codes (e.g. it-it-x-itb-local -> F, itc -> M)
const ANDROID_FEMALE_CODES = new Set([
  'ita', 'itb',
  'sfg', 'iob', 'tpc', 'tpf', 'iol-f',
  'gba', 'gbc',
  'fra', 'frc',
  'ana', 'eee', 'sfd',
  'deb', 'dea',
  'afs', 'ptf',
  'ruf', 'rud', 'rua',
  'bmg', 'plf',
  'jab', 'jad',
  'kod', 'kof',
  'ccd', 'cce', 'yud',
]);

const ANDROID_MALE_CODES = new Set([
  'itc', 'itd',
  'iol', 'iom', 'tpd', 'gbd', 'gbb', 'rjs',
  'frb', 'frd',
  'eed', 'efb',
  'deg', 'nfh',
  'ptm', 'afm',
  'ruc', 'rub',
  'jmk', 'plm',
  'jac', 'jae',
  'koc', 'kom',
  'ccf', 'ccg',
]);

const MALE_NAME_HINTS =
  /\b(male|uomo|maschile|luca|diego|giorgio|cosimo|paolo|marco|matteo|david|mark|daniel|thomas|george|ryan|guy|andrew|brian|christopher|eric|hans|stefan|henri|pierre|piotr|jan|marek|pavel|jakub|dmitri|aleksandr|maxim|sergei|kenji|takumi|keita|ichiro|min-jun|hyun|wei|jun|tarik|arjun)\b/i;

const FEMALE_NAME_HINTS =
  /\b(female|donna|femminile|alice|elsa|federica|isabella|silvia|paola|sofia|giulia|bianca|carla|aira|zira|hazel|susan|aria|jenny|ava|emma|samantha|victoria|karen|amelie|audrey|celine|denise|helena|katja|hedda|monica|helena|anna|zofia|paulina|katerina|zuzana|svetlana|irina|daria|yuna|kyoko|haruka|nanami|seo-yeon|mei|ting|xiaoxiao|huihui|fatima|priya)\b/i;

export function isGoogleAndroidVoice(voice: SpeechSynthesisVoice): boolean {
  const name = voice.name.toLowerCase();
  const uri = voice.voiceURI.toLowerCase();
  return (
    name.includes('google') ||
    name.includes('android') ||
    uri.includes('google') ||
    uri.includes('android') ||
    /^[a-z]{2,3}-[a-z]{2,4}-x-[a-z0-9]+-(local|network)$/i.test(voice.name.trim()) ||
    /^[a-z]{2,3}-[a-z]{2,4}-x-[a-z0-9]+-(local|network)$/i.test(voice.voiceURI.trim())
  );
}

export function detectVoiceGender(voice: SpeechSynthesisVoice): Gender | 'unknown' {
  const combined = `${voice.name} ${voice.voiceURI}`;

  const androidMatch = combined.match(/[a-z]{2,3}-[a-z]{2,4}-x-([a-z0-9]+)-(?:local|network)/i);
  if (androidMatch) {
    const code = androidMatch[1].toLowerCase();
    if (ANDROID_FEMALE_CODES.has(code)) return 'female';
    if (ANDROID_MALE_CODES.has(code)) return 'male';
  }

  if (FEMALE_NAME_HINTS.test(combined)) return 'female';
  if (MALE_NAME_HINTS.test(combined)) return 'male';

  return 'unknown';
}

export function getLanguageGroupFromBcp47(lang: string): LanguageGroup {
  const prefix = (lang || 'it').split(/[-_]/)[0].toLowerCase();
  if (SLAVIC_LANG_PREFIXES.has(prefix)) return 'slave';
  if (EASTERN_LANG_PREFIXES.has(prefix)) return 'orientali';
  return 'occidentali';
}

export function mapVoiceLangToLanguageCode(lang: string): LanguageCode | null {
  const norm = (lang || '').toLowerCase().replace('_', '-');
  const exact = SUPPORTED_LANGUAGES.find((l) => l.bcp47.toLowerCase() === norm);
  if (exact) return exact.code;
  const prefix = norm.split('-')[0];
  const byPrefix = SUPPORTED_LANGUAGES.find((l) => l.bcp47.toLowerCase().startsWith(`${prefix}-`) || l.code === prefix);
  return byPrefix ? byPrefix.code : null;
}

export function getSamplePhraseForVoice(lang: string): string {
  const norm = (lang || 'it-IT').toLowerCase().replace('_', '-');
  const exact = SUPPORTED_LANGUAGES.find((l) => l.bcp47.toLowerCase() === norm);
  if (exact) return exact.samplePhrase;
  const prefix = norm.split('-')[0];
  const byPrefix = SUPPORTED_LANGUAGES.find((l) => l.bcp47.toLowerCase().startsWith(`${prefix}-`));
  if (byPrefix) return byPrefix.samplePhrase;
  return 'Ciao, questa è una prova della mia voce per il tuo dialogo.';
}

export function formatVoiceOption(voice: SpeechSynthesisVoice): FormattedVoiceOption {
  const isGoogle = isGoogleAndroidVoice(voice);
  const gender = detectVoiceGender(voice);
  const langPrefix = (voice.lang || 'it').split(/[-_]/)[0].toLowerCase();
  const langName = LANGUAGE_DISPLAY_NAMES[langPrefix] || voice.lang;

  const rawName = voice.name.trim();
  const androidMatch = rawName.match(
    /^([a-z]{2,3})-([a-z]{2,4})-x-([a-z0-9]+)-(local|network)$/i
  );

  let label = rawName;
  if (androidMatch) {
    const region = androidMatch[2].toUpperCase();
    const variantCode = androidMatch[3].toUpperCase();
    const modeLabel = androidMatch[4].toLowerCase() === 'local' ? 'Locale' : 'Rete';
    label = `Google Android ${langName} (${region}) · Voce ${variantCode} (${modeLabel})`;
  } else if (isGoogle && !rawName.toLowerCase().includes('google')) {
    label = `Google Android · ${rawName}`;
  }

  if (gender === 'female' && !/female|donna|\(f\)/i.test(label)) {
    label += ' · Femminile';
  } else if (gender === 'male' && !/male|uomo|\(m\)/i.test(label)) {
    label += ' · Maschile';
  }

  return {
    voice,
    label,
    isGoogleAndroid: isGoogle,
    detectedGender: gender,
    langCode: voice.lang || '',
    group: getLanguageGroupFromBcp47(voice.lang || ''),
    isLocal: voice.localService,
    samplePhrase: getSamplePhraseForVoice(voice.lang || ''),
  };
}

export function pickAutomaticGoogleVoice(
  availableVoices: SpeechSynthesisVoice[],
  bcp47: string,
  gender: Gender,
  excludeUris: Set<string> = new Set()
): SpeechSynthesisVoice | undefined {
  if (availableVoices.length === 0) return undefined;

  const exactLang = bcp47.toLowerCase();
  const langPrefix = exactLang.split('-')[0];

  const langVoices = availableVoices.filter((v) => {
    const vl = v.lang.toLowerCase().replace('_', '-');
    return vl === exactLang || vl.startsWith(`${langPrefix}-`) || vl === langPrefix;
  });

  const pool = langVoices.length > 0 ? langVoices : availableVoices;

  const scored = pool.map((v, idx) => {
    let score = 0;
    const vl = v.lang.toLowerCase().replace('_', '-');
    if (vl === exactLang) score += 25;
    if (isGoogleAndroidVoice(v)) score += 40;
    const g = detectVoiceGender(v);
    if (g === gender) score += 50;
    else if (g !== 'unknown') score -= 35;
    if (!excludeUris.has(v.voiceURI)) score += 20;
    if (v.localService) score += 5;
    return { voice: v, score, idx };
  });

  scored.sort((a, b) => b.score - a.score || a.idx - b.idx);
  return scored[0]?.voice;
}
