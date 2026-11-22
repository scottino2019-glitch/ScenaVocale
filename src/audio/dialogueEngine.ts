import meSpeak from 'mespeak';
import meSpeakConfig from 'mespeak/src/mespeak_config.json';
import itVoice from 'mespeak/voices/it.json';
import { Mp3Encoder } from '@breezystack/lamejs';
import {
  Character,
  DialogueLine,
  DialogueProject,
  EmphasisLevel,
  LanguageCode,
  RoomAmbience,
} from '../types/dialogue';
import { EMOTION_PROFILES, SUPPORTED_LANGUAGES } from '../data/presets';
import { pickAutomaticGoogleVoice } from '../utils/googleVoices';

const TARGET_SAMPLE_RATE = 44100;

let isBaseInitialized = false;
const loadedVoices = new Set<string>();
const impulseCache = new Map<string, AudioBuffer>();

function ensureBaseInit(): void {
  if (!isBaseInitialized) {
    meSpeak.loadConfig(meSpeakConfig);
    meSpeak.loadVoice(itVoice);
    loadedVoices.add('it');
    meSpeak.setDefaultVoice('it');
    isBaseInitialized = true;
  }
}

/**
 * Loads the corresponding meSpeak JSON voice module dynamically for all 30 native voices.
 * For Cyrillic/Kana/Hangul/Arabic/Hindi languages without native JSON in meSpeak,
 * loads the phonetic target voice (pl / it / en) and applies deterministic Unicode transliteration.
 */
async function loadNativeMeSpeakVoice(voiceId: string): Promise<void> {
  if (loadedVoices.has(voiceId)) return;

  let voiceModule: Record<string, unknown>;
  switch (voiceId) {
    case 'it':
      voiceModule = itVoice;
      break;
    case 'en/en':
      voiceModule = (await import('mespeak/voices/en/en.json')).default;
      break;
    case 'en/en-us':
      voiceModule = (await import('mespeak/voices/en/en-us.json')).default;
      break;
    case 'en/en-rp':
      voiceModule = (await import('mespeak/voices/en/en-rp.json')).default;
      break;
    case 'en/en-sc':
      voiceModule = (await import('mespeak/voices/en/en-sc.json')).default;
      break;
    case 'en/en-n':
      voiceModule = (await import('mespeak/voices/en/en-n.json')).default;
      break;
    case 'en/en-wm':
      voiceModule = (await import('mespeak/voices/en/en-wm.json')).default;
      break;
    case 'fr':
      voiceModule = (await import('mespeak/voices/fr.json')).default;
      break;
    case 'es':
      voiceModule = (await import('mespeak/voices/es.json')).default;
      break;
    case 'es-la':
      voiceModule = (await import('mespeak/voices/es-la.json')).default;
      break;
    case 'pt':
      voiceModule = (await import('mespeak/voices/pt.json')).default;
      break;
    case 'pt-pt':
      voiceModule = (await import('mespeak/voices/pt-pt.json')).default;
      break;
    case 'de':
      voiceModule = (await import('mespeak/voices/de.json')).default;
      break;
    case 'nl':
      voiceModule = (await import('mespeak/voices/nl.json')).default;
      break;
    case 'ca':
      voiceModule = (await import('mespeak/voices/ca.json')).default;
      break;
    case 'ro':
      voiceModule = (await import('mespeak/voices/ro.json')).default;
      break;
    case 'el':
      voiceModule = (await import('mespeak/voices/el.json')).default;
      break;
    case 'sv':
      voiceModule = (await import('mespeak/voices/sv.json')).default;
      break;
    case 'fi':
      voiceModule = (await import('mespeak/voices/fi.json')).default;
      break;
    case 'hu':
      voiceModule = (await import('mespeak/voices/hu.json')).default;
      break;
    case 'lv':
      voiceModule = (await import('mespeak/voices/lv.json')).default;
      break;
    case 'la':
      voiceModule = (await import('mespeak/voices/la.json')).default;
      break;
    case 'eo':
      voiceModule = (await import('mespeak/voices/eo.json')).default;
      break;
    case 'pl':
      voiceModule = (await import('mespeak/voices/pl.json')).default;
      break;
    case 'cs':
      voiceModule = (await import('mespeak/voices/cs.json')).default;
      break;
    case 'sk':
      voiceModule = (await import('mespeak/voices/sk.json')).default;
      break;
    case 'zh':
      await loadNativeMeSpeakVoice('en/en');
      voiceModule = (await import('mespeak/voices/zh.json')).default;
      break;
    case 'zh-yue':
      await loadNativeMeSpeakVoice('en/en');
      voiceModule = (await import('mespeak/voices/zh-yue.json')).default;
      break;
    case 'tr':
      voiceModule = (await import('mespeak/voices/tr.json')).default;
      break;
    case 'kn':
      voiceModule = (await import('mespeak/voices/kn.json')).default;
      break;
    default:
      voiceModule = itVoice;
      break;
  }

  meSpeak.loadVoice(voiceModule);
  loadedVoices.add(voiceId);
}

function getStudioEngineVoice(lang: LanguageCode): string {
  switch (lang) {
    case 'ru':
    case 'uk':
    case 'bg':
      return 'pl';
    case 'hr':
      return 'cs';
    case 'ja':
    case 'ko':
    case 'ar':
    case 'hi':
    case 'vi':
      return 'it';
    default:
      return lang;
  }
}

export async function ensureLanguageLoaded(lang: LanguageCode): Promise<string> {
  ensureBaseInit();
  const studioVoice = getStudioEngineVoice(lang);
  await loadNativeMeSpeakVoice(studioVoice);
  return studioVoice;
}

/**
 * Deterministic phonetic transliterators for non-Latin scripts without native meSpeak dicts
 * (Russian/Ukrainian/Bulgarian Cyrillic, Japanese Hiragana/Katakana, Korean Hangul, Arabic, Hindi).
 * Zero AI — pure Unicode character/syllable mapping.
 */
const CYRILLIC_TO_LATIN_SLAVIC: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', ґ: 'g', д: 'd', е: 'je', є: 'je', ё: 'jo',
  ж: 'ż', з: 'z', и: 'i', і: 'i', ї: 'ji', й: 'j', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'ch',
  ц: 'c', ч: 'cz', ш: 'sz', щ: 'szcz', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'ju', я: 'ja',
};

const KANA_TO_ROMAJI: Record<string, string> = {
  あ:'a', い:'i', う:'u', え:'e', お:'o',
  か:'ka', き:'ki', く:'ku', け:'ke', こ:'ko',
  が:'ga', ぎ:'gi', ぐ:'gu', げ:'ge', ご:'go',
  さ:'sa', し:'sci', す:'su', せ:'se', そ:'so',
  ざ:'za', じ:'gi', ず:'zu', ぜ:'ze', ぞ:'zo',
  た:'ta', ち:'ci', つ:'tsu', て:'te', と:'to',
  だ:'da', ぢ:'gi', づ:'zu', で:'de', ど:'do',
  な:'na', に:'ni', ぬ:'nu', ね:'ne', の:'no',
  は:'ha', ひ:'hi', ふ:'fu', へ:'he', ほ:'ho',
  ば:'ba', び:'bi', ぶ:'bu', べ:'be', ぼ:'bo',
  ぱ:'pa', ぴ:'pi', ぷ:'pu', ぺ:'pe', ぽ:'po',
  ま:'ma', み:'mi', む:'mu', め:'me', も:'mo',
  や:'ia', ゆ:'iu', よ:'io',
  ら:'ra', り:'ri', る:'ru', れ:'re', ろ:'ro',
  わ:'ua', を:'o', ん:'n',
  ぁ:'a', ぃ:'i', ぅ:'u', ぇ:'e', ぉ:'o', っ:'',
  きゃ:'kia', きゅ:'kiu', きょ:'kio', しゃ:'scia', しゅ:'sciu', しょ:'scio',
  ちゃ:'cia', ちゅ:'ciu', ちょ:'cio', にゃ:'nia', にゅ:'niu', にょ:'nio',
  ひゃ:'hia', ひゅ:'hiu', ひょ:'hio', みゃ:'mia', みゅ:'miu', みょ:'mio',
  りゃ:'ria', りゅ:'riu', りょ:'rio', ぎゃ:'gia', ぎゅ:'giu', ぎょ:'gio',
  じゃ:'gia', じゅ:'giu', じょ:'gio', びゃ:'bia', びゅ:'biu', びょ:'bio',
  ぴゃ:'pia', ぴゅ:'piu', ぴょ:'pio',
  ア:'a', イ:'i', ウ:'u', エ:'e', オ:'o',
  カ:'ka', キ:'ki', ク:'ku', ケ:'ke', コ:'ko',
  ガ:'ga', ギ:'gi', グ:'gu', ゲ:'ge', ゴ:'go',
  サ:'sa', シ:'sci', ス:'su', セ:'se', ソ:'so',
  ザ:'za', ジ:'gi', ズ:'zu', ゼ:'ze', ゾ:'zo',
  タ:'ta', チ:'ci', ツ:'tsu', テ:'te', ト:'to',
  ダ:'da', ヂ:'gi', ヅ:'zu', デ:'de', ド:'do',
  ナ:'na', ニ:'ni', ヌ:'nu', ネ:'ne', ノ:'no',
  ハ:'ha', ヒ:'hi', フ:'fu', ヘ:'he', ホ:'ho',
  バ:'ba', ビ:'bi', ブ:'bu', ベ:'be', ボ:'bo',
  パ:'pa', ピ:'pi', プ:'pu', ペ:'pe', ポ:'po',
  マ:'ma', ミ:'mi', ム:'mu', メ:'me', モ:'mo',
  ヤ:'ia', ユ:'iu', ヨ:'io',
  ラ:'ra', リ:'ri', ル:'ru', レ:'re', ロ:'ro',
  ワ:'ua', ヲ:'o', ン:'n', ー:'', ッ:'',
  '、':', ', '。':'. ', '！':'! ', '？':'? ', '「':'', '」':'',
};

const HANGUL_INITIAL = ['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h'];
const HANGUL_MEDIAL = ['a','ae','ia','iae','eo','e','ieo','ie','o','oa','oae','oe','io','u','ueo','ue','ui','iu','eu','eui','i'];
const HANGUL_FINAL = ['','k','k','k','n','n','n','t','l','l','l','l','l','l','l','l','m','p','p','t','t','ng','t','t','k','t','p','h'];

const ARABIC_TO_PHONETIC: Record<string, string> = {
  ا:'a', أ:'a', إ:'i', آ:'aa', ب:'b', ت:'t', ث:'th', ج:'g', ح:'h', خ:'kh',
  د:'d', ذ:'dh', ر:'r', ز:'z', س:'s', ش:'sc', ص:'s', ض:'d', ط:'t', ظ:'z',
  ع:'a', غ:'gh', ف:'f', ق:'k', ك:'k', ل:'l', م:'m', ن:'n', ه:'h', و:'u',
  ي:'i', ى:'a', ة:'a', ء:'', 'َ':'a', 'ِ':'i', 'ُ':'u', '،':', ', '؟':'? ',
};

const DEVANAGARI_TO_PHONETIC: Record<string, string> = {
  अ:'a', आ:'aa', इ:'i', ई:'ii', उ:'u', ऊ:'uu', ए:'e', ऐ:'ai', ओ:'o', औ:'au',
  क:'ka', ख:'kha', ग:'ga', घ:'gha', च:'cia', छ:'chia', ज:'gia', झ:'jhia',
  ट:'ta', ठ:'tha', ड:'da', ढ:'dha', त:'ta', थ:'tha', द:'da', ध:'dha', न:'na',
  प:'pa', फ:'pha', ब:'ba', भ:'bha', म:'ma', य:'ia', र:'ra', ल:'la', व:'va',
  श:'scia', ष:'scia', स:'sa', ह:'ha', 'ा':'a', 'ि':'i', 'ी':'i', 'ु':'u', 'ू':'u',
  'े':'e', 'ै':'ai', 'ो':'o', 'ौ':'au', 'ं':'n', '्':'', '।':'. ',
};

function transliterateForStudio(text: string, lang: LanguageCode): string {
  if (lang === 'ru' || lang === 'uk' || lang === 'bg') {
    let out = '';
    for (const ch of text) {
      const lower = ch.toLowerCase();
      if (lower in CYRILLIC_TO_LATIN_SLAVIC) {
        out += CYRILLIC_TO_LATIN_SLAVIC[lower];
      } else {
        out += ch;
      }
    }
    return out;
  }

  if (lang === 'ja') {
    let out = '';
    let i = 0;
    while (i < text.length) {
      const two = text.slice(i, i + 2);
      if (two in KANA_TO_ROMAJI) {
        out += KANA_TO_ROMAJI[two];
        i += 2;
        continue;
      }
      const one = text[i];
      if (one in KANA_TO_ROMAJI) {
        out += KANA_TO_ROMAJI[one];
      } else {
        out += one;
      }
      i += 1;
    }
    return out;
  }

  if (lang === 'ko') {
    let out = '';
    for (const ch of text) {
      const code = ch.charCodeAt(0);
      if (code >= 0xac00 && code <= 0xd7a3) {
        const sIndex = code - 0xac00;
        const init = Math.floor(sIndex / 588);
        const med = Math.floor((sIndex % 588) / 28);
        const fin = sIndex % 28;
        out += `${HANGUL_INITIAL[init]}${HANGUL_MEDIAL[med]}${HANGUL_FINAL[fin]} `;
      } else {
        out += ch;
      }
    }
    return out;
  }

  if (lang === 'ar') {
    let out = '';
    for (const ch of text) {
      out += ch in ARABIC_TO_PHONETIC ? ARABIC_TO_PHONETIC[ch] : ch;
    }
    return out;
  }

  if (lang === 'hi') {
    let out = '';
    for (const ch of text) {
      out += ch in DEVANAGARI_TO_PHONETIC ? DEVANAGARI_TO_PHONETIC[ch] : ch;
    }
    return out;
  }

  if (lang === 'vi') {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  return text;
}

export interface ProsodyChunk {
  type: 'speech' | 'pause';
  text?: string;
  pauseMs: number;
  pitchFactor: number;
  rateFactor: number;
  gainFactor: number;
  wordGapBonus: number;
}

const EMPHASIS_SCALE: Record<EmphasisLevel, number> = {
  normale: 0.75,
  marcata: 1.15,
  teatrale: 1.6,
};

export function parseProsodyChunks(
  rawText: string,
  emphasis: EmphasisLevel
): ProsodyChunk[] {
  const scale = EMPHASIS_SCALE[emphasis];
  const chunks: ProsodyChunk[] = [];

  const tokenRegex = /\[pausa\s+(\d+(?:\.\d+)?)\s*(ms|s)?\]/gi;
  let lastIdx = 0;
  const parts: { kind: 'text' | 'pause'; value: string; ms?: number }[] = [];

  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(rawText)) !== null) {
    if (match.index > lastIdx) {
      parts.push({ kind: 'text', value: rawText.slice(lastIdx, match.index) });
    }
    const num = parseFloat(match[1]);
    const unit = (match[2] || 'ms').toLowerCase();
    const ms = Math.min(4000, Math.max(50, unit === 's' ? num * 1000 : num));
    parts.push({ kind: 'pause', value: '', ms });
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < rawText.length) {
    parts.push({ kind: 'text', value: rawText.slice(lastIdx) });
  }

  for (const part of parts) {
    if (part.kind === 'pause') {
      chunks.push({
        type: 'pause',
        pauseMs: part.ms ?? 300,
        pitchFactor: 1,
        rateFactor: 1,
        gainFactor: 1,
        wordGapBonus: 0,
      });
      continue;
    }

    const clauseMatches = part.value.match(/[^.!?。！？]+(?:[.]{3}|[.!?。！？])?/g);
    if (!clauseMatches) continue;

    for (const rawClause of clauseMatches) {
      const cleaned = rawClause.replace(/\s+/g, ' ').trim();
      if (!cleaned) continue;

      const hasStarEmphasis = /\*[^*]+\*/.test(cleaned);
      const speakableText = cleaned.replace(/\*([^*]+)\*/g, '$1');

      const pitchFactor = 1.0;
      let rateFactor = 1.0;
      let gainFactor = 1.0;
      let wordGapBonus = 0;
      let pauseMs = 90;

      if (cleaned.endsWith('?') || cleaned.endsWith('？')) {
        rateFactor += 0.02 * scale;
        pauseMs = Math.round(280 * Math.min(1.25, scale));
      } else if (cleaned.endsWith('!') || cleaned.endsWith('！')) {
        rateFactor += 0.03 * scale;
        gainFactor += 0.05 * scale;
        pauseMs = Math.round(250 * Math.min(1.2, scale));
      } else if (cleaned.endsWith('...')) {
        rateFactor -= 0.08 * scale;
        gainFactor -= 0.04 * scale;
        wordGapBonus = 1;
        pauseMs = Math.round(360 * Math.min(1.25, scale));
      } else if (cleaned.endsWith('.') || cleaned.endsWith('。')) {
        pauseMs = 210;
      }

      if (hasStarEmphasis) {
        rateFactor -= 0.05 * scale;
        gainFactor += 0.06 * scale;
        wordGapBonus += 1;
      }

      chunks.push({
        type: 'speech',
        text: speakableText,
        pauseMs,
        pitchFactor,
        rateFactor,
        gainFactor,
        wordGapBonus,
      });
    }
  }

  return chunks;
}

function decodeWavBuffer(buffer: ArrayBuffer): { sampleRate: number; samples: Float32Array } {
  const view = new DataView(buffer);
  if (buffer.byteLength < 44) {
    return { sampleRate: 22050, samples: new Float32Array(0) };
  }

  let sampleRate = 22050;
  let bitsPerSample = 16;
  let numChannels = 1;
  let dataOffset = 44;
  let dataSize = buffer.byteLength - 44;

  let offset = 12;
  while (offset + 8 <= buffer.byteLength) {
    const chunkId = String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3)
    );
    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkId === 'fmt ' && offset + 24 <= buffer.byteLength) {
      numChannels = view.getUint16(offset + 10, true);
      sampleRate = view.getUint32(offset + 12, true);
      bitsPerSample = view.getUint16(offset + 22, true);
    } else if (chunkId === 'data') {
      dataOffset = offset + 8;
      dataSize = Math.min(chunkSize, buffer.byteLength - dataOffset);
      break;
    }

    offset += 8 + chunkSize + (chunkSize % 2);
  }

  if (bitsPerSample === 16) {
    const frameCount = Math.floor(dataSize / (2 * numChannels));
    const samples = new Float32Array(frameCount);
    for (let i = 0; i < frameCount; i++) {
      const sample = view.getInt16(dataOffset + i * 2 * numChannels, true);
      samples[i] = sample / 32768;
    }
    return { sampleRate, samples };
  }

  const frameCount = Math.floor(dataSize / numChannels);
  const samples = new Float32Array(frameCount);
  for (let i = 0; i < frameCount; i++) {
    const sample = view.getUint8(dataOffset + i * numChannels);
    samples[i] = (sample - 128) / 128;
  }
  return { sampleRate, samples };
}

function getRoomImpulse(
  ctx: BaseAudioContext,
  ambience: RoomAmbience
): AudioBuffer | null {
  if (ambience === 'dry') return null;
  const key = `${ambience}-${ctx.sampleRate}`;
  const existing = impulseCache.get(key);
  if (existing) return existing;

  const isStudio = ambience === 'studio';
  const durationSec = isStudio ? 0.14 : 0.34;
  const length = Math.floor(ctx.sampleRate * durationSec);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);

  // Clean discrete early reflections (zero white-noise grain/fizz)
  const tapsL = isStudio
    ? [
        { ms: 13, amp: 0.16 },
        { ms: 29, amp: -0.1 },
        { ms: 51, amp: 0.06 },
      ]
    : [
        { ms: 21, amp: 0.2 },
        { ms: 47, amp: -0.14 },
        { ms: 89, amp: 0.09 },
        { ms: 145, amp: -0.05 },
      ];

  const tapsR = isStudio
    ? [
        { ms: 17, amp: -0.15 },
        { ms: 34, amp: 0.1 },
        { ms: 58, amp: -0.05 },
      ]
    : [
        { ms: 26, amp: -0.19 },
        { ms: 55, amp: 0.13 },
        { ms: 97, amp: -0.08 },
        { ms: 162, amp: 0.05 },
      ];

  const dataL = buffer.getChannelData(0);
  const dataR = buffer.getChannelData(1);

  for (const tap of tapsL) {
    const idx = Math.min(length - 1, Math.floor((tap.ms / 1000) * ctx.sampleRate));
    dataL[idx] += tap.amp;
  }
  for (const tap of tapsR) {
    const idx = Math.min(length - 1, Math.floor((tap.ms / 1000) * ctx.sampleRate));
    dataR[idx] += tap.amp;
  }

  impulseCache.set(key, buffer);
  return buffer;
}

function cleanAndTrimPcm(samples: Float32Array, sampleRate: number): Float32Array {
  if (samples.length === 0) return samples;

  // 1. Remove any DC offset
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i];
  }
  const mean = sum / samples.length;

  const dcClean = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    dcClean[i] = samples[i] - mean;
  }

  // 2. Gentle silence trim keeping generous margins so initial/final consonants stay intact
  const threshold = 0.0005;
  let start = 0;
  let end = dcClean.length - 1;
  while (start < end && Math.abs(dcClean[start]) < threshold) start++;
  while (end > start && Math.abs(dcClean[end]) < threshold) end--;

  const leadPad = Math.min(start, 950);
  const tailPad = Math.min(dcClean.length - 1 - end, 1100);
  const sliced = dcClean.slice(
    Math.max(0, start - leadPad),
    Math.min(dcClean.length, end + tailPad + 1)
  );

  if (sliced.length < 32) return sliced;

  // 3. Smooth half-Hann fade-in (14ms) and fade-out (18ms) to guarantee click-free edges
  const fadeInLen = Math.min(Math.floor(sampleRate * 0.014), Math.floor(sliced.length * 0.25));
  const fadeOutLen = Math.min(Math.floor(sampleRate * 0.018), Math.floor(sliced.length * 0.25));

  for (let i = 0; i < fadeInLen; i++) {
    const w = 0.5 * (1 - Math.cos((Math.PI * i) / fadeInLen));
    sliced[i] *= w;
  }
  for (let i = 0; i < fadeOutLen; i++) {
    const idx = sliced.length - 1 - i;
    const w = 0.5 * (1 - Math.cos((Math.PI * i) / fadeOutLen));
    sliced[idx] *= w;
  }

  return sliced;
}

/**
 * 4-point Catmull-Rom cubic upsampler + mild anti-imaging smoothing from 22050 Hz -> 44100 Hz
 * so Web Audio AudioBufferSourceNode doesn't inject linear-interpolation metallic aliasing.
 */
function resampleToTargetRate(
  samples: Float32Array,
  srcRate: number,
  dstRate: number
): Float32Array {
  if (samples.length < 4 || srcRate === dstRate) {
    return samples;
  }

  const ratio = srcRate / dstRate;
  const outLen = Math.max(4, Math.round(samples.length / ratio));
  const upsampled = new Float32Array(outLen);

  for (let i = 0; i < outLen; i++) {
    const srcPos = i * ratio;
    const idx = Math.floor(srcPos);
    const t = srcPos - idx;

    const p0 = samples[Math.max(0, idx - 1)];
    const p1 = samples[Math.min(samples.length - 1, idx)];
    const p2 = samples[Math.min(samples.length - 1, idx + 1)];
    const p3 = samples[Math.min(samples.length - 1, idx + 2)];

    const t2 = t * t;
    const t3 = t2 * t;

    upsampled[i] =
      0.5 *
      (2 * p1 +
        (-p0 + p2) * t +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
        (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  }

  // Gentle 3-tap zero-phase FIR [0.18, 0.64, 0.18] to tame upper-Nyquist mirror energy
  const smoothed = new Float32Array(outLen);
  smoothed[0] = upsampled[0];
  for (let i = 1; i < outLen - 1; i++) {
    smoothed[i] =
      0.18 * upsampled[i - 1] + 0.64 * upsampled[i] + 0.18 * upsampled[i + 1];
  }
  smoothed[outLen - 1] = upsampled[outLen - 1];

  return smoothed;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

interface ServerTtsResult {
  buffer: AudioBuffer;
  shaped: boolean;
}

const serverTtsAudioCache = new Map<string, ServerTtsResult>();

function getGoogleTtsCode(lang: LanguageCode): string | null {
  switch (lang) {
    case 'it':
      return 'it';
    case 'en/en':
    case 'en/en-rp':
    case 'en/en-sc':
    case 'en/en-n':
    case 'en/en-wm':
      return 'en-GB';
    case 'en/en-us':
      return 'en-US';
    case 'fr':
      return 'fr-FR';
    case 'es':
      return 'es-ES';
    case 'es-la':
      return 'es-MX';
    case 'pt':
      return 'pt-BR';
    case 'pt-pt':
      return 'pt-PT';
    case 'de':
      return 'de';
    case 'nl':
      return 'nl';
    case 'ca':
      return 'ca';
    case 'ro':
      return 'ro';
    case 'el':
      return 'el';
    case 'sv':
      return 'sv';
    case 'fi':
      return 'fi';
    case 'hu':
      return 'hu';
    case 'lv':
      return 'lv';
    case 'la':
      return 'la';
    case 'eo':
      return null;
    case 'pl':
      return 'pl';
    case 'cs':
      return 'cs';
    case 'sk':
      return 'sk';
    case 'ru':
      return 'ru';
    case 'uk':
      return 'uk';
    case 'bg':
      return 'bg';
    case 'hr':
      return 'hr';
    case 'zh':
      return 'zh-CN';
    case 'zh-yue':
      return 'zh-TW';
    case 'ja':
      return 'ja';
    case 'ko':
      return 'ko';
    case 'tr':
      return 'tr';
    case 'kn':
      return 'kn';
    case 'ar':
      return 'ar';
    case 'hi':
      return 'hi';
    case 'vi':
      return 'vi';
    default:
      return 'it';
  }
}

export function computeCharacterPitchMap(characters: Character[]): Map<string, number> {
  const map = new Map<string, number>();
  const maleFactors = [0.86, 0.80, 0.90];
  const maleEnGbFactors = [0.95, 0.89, 1.00];
  const femaleFactors = [1.00, 1.06, 0.96];

  let maleIdx = 0;
  let femaleIdx = 0;

  for (const c of characters) {
    const tl = getGoogleTtsCode(c.language);
    if (c.gender === 'male') {
      const palette = tl === 'en-GB' ? maleEnGbFactors : maleFactors;
      map.set(c.id, palette[maleIdx % palette.length]);
      maleIdx++;
    } else {
      map.set(c.id, femaleFactors[femaleIdx % femaleFactors.length]);
      femaleIdx++;
    }
  }
  return map;
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function decodeAndJoinMp3Segments(segments: string[]): Promise<AudioBuffer> {
  const decodeCtx = new OfflineAudioContext(2, 1, TARGET_SAMPLE_RATE);
  const decodedBuffers: AudioBuffer[] = [];

  for (const b64 of segments) {
    const ab = base64ToArrayBuffer(b64);
    const buf = await decodeCtx.decodeAudioData(ab);
    decodedBuffers.push(buf);
  }

  if (decodedBuffers.length === 1) {
    return decodedBuffers[0];
  }

  let totalSec = 0.02;
  for (const b of decodedBuffers) {
    totalSec += b.duration + 0.03;
  }

  const totalFrames = Math.max(1024, Math.ceil(totalSec * TARGET_SAMPLE_RATE));
  const joinCtx = new OfflineAudioContext(1, totalFrames, TARGET_SAMPLE_RATE);

  let cursor = 0.01;
  for (const b of decodedBuffers) {
    const src = joinCtx.createBufferSource();
    src.buffer = b;
    const g = joinCtx.createGain();
    const fade = Math.min(0.008, b.duration * 0.2);
    g.gain.setValueAtTime(0.0001, cursor);
    g.gain.linearRampToValueAtTime(1.0, cursor + fade);
    g.gain.setValueAtTime(1.0, Math.max(cursor + fade, cursor + b.duration - fade));
    g.gain.linearRampToValueAtTime(0.0001, cursor + b.duration);

    src.connect(g);
    g.connect(joinCtx.destination);
    src.start(cursor);
    cursor += b.duration + 0.025;
  }

  return joinCtx.startRendering();
}

async function fetchGoogleServerAudioBuffer(
  text: string,
  tl: string,
  pitchFactor: number,
  rateFactor: number
): Promise<ServerTtsResult> {
  const key = `${tl}|${pitchFactor.toFixed(3)}|${rateFactor.toFixed(3)}|${text}`;
  const cached = serverTtsAudioCache.get(key);
  if (cached) return cached;

  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, tl, pitchFactor, rateFactor }),
  });

  const contentType = response.headers.get('content-type') || '';
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(errText || `Errore TTS server (${response.status})`);
  }

  let result: ServerTtsResult;
  if (contentType.includes('application/json')) {
    const payload = (await response.json()) as {
      shaped?: boolean;
      segments?: string[];
      error?: string;
    };
    if (!Array.isArray(payload.segments) || payload.segments.length === 0) {
      throw new Error(payload.error || 'Risposta audio vuota dal server.');
    }
    const buffer = await decodeAndJoinMp3Segments(payload.segments);
    result = { buffer, shaped: Boolean(payload.shaped) };
  } else {
    const ab = await response.arrayBuffer();
    const decodeCtx = new OfflineAudioContext(2, 1, TARGET_SAMPLE_RATE);
    const buffer = await decodeCtx.decodeAudioData(ab.slice(0));
    result = { buffer, shaped: false };
  }

  if (serverTtsAudioCache.size > 120) {
    const firstKey = serverTtsAudioCache.keys().next().value;
    if (firstKey) serverTtsAudioCache.delete(firstKey);
  }
  serverTtsAudioCache.set(key, result);
  return result;
}

async function renderGoogleServerLineToStereoBuffer(
  line: DialogueLine,
  character: Character,
  ambience: RoomAmbience,
  pitchFactor: number
): Promise<AudioBuffer | null> {
  const tl = getGoogleTtsCode(character.language);
  if (!tl) return null;

  const tokenRegex = /\[pausa\s+(\d+(?:\.\d+)?)\s*(ms|s)?\]/gi;
  const parts: ({ type: 'speech'; text: string } | { type: 'pause'; pauseSec: number })[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(line.text)) !== null) {
    if (match.index > lastIdx) {
      const segText = line.text
        .slice(lastIdx, match.index)
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
      if (segText) parts.push({ type: 'speech', text: segText });
    }
    const num = parseFloat(match[1]);
    const unit = (match[2] || 'ms').toLowerCase();
    const ms = Math.min(4000, Math.max(50, unit === 's' ? num * 1000 : num));
    parts.push({ type: 'pause', pauseSec: ms / 1000 });
    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < line.text.length) {
    const tailText = line.text
      .slice(lastIdx)
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
    if (tailText) parts.push({ type: 'speech', text: tailText });
  }

  const rateFactor = clamp(character.baseRate * (1 + line.rateOffset / 100), 0.65, 1.55);
  const lineVolMult = clamp((line.volumePercent ?? 100) / 100, 0.35, 1.0);

  const timelineItems: {
    buffer?: AudioBuffer;
    playbackRate: number;
    pauseSec: number;
    shaped: boolean;
  }[] = [];

  let anyUnshaped = false;
  for (const part of parts) {
    if (part.type === 'pause') {
      timelineItems.push({ pauseSec: part.pauseSec, playbackRate: 1.0, shaped: true });
      continue;
    }
    const { buffer: audioBuf, shaped } = await fetchGoogleServerAudioBuffer(
      part.text,
      tl,
      pitchFactor,
      rateFactor
    );
    if (!shaped) anyUnshaped = true;

    // When server has no ffmpeg (e.g. Vercel serverless), apply subtle clean resampling
    // without metallic phase distortion: gentle male warmth/rate + user speed offset
    let playbackRate = 1.0;
    if (!shaped) {
      const subtleGenderFactor =
        character.gender === 'male'
          ? pitchFactor < 0.83
            ? 0.88
            : 0.92
          : pitchFactor > 1.02
            ? 1.04
            : 1.0;
      playbackRate = clamp(subtleGenderFactor * rateFactor, 0.72, 1.45);
    }

    timelineItems.push({
      buffer: audioBuf,
      playbackRate,
      pauseSec: 0.04,
      shaped,
    });
  }

  if (timelineItems.length === 0) {
    const emptyCtx = new OfflineAudioContext(
      2,
      Math.floor(TARGET_SAMPLE_RATE * 0.2),
      TARGET_SAMPLE_RATE
    );
    return emptyCtx.startRendering();
  }

  const reverbTailSec = ambience === 'dry' ? 0.04 : ambience === 'studio' ? 0.18 : 0.38;
  let totalSec = 0.02;
  for (const item of timelineItems) {
    if (item.buffer) totalSec += item.buffer.duration / item.playbackRate;
    totalSec += item.pauseSec;
  }
  totalSec += reverbTailSec;

  const totalFrames = Math.max(1024, Math.ceil(totalSec * TARGET_SAMPLE_RATE));
  const offline = new OfflineAudioContext(2, totalFrames, TARGET_SAMPLE_RATE);

  const panner = offline.createStereoPanner();
  panner.pan.value = clamp(character.pan, -0.75, 0.75);

  const masterGain = offline.createGain();
  masterGain.gain.value = 0.92;

  let outputTarget: AudioNode = panner;
  if (anyUnshaped && character.gender === 'male') {
    const warmth = offline.createBiquadFilter();
    warmth.type = 'lowshelf';
    warmth.frequency.value = 185;
    warmth.gain.value = 2.5;
    warmth.connect(panner);
    outputTarget = warmth;
  }

  panner.connect(masterGain);
  masterGain.connect(offline.destination);

  const impulse = getRoomImpulse(offline, ambience);
  if (impulse) {
    const convolver = offline.createConvolver();
    convolver.buffer = impulse;
    const wetGain = offline.createGain();
    wetGain.gain.value = ambience === 'studio' ? 0.12 : 0.2;
    panner.connect(convolver);
    convolver.connect(wetGain);
    wetGain.connect(offline.destination);
  }

  let cursorTime = 0.015;
  for (const item of timelineItems) {
    if (item.buffer) {
      const src = offline.createBufferSource();
      src.buffer = item.buffer;
      src.playbackRate.value = item.playbackRate;

      const segGain = offline.createGain();
      const dur = item.buffer.duration / item.playbackRate;
      const fadeIn = Math.min(0.01, dur * 0.2);
      const fadeOut = Math.min(0.014, dur * 0.2);
      const sustainEnd = Math.max(cursorTime + fadeIn, cursorTime + dur - fadeOut);

      segGain.gain.setValueAtTime(0.0001, cursorTime);
      segGain.gain.linearRampToValueAtTime(lineVolMult, cursorTime + fadeIn);
      segGain.gain.setValueAtTime(lineVolMult, sustainEnd);
      segGain.gain.linearRampToValueAtTime(0.0001, cursorTime + dur);

      src.connect(segGain);
      segGain.connect(outputTarget);
      src.start(cursorTime);

      cursorTime += dur;
    }
    cursorTime += item.pauseSec;
  }

  const rendered = await offline.startRendering();
  let maxPeak = 0;
  for (let ch = 0; ch < rendered.numberOfChannels; ch++) {
    const data = rendered.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      const a = Math.abs(data[i]);
      if (a > maxPeak) maxPeak = a;
    }
  }
  if (maxPeak > 0.85) {
    const scale = 0.85 / maxPeak;
    for (let ch = 0; ch < rendered.numberOfChannels; ch++) {
      const data = rendered.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        data[i] *= scale;
      }
    }
  }

  return rendered;
}

export async function renderLineToStereoBuffer(
  line: DialogueLine,
  character: Character,
  ambience: RoomAmbience,
  pitchFactor = 1.0
): Promise<AudioBuffer> {
  const tl = getGoogleTtsCode(character.language);
  if (!tl) {
    return renderMeSpeakLineToStereoBuffer(line, character, ambience);
  }

  try {
    const googleBuf = await renderGoogleServerLineToStereoBuffer(
      line,
      character,
      ambience,
      pitchFactor
    );
    if (googleBuf) return googleBuf;
  } catch (err) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return renderMeSpeakLineToStereoBuffer(line, character, ambience);
    }
    throw err;
  }
  return renderMeSpeakLineToStereoBuffer(line, character, ambience);
}

async function renderMeSpeakLineToStereoBuffer(
  line: DialogueLine,
  character: Character,
  ambience: RoomAmbience
): Promise<AudioBuffer> {
  const studioVoice = await ensureLanguageLoaded(character.language);

  const emotion = EMOTION_PROFILES[line.emotion];
  const chunks = parseProsodyChunks(line.text, line.emphasis);

  const rateOffsetMult = 1 + line.rateOffset / 100;
  const lineVolMult = clamp((line.volumePercent ?? 100) / 100, 0.35, 1.0);
  const combinedRateMult = character.baseRate * rateOffsetMult;

  const variant = emotion.useWhisperVariant
    ? character.gender === 'female'
      ? 'whisperf'
      : 'whisper'
    : character.variant;

  const renderedPieces: { samples: Float32Array; sampleRate: number; gain: number; pauseAfterSec: number }[] = [];

  for (const chunk of chunks) {
    if (chunk.type === 'pause') {
      renderedPieces.push({
        samples: new Float32Array(0),
        sampleRate: TARGET_SAMPLE_RATE,
        gain: 1,
        pauseAfterSec: chunk.pauseMs / 1000,
      });
      continue;
    }
    if (!chunk.text) continue;

    const speakText = transliterateForStudio(chunk.text, character.language);
    if (!speakText.trim()) continue;

    // Keep pitch strictly at natural 50 to avoid pitch-shifting artifacts
    const espeakPitch = 50;
    const espeakSpeed = Math.round(clamp(164 * combinedRateMult * chunk.rateFactor, 105, 255));
    const espeakWordGap = Math.round(clamp(emotion.wordGap + chunk.wordGapBonus, 0, 10));
    const espeakAmp = Math.round(clamp(64 * lineVolMult * chunk.gainFactor, 34, 72));

    const rawBuffer = meSpeak.speak(speakText, {
      voice: studioVoice,
      variant,
      pitch: espeakPitch,
      speed: espeakSpeed,
      wordgap: espeakWordGap,
      amplitude: espeakAmp,
      rawdata: 'arraybuffer',
    }) as ArrayBuffer | null;

    if (rawBuffer && rawBuffer.byteLength > 44) {
      const decoded = decodeWavBuffer(rawBuffer);
      const cleanRaw = cleanAndTrimPcm(decoded.samples, decoded.sampleRate);
      const upsampled = resampleToTargetRate(cleanRaw, decoded.sampleRate, TARGET_SAMPLE_RATE);
      renderedPieces.push({
        samples: upsampled,
        sampleRate: TARGET_SAMPLE_RATE,
        gain: clamp(0.84 * lineVolMult * chunk.gainFactor, 0.3, 0.9),
        pauseAfterSec: chunk.pauseMs / 1000,
      });
    }
  }

  if (renderedPieces.length === 0) {
    const offline = new OfflineAudioContext(2, Math.floor(TARGET_SAMPLE_RATE * 0.25), TARGET_SAMPLE_RATE);
    return offline.startRendering();
  }

  const reverbTailSec = ambience === 'dry' ? 0.05 : ambience === 'studio' ? 0.2 : 0.44;
  let totalSeconds = 0.025;
  for (const piece of renderedPieces) {
    totalSeconds += piece.samples.length / piece.sampleRate;
    totalSeconds += piece.pauseAfterSec;
  }
  totalSeconds += reverbTailSec;

  const totalFrames = Math.max(1024, Math.ceil(totalSeconds * TARGET_SAMPLE_RATE));
  const offline = new OfflineAudioContext(2, totalFrames, TARGET_SAMPLE_RATE);

  const highPass = offline.createBiquadFilter();
  highPass.type = 'highpass';
  highPass.frequency.value = 95;
  highPass.Q.value = 0.707;

  const lowShelf = offline.createBiquadFilter();
  lowShelf.type = 'lowshelf';
  lowShelf.frequency.value = 210;
  lowShelf.gain.value = emotion.lowShelfDb + (character.gender === 'male' ? 1.0 : 0);

  // De-buzz filter: attenuates eSpeak's metallic 2.6-3.1 kHz resonance
  const deBuzz = offline.createBiquadFilter();
  deBuzz.type = 'peaking';
  deBuzz.frequency.value = character.gender === 'female' ? 3050 : 2750;
  deBuzz.Q.value = 1.35;
  deBuzz.gain.value = emotion.presenceDb;

  // De-harsh filter: softens sibilance and upper nasal overtones
  const deHarsh = offline.createBiquadFilter();
  deHarsh.type = 'peaking';
  deHarsh.frequency.value = 4350;
  deHarsh.Q.value = 1.2;
  deHarsh.gain.value = -3.2;

  // Cascaded 24 dB/oct Butterworth low-pass to remove harsh high harmonics
  const cutoffHz = emotion.useWhisperVariant ? 4600 : 5400;
  const lowPass1 = offline.createBiquadFilter();
  lowPass1.type = 'lowpass';
  lowPass1.frequency.value = cutoffHz;
  lowPass1.Q.value = 0.707;

  const lowPass2 = offline.createBiquadFilter();
  lowPass2.type = 'lowpass';
  lowPass2.frequency.value = cutoffHz;
  lowPass2.Q.value = 0.707;

  const panner = offline.createStereoPanner();
  panner.pan.value = clamp(character.pan, -0.75, 0.75);

  const dryGain = offline.createGain();
  dryGain.gain.value = 0.88;

  highPass.connect(lowShelf);
  lowShelf.connect(deBuzz);
  deBuzz.connect(deHarsh);
  deHarsh.connect(lowPass1);
  lowPass1.connect(lowPass2);
  lowPass2.connect(panner);
  panner.connect(dryGain);
  dryGain.connect(offline.destination);

  const impulse = getRoomImpulse(offline, ambience);
  if (impulse) {
    const convolver = offline.createConvolver();
    convolver.buffer = impulse;
    const wetGain = offline.createGain();
    wetGain.gain.value = ambience === 'studio' ? 0.12 : 0.2;
    panner.connect(convolver);
    convolver.connect(wetGain);
    wetGain.connect(offline.destination);
  }

  let cursorTime = 0.015;
  for (const piece of renderedPieces) {
    if (piece.samples.length > 0) {
      const segBuf = offline.createBuffer(1, piece.samples.length, piece.sampleRate);
      segBuf.getChannelData(0).set(piece.samples);

      const src = offline.createBufferSource();
      src.buffer = segBuf;

      const segGain = offline.createGain();
      const dur = piece.samples.length / piece.sampleRate;
      const g = piece.gain;
      const fadeIn = Math.min(0.012, dur * 0.25);
      const fadeOut = Math.min(0.015, dur * 0.25);
      const sustainEnd = Math.max(cursorTime + fadeIn, cursorTime + dur - fadeOut);

      segGain.gain.setValueAtTime(0.0001, cursorTime);
      segGain.gain.linearRampToValueAtTime(g, cursorTime + fadeIn);
      segGain.gain.setValueAtTime(g, sustainEnd);
      segGain.gain.linearRampToValueAtTime(0.0001, cursorTime + dur);

      src.connect(segGain);
      segGain.connect(highPass);
      src.start(cursorTime);

      cursorTime += dur;
    }
    cursorTime += piece.pauseAfterSec;
  }

  const rendered = await offline.startRendering();

  // Peak safety guard so live playback never clips the browser mixer
  let maxPeak = 0;
  for (let ch = 0; ch < rendered.numberOfChannels; ch++) {
    const data = rendered.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      const a = Math.abs(data[i]);
      if (a > maxPeak) maxPeak = a;
    }
  }
  if (maxPeak > 0.85) {
    const scale = 0.85 / maxPeak;
    for (let ch = 0; ch < rendered.numberOfChannels; ch++) {
      const data = rendered.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        data[i] *= scale;
      }
    }
  }

  return rendered;
}

export function estimateProjectDurationSec(project: DialogueProject): number {
  const charMap = new Map(project.characters.map((c) => [c.id, c]));
  let total = 0;

  for (const line of project.lines) {
    if (!line.text.trim()) continue;
    const char = charMap.get(line.characterId) || project.characters[0];
    if (!char) continue;

    const emotion = EMOTION_PROFILES[line.emotion];
    const rate = char.baseRate * emotion.rateMult * (1 + line.rateOffset / 100);
    const wpm = clamp(150 * rate, 80, 280);

    const words = line.text
      .replace(/\[pausa[^\]]*\]/gi, '')
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;

    const chunks = parseProsodyChunks(line.text, line.emphasis);
    const internalPauses = chunks.reduce((acc, c) => acc + c.pauseMs / 1000, 0);

    total += (words / wpm) * 60 + internalPauses + line.pauseAfterMs / 1000;
  }

  return Math.max(0, total);
}

async function encodeStereoPcmToMp3(
  leftMaster: Float32Array,
  rightMaster: Float32Array,
  sampleRate: number,
  bitrate: number,
  title: string,
  onProgress?: (percent: number, stage: string) => void
): Promise<{ blob: Blob; durationSec: number; fileName: string }> {
  const totalSamples = leftMaster.length;
  let peak = 0.001;
  for (let i = 0; i < totalSamples; i++) {
    const absL = Math.abs(leftMaster[i]);
    const absR = Math.abs(rightMaster[i]);
    if (absL > peak) peak = absL;
    if (absR > peak) peak = absR;
  }

  // Keep -1.5 dBFS headroom (0.84) to guarantee zero MP3 inter-sample clipping
  const normGain = peak > 0.02 ? 0.84 / peak : 1.0;

  const leftInt16 = new Int16Array(totalSamples);
  const rightInt16 = new Int16Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    leftInt16[i] = Math.round(clamp(leftMaster[i] * normGain, -1, 1) * 32767);
    rightInt16[i] = Math.round(clamp(rightMaster[i] * normGain, -1, 1) * 32767);
  }

  onProgress?.(70, `Codifica MP3 (${bitrate} kbps)...`);

  const validRates = [32000, 44100, 48000];
  const encRate = validRates.includes(sampleRate) ? sampleRate : 44100;
  const encoder = new Mp3Encoder(2, encRate, bitrate);
  const blockSize = 1152;
  const mp3Chunks: Uint8Array[] = [];
  const totalBlocks = Math.ceil(totalSamples / blockSize);

  for (let b = 0; b < totalBlocks; b++) {
    const start = b * blockSize;
    const end = Math.min(start + blockSize, totalSamples);
    const leftSlice = leftInt16.subarray(start, end);
    const rightSlice = rightInt16.subarray(start, end);
    const encoded = encoder.encodeBuffer(leftSlice, rightSlice);
    if (encoded.length > 0) {
      mp3Chunks.push(new Uint8Array(encoded));
    }
    if (b % 60 === 0) {
      const pct = 70 + Math.round((b / Math.max(1, totalBlocks)) * 28);
      onProgress?.(pct, `Codifica MP3 (${bitrate} kbps)...`);
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  const flushed = encoder.flush();
  if (flushed.length > 0) {
    mp3Chunks.push(new Uint8Array(flushed));
  }

  const blobParts: BlobPart[] = mp3Chunks.map((chunk) => chunk.buffer as ArrayBuffer);
  const blob = new Blob(blobParts, { type: 'audio/mpeg' });
  const safeSlug = (title || 'dialogo-scena-vocale')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '');

  onProgress?.(100, 'Esportazione completata');

  return {
    blob,
    durationSec: totalSamples / encRate,
    fileName: `${safeSlug || 'dialogo'}.mp3`,
  };
}

export async function exportDialogueToMp3(
  project: DialogueProject,
  onProgress?: (percent: number, stage: string) => void
): Promise<{ blob: Blob; durationSec: number; fileName: string }> {
  const validLines = project.lines.filter((l) => l.text.trim().length > 0);
  if (validLines.length === 0) {
    throw new Error('Aggiungi almeno una battuta con testo prima di esportare.');
  }

  const charMap = new Map(project.characters.map((c) => [c.id, c]));
  const pitchMap = computeCharacterPitchMap(project.characters);
  const renderedLines: { buffer: AudioBuffer; pauseAfterSec: number }[] = [];

  for (let i = 0; i < validLines.length; i++) {
    const line = validLines[i];
    const char = charMap.get(line.characterId) || project.characters[0];
    onProgress?.(
      Math.round((i / validLines.length) * 58),
      `Generazione voce Google ${i + 1} di ${validLines.length} (${char.name})...`
    );
    const buffer = await renderLineToStereoBuffer(
      line,
      char,
      project.ambience,
      pitchMap.get(char.id) ?? 1.0
    );
    renderedLines.push({
      buffer,
      pauseAfterSec: line.pauseAfterMs / 1000,
    });
    await new Promise((r) => setTimeout(r, 0));
  }

  onProgress?.(64, 'Masterizzazione traccia stereo...');

  const leadInSamples = Math.floor(0.15 * TARGET_SAMPLE_RATE);
  const tailOutSamples = Math.floor(0.35 * TARGET_SAMPLE_RATE);
  let totalSamples = leadInSamples + tailOutSamples;

  for (let i = 0; i < renderedLines.length; i++) {
    totalSamples += renderedLines[i].buffer.length;
    if (i < renderedLines.length - 1) {
      totalSamples += Math.floor(renderedLines[i].pauseAfterSec * TARGET_SAMPLE_RATE);
    }
  }

  const leftMaster = new Float32Array(totalSamples);
  const rightMaster = new Float32Array(totalSamples);

  let writeOffset = leadInSamples;
  for (let i = 0; i < renderedLines.length; i++) {
    const { buffer, pauseAfterSec } = renderedLines[i];
    const srcL = buffer.getChannelData(0);
    const srcR = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : srcL;

    for (let s = 0; s < buffer.length; s++) {
      leftMaster[writeOffset + s] += srcL[s];
      rightMaster[writeOffset + s] += srcR[s];
    }

    writeOffset += buffer.length;
    if (i < renderedLines.length - 1) {
      writeOffset += Math.floor(pauseAfterSec * TARGET_SAMPLE_RATE);
    }
  }

  return encodeStereoPcmToMp3(
    leftMaster,
    rightMaster,
    TARGET_SAMPLE_RATE,
    project.mp3Bitrate,
    project.title,
    onProgress
  );
}

export class DialoguePlaybackController {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private utterResolver: (() => void) | null = null;
  private pauseResolver: (() => void) | null = null;
  private cancelled = false;
  private pauseTimer: number | null = null;

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public stop(): void {
    this.cancelled = true;
    this.activeUtterance = null;
    if (this.pauseTimer !== null) {
      window.clearTimeout(this.pauseTimer);
      this.pauseTimer = null;
    }
    if (this.pauseResolver) {
      const r = this.pauseResolver;
      this.pauseResolver = null;
      r();
    }
    if (this.utterResolver) {
      const r = this.utterResolver;
      this.utterResolver = null;
      r();
    }
    if (this.currentSource) {
      try {
        this.currentSource.onended = null;
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch {
        // Ignore already stopped source
      }
      this.currentSource = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  private waitMs(ms: number): Promise<void> {
    return new Promise((resolve) => {
      if (this.cancelled || ms <= 0) {
        resolve();
        return;
      }
      this.pauseResolver = resolve;
      this.pauseTimer = window.setTimeout(() => {
        this.pauseTimer = null;
        if (this.pauseResolver === resolve) this.pauseResolver = null;
        resolve();
      }, ms);
    });
  }

  public async playLines(
    project: DialogueProject,
    linesToPlay: DialogueLine[],
    callbacks: {
      onLineStart?: (lineId: string, index: number) => void;
      onFinish?: () => void;
      onCancel?: () => void;
      onError?: (msg: string) => void;
    }
  ): Promise<void> {
    this.stop();
    this.cancelled = false;

    const charMap = new Map(project.characters.map((c) => [c.id, c]));

    try {
      const hasWebSpeech =
        typeof window !== 'undefined' && 'speechSynthesis' in window;
      let availableVoices = hasWebSpeech ? window.speechSynthesis.getVoices() : [];
      if (hasWebSpeech && project.engine === 'webspeech' && availableVoices.length === 0) {
        await this.waitMs(150);
        if (this.cancelled) return;
        availableVoices = window.speechSynthesis.getVoices();
      }

      const useWebSpeech =
        project.engine === 'webspeech' && hasWebSpeech && availableVoices.length > 0;

      if (!useWebSpeech) {
        if (!this.audioCtx || this.audioCtx.state === 'closed') {
          this.audioCtx = new AudioContext();
        }
        if (this.audioCtx.state === 'suspended') {
          await this.audioCtx.resume();
        }
        if (!this.analyser) {
          this.analyser = this.audioCtx.createAnalyser();
          this.analyser.fftSize = 256;
          this.analyser.smoothingTimeConstant = 0.78;
          this.analyser.connect(this.audioCtx.destination);
        }

        const pitchMap = computeCharacterPitchMap(project.characters);

        for (let i = 0; i < linesToPlay.length; i++) {
          if (this.cancelled) break;
          const line = linesToPlay[i];
          if (!line.text.trim()) continue;

          const char = charMap.get(line.characterId) || project.characters[0];
          callbacks.onLineStart?.(line.id, i);

          const buf = await renderLineToStereoBuffer(
            line,
            char,
            project.ambience,
            pitchMap.get(char.id) ?? 1.0
          );
          if (this.cancelled) break;

          await new Promise<void>((resolve) => {
            if (!this.audioCtx || !this.analyser || this.cancelled) {
              resolve();
              return;
            }
            const src = this.audioCtx.createBufferSource();
            src.buffer = buf;
            src.connect(this.analyser);
            this.currentSource = src;
            src.onended = () => {
              if (this.currentSource === src) this.currentSource = null;
              resolve();
            };
            src.start(0);
          });

          if (!this.cancelled && i < linesToPlay.length - 1) {
            await this.waitMs(line.pauseAfterMs);
          }
        }
      } else {
        // Brief post-cancel settle so Chromium does not swallow the first utterance
        await this.waitMs(70);
        if (this.cancelled) return;

        // Assign distinct automatic Google/Android voices per character when systemVoiceUri is unset
        const autoVoiceMap = new Map<string, SpeechSynthesisVoice>();
        const usedUris = new Set<string>();
        for (const c of project.characters) {
          if (c.systemVoiceUri) {
            const explicit = availableVoices.find((v) => v.voiceURI === c.systemVoiceUri);
            if (explicit) {
              autoVoiceMap.set(c.id, explicit);
              usedUris.add(explicit.voiceURI);
              continue;
            }
          }
          const langMeta = SUPPORTED_LANGUAGES.find((l) => l.code === c.language);
          const bcp47 = langMeta?.bcp47 || 'it-IT';
          const picked = pickAutomaticGoogleVoice(availableVoices, bcp47, c.gender, usedUris);
          if (picked) {
            autoVoiceMap.set(c.id, picked);
            usedUris.add(picked.voiceURI);
          }
        }

        for (let i = 0; i < linesToPlay.length; i++) {
          if (this.cancelled) break;
          const line = linesToPlay[i];
          if (!line.text.trim()) continue;

          const char = charMap.get(line.characterId) || project.characters[0];
          callbacks.onLineStart?.(line.id, i);

          await this.speakLineWithWebSpeech(
            line,
            char,
            availableVoices,
            autoVoiceMap.get(char.id)
          );

          if (!this.cancelled && i < linesToPlay.length - 1) {
            await this.waitMs(line.pauseAfterMs);
          }
        }
      }
    } catch (err) {
      if (!this.cancelled) {
        callbacks.onError?.(err instanceof Error ? err.message : 'Errore durante la riproduzione.');
      }
    } finally {
      if (this.cancelled) {
        callbacks.onCancel?.();
      } else {
        callbacks.onFinish?.();
      }
    }
  }

  public async previewSystemVoice(
    voice: SpeechSynthesisVoice,
    sampleText: string,
    onDone?: () => void
  ): Promise<void> {
    this.stop();
    this.cancelled = false;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onDone?.();
      return;
    }

    await this.waitMs(70);
    if (this.cancelled) return;

    await new Promise<void>((resolve) => {
      const utter = new SpeechSynthesisUtterance(sampleText);
      this.activeUtterance = utter;
      this.utterResolver = resolve;
      utter.voice = voice;
      utter.lang = voice.lang || 'it-IT';
      utter.pitch = 1.0;
      utter.rate = 1.0;
      utter.volume = 1.0;

      const watchdog = window.setTimeout(() => {
        finish();
      }, 15000);

      const finish = () => {
        window.clearTimeout(watchdog);
        if (this.activeUtterance === utter) this.activeUtterance = null;
        if (this.utterResolver === resolve) this.utterResolver = null;
        resolve();
      };
      utter.onend = finish;
      utter.onerror = finish;
      window.speechSynthesis.speak(utter);
    });

    if (!this.cancelled) {
      onDone?.();
    }
  }

  private parseWebSpeechSegments(
    rawText: string
  ): ({ type: 'speech'; text: string } | { type: 'pause'; pauseMs: number })[] {
    const out: ({ type: 'speech'; text: string } | { type: 'pause'; pauseMs: number })[] = [];
    const tokenRegex = /\[pausa\s+(\d+(?:\.\d+)?)\s*(ms|s)?\]/gi;
    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(rawText)) !== null) {
      if (match.index > lastIdx) {
        const text = rawText.slice(lastIdx, match.index).replace(/\s+/g, ' ').trim();
        if (text) out.push({ type: 'speech', text: text.replace(/\*([^*]+)\*/g, '$1') });
      }
      const num = parseFloat(match[1]);
      const unit = (match[2] || 'ms').toLowerCase();
      const ms = Math.min(4000, Math.max(50, unit === 's' ? num * 1000 : num));
      out.push({ type: 'pause', pauseMs: ms });
      lastIdx = match.index + match[0].length;
    }

    if (lastIdx < rawText.length) {
      const tail = rawText.slice(lastIdx).replace(/\s+/g, ' ').trim();
      if (tail) out.push({ type: 'speech', text: tail.replace(/\*([^*]+)\*/g, '$1') });
    }

    return out;
  }

  private async speakLineWithWebSpeech(
    line: DialogueLine,
    char: Character,
    availableVoices: SpeechSynthesisVoice[],
    preselectedVoice?: SpeechSynthesisVoice
  ): Promise<void> {
    const segments = this.parseWebSpeechSegments(line.text);
    const langMeta = SUPPORTED_LANGUAGES.find((l) => l.code === char.language);
    const bcp47 = langMeta?.bcp47 || 'it-IT';

    const chosenVoice =
      preselectedVoice ||
      (char.systemVoiceUri
        ? availableVoices.find((v) => v.voiceURI === char.systemVoiceUri)
        : undefined) ||
      pickAutomaticGoogleVoice(availableVoices, bcp47, char.gender);

    const rate = clamp(char.baseRate * (1 + line.rateOffset / 100), 0.65, 1.55);
    const volume = clamp((line.volumePercent ?? 100) / 100, 0.35, 1.0);

    for (const seg of segments) {
      if (this.cancelled) break;
      if (seg.type === 'pause') {
        await this.waitMs(seg.pauseMs);
        continue;
      }
      if (!seg.text) continue;

      await new Promise<void>((resolve) => {
        if (this.cancelled) {
          resolve();
          return;
        }
        const utter = new SpeechSynthesisUtterance(seg.text);
        this.activeUtterance = utter;
        this.utterResolver = resolve;
        utter.lang = chosenVoice?.lang || bcp47;
        if (chosenVoice) utter.voice = chosenVoice;
        // Strictly keep pitch = 1.0 (natural timbre) so Google/Android voices never distort
        utter.pitch = 1.0;
        utter.rate = rate;
        utter.volume = volume;

        let settled = false;
        const maxMs = Math.max(12000, Math.round((seg.text.length * 190) / rate) + 5000);
        const keepAlive = window.setInterval(() => {
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            try {
              window.speechSynthesis.resume();
            } catch {
              // Ignore resume errors
            }
          }
        }, 8000);
        const watchdog = window.setTimeout(() => done(), maxMs);

        const done = () => {
          if (settled) return;
          settled = true;
          window.clearInterval(keepAlive);
          window.clearTimeout(watchdog);
          if (this.activeUtterance === utter) this.activeUtterance = null;
          if (this.utterResolver === resolve) this.utterResolver = null;
          resolve();
        };
        utter.onend = done;
        utter.onerror = done;

        window.speechSynthesis.speak(utter);
      });
    }
  }
}
