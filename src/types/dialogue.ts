export type Gender = 'male' | 'female';

export type LanguageGroup = 'occidentali' | 'slave' | 'orientali';

export type LanguageCode =
  // Occidentali
  | 'it'
  | 'en/en'
  | 'en/en-us'
  | 'en/en-rp'
  | 'en/en-sc'
  | 'en/en-n'
  | 'en/en-wm'
  | 'fr'
  | 'es'
  | 'es-la'
  | 'pt'
  | 'pt-pt'
  | 'de'
  | 'nl'
  | 'ca'
  | 'ro'
  | 'el'
  | 'sv'
  | 'fi'
  | 'hu'
  | 'lv'
  | 'la'
  | 'eo'
  // Slave
  | 'pl'
  | 'cs'
  | 'sk'
  | 'ru'
  | 'uk'
  | 'bg'
  | 'hr'
  // Orientali e Altre
  | 'zh'
  | 'zh-yue'
  | 'ja'
  | 'ko'
  | 'tr'
  | 'kn'
  | 'ar'
  | 'hi'
  | 'vi';

export type EmotionType =
  | 'neutro'
  | 'entusiasta'
  | 'calmo'
  | 'deciso'
  | 'sorpreso'
  | 'malinconico'
  | 'sussurrato';

export type EmphasisLevel = 'normale' | 'marcata' | 'teatrale';

export type PlaybackEngineMode = 'studio' | 'webspeech';

export type RoomAmbience = 'dry' | 'studio' | 'theater';

export type Mp3Bitrate = 128 | 192 | 320;

export type SpeakerColor = 'blue' | 'emerald' | 'amber' | 'violet' | 'rose' | 'teal';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  bcp47: string;
  group: LanguageGroup;
  nativeStudio: boolean;
  samplePhrase: string;
}

export interface Character {
  id: string;
  name: string;
  role: string;
  gender: Gender;
  language: LanguageCode;
  /** eSpeak variant id (m1..m7, f1..f5, klatt..klatt3, whisper, whisperf, croak) */
  variant: string;
  /** Optional native browser SpeechSynthesisVoice URI */
  systemVoiceUri?: string;
  /** Base pitch multiplier (0.65 - 1.45) */
  basePitch: number;
  /** Base speaking rate multiplier (0.70 - 1.40) */
  baseRate: number;
  /** Stereo panning (-0.70 left to +0.70 right) */
  pan: number;
  /** High-contrast visual accent identifier for the character avatar */
  color: SpeakerColor;
}

export interface DialogueLine {
  id: string;
  characterId: string;
  text: string;
  emotion: EmotionType;
  emphasis: EmphasisLevel;
  /** Relative pitch offset (-25 to +25 percent) */
  pitchOffset: number;
  /** Relative rate offset (-30 to +45 percent) */
  rateOffset: number;
  /** Audible line volume percentage (35 to 100) */
  volumePercent?: number;
  /** Silence pause after this line in milliseconds (0 - 2500) */
  pauseAfterMs: number;
}

export interface DialogueProject {
  title: string;
  engine: PlaybackEngineMode;
  ambience: RoomAmbience;
  defaultPauseMs: number;
  mp3Bitrate: Mp3Bitrate;
  characters: Character[];
  lines: DialogueLine[];
}

export interface EmotionProfile {
  id: EmotionType;
  label: string;
  description: string;
  pitchMult: number;
  rateMult: number;
  volumeMult: number;
  wordGap: number;
  lowShelfDb: number;
  presenceDb: number;
  highShelfDb: number;
  useWhisperVariant?: boolean;
}

export interface DialogueTemplate {
  id: string;
  title: string;
  category: string;
  combinationLabel: string;
  description: string;
  characters: Character[];
  lines: DialogueLine[];
}
