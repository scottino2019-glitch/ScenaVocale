import { spawn, spawnSync } from 'node:child_process';
import type { IncomingMessage, ServerResponse } from 'node:http';

function detectFfmpeg(): boolean {
  try {
    const res = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return res.status === 0;
  } catch {
    return false;
  }
}

const HAS_FFMPEG = detectFfmpeg();

function splitTextForGoogleTts(raw: string, maxLen = 175): string[] {
  const clean = raw.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  if (clean.length <= maxLen) return [clean];

  const chunks: string[] = [];
  let remaining = clean;

  while (remaining.length > maxLen) {
    const slice = remaining.slice(0, maxLen);
    let cutIdx = -1;

    for (const sep of ['. ', '! ', '? ', '。', '！', '？', '; ', ', ', ': ']) {
      const idx = slice.lastIndexOf(sep);
      if (idx > Math.floor(maxLen * 0.35)) {
        cutIdx = Math.max(cutIdx, idx + sep.length);
      }
    }

    if (cutIdx === -1) {
      const spaceIdx = slice.lastIndexOf(' ');
      cutIdx = spaceIdx > 20 ? spaceIdx + 1 : maxLen;
    }

    const part = remaining.slice(0, cutIdx).trim();
    if (part) chunks.push(part);
    remaining = remaining.slice(cutIdx).trim();
  }

  if (remaining) {
    chunks.push(remaining);
  }
  return chunks;
}

async function fetchGoogleTtsChunk(text: string, tl: string): Promise<Buffer> {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
    text
  )}&tl=${encodeURIComponent(tl)}&client=tw-ob`;

  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Referer: 'https://translate.google.com/',
    },
    signal: AbortSignal.timeout(9000),
  });

  if (!response.ok) {
    throw new Error(`Google TTS HTTP ${response.status}`);
  }

  const ab = await response.arrayBuffer();
  return Buffer.from(ab);
}

function processWithFfmpeg(
  inputMp3: Buffer,
  pitchFactor: number,
  rateFactor: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const safePitch = Math.max(0.72, Math.min(1.18, pitchFactor));
    const safeTempo = Math.max(0.65, Math.min(1.55, rateFactor));
    const filter = `rubberband=pitch=${safePitch.toFixed(3)}:tempo=${safeTempo.toFixed(
      3
    )}:formant=shifted:pitchq=quality:transients=crisp,highpass=f=75`;

    const ff = spawn('ffmpeg', [
      '-v',
      'error',
      '-f',
      'mp3',
      '-i',
      'pipe:0',
      '-af',
      filter,
      '-ar',
      '44100',
      '-ac',
      '1',
      '-f',
      'mp3',
      '-b:a',
      '192k',
      'pipe:1',
    ]);

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    ff.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
    ff.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));
    ff.on('error', (err) => reject(err));
    ff.on('close', (code) => {
      if (code === 0 && stdoutChunks.length > 0) {
        resolve(Buffer.concat(stdoutChunks));
      } else {
        const errMsg = Buffer.concat(stderrChunks).toString('utf8').trim();
        reject(new Error(errMsg || `ffmpeg exited with code ${code}`));
      }
    });

    ff.stdin.on('error', () => {
      // Handled by close/error listeners
    });
    ff.stdin.end(inputMp3);
  });
}

async function readJsonBody(req: IncomingMessage & { body?: unknown }): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object') {
    return req.body as Record<string, unknown>;
  }
  if (typeof req.body === 'string') {
    return JSON.parse(req.body) as Record<string, unknown>;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  return JSON.parse(raw) as Record<string, unknown>;
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

export default async function handler(
  req: IncomingMessage & { body?: unknown; method?: string },
  res: ServerResponse
): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Metodo non consentito.' });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const rawText = typeof body.text === 'string' ? body.text.trim() : '';
    const tl = typeof body.tl === 'string' ? body.tl.trim() : 'it';
    const pitchFactor =
      typeof body.pitchFactor === 'number' && Number.isFinite(body.pitchFactor)
        ? Math.max(0.72, Math.min(1.18, body.pitchFactor))
        : 1.0;
    const rateFactor =
      typeof body.rateFactor === 'number' && Number.isFinite(body.rateFactor)
        ? Math.max(0.65, Math.min(1.55, body.rateFactor))
        : 1.0;

    if (!rawText || rawText.length > 2500) {
      sendJson(res, 400, { error: 'Testo non valido o troppo lungo.' });
      return;
    }

    if (!/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,4})?$/.test(tl)) {
      sendJson(res, 400, { error: 'Codice lingua non valido.' });
      return;
    }

    const segments = splitTextForGoogleTts(rawText);
    if (segments.length === 0) {
      sendJson(res, 400, { error: 'Nessun testo pronunciabile.' });
      return;
    }

    const audioBuffers: Buffer[] = [];
    for (const seg of segments) {
      const buf = await fetchGoogleTtsChunk(seg, tl);
      audioBuffers.push(buf);
    }

    const needsShaping =
      Math.abs(pitchFactor - 1.0) > 0.015 || Math.abs(rateFactor - 1.0) > 0.02;

    if (HAS_FFMPEG && (needsShaping || audioBuffers.length > 1)) {
      try {
        const shapedMp3 = await processWithFfmpeg(
          Buffer.concat(audioBuffers),
          pitchFactor,
          rateFactor
        );
        sendJson(res, 200, {
          shaped: true,
          segments: [shapedMp3.toString('base64')],
        });
        return;
      } catch {
        // If ffmpeg fails at runtime, return unshaped clean MP3 segments
      }
    }

    sendJson(res, 200, {
      shaped: false,
      segments: audioBuffers.map((b) => b.toString('base64')),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Errore sintesi audio server.';
    sendJson(res, 502, { error: message });
  }
}
