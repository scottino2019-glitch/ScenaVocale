declare module 'mespeak' {
  export interface MeSpeakOptions {
    amplitude?: number;
    wordgap?: number;
    pitch?: number;
    speed?: number;
    voice?: string;
    variant?: string;
    volume?: number;
    rawdata?: boolean | 'array' | 'arraybuffer' | 'base64' | 'buffer' | 'mime';
    utf16?: boolean;
    punct?: boolean | string;
    capitals?: number;
    ssml?: boolean;
  }

  export interface MeSpeakAPI {
    speak(
      text: string,
      options?: MeSpeakOptions,
      callback?: (success: boolean) => void
    ): number | ArrayBuffer | number[] | string | null;
    loadConfig(config: Record<string, unknown> | string): void;
    loadVoice(
      voice: Record<string, unknown> | string,
      callback?: (success: boolean, voiceId: string) => void
    ): void;
    setDefaultVoice(voiceId: string): void;
    getDefaultVoice(): string;
    isConfigLoaded(): boolean;
    isVoiceLoaded(voiceId: string): boolean;
    setVolume(vol: number): void;
    stop(): number;
  }

  const meSpeak: MeSpeakAPI;
  export default meSpeak;
}

declare module 'mespeak/src/mespeak_config.json' {
  const config: Record<string, unknown>;
  export default config;
}

declare module 'mespeak/voices/*.json' {
  const voiceData: Record<string, unknown>;
  export default voiceData;
}

declare module 'mespeak/voices/en/*.json' {
  const voiceData: Record<string, unknown>;
  export default voiceData;
}
