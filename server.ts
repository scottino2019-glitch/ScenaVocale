import express from 'express';
import type { Request, Response } from 'express';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

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

    // Prefer splitting at sentence-ending or clause punctuation
    for (const sep of ['. ', '! ', '? ', '。', '！', '？', '; ', ', ', ': ']) {
      const idx = slice.lastIndexOf(sep);
      if (idx > Math.floor(maxLen * 0.35)) {
        cutIdx = Math.max(cutIdx, idx + sep.length);
      }
    }

    // Fallback to nearest word boundary
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

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  app.post('/api/tts', async (req: Request, res: Response) => {
    try {
      const body = req.body as {
        text?: unknown;
        tl?: unknown;
        pitchFactor?: unknown;
        rateFactor?: unknown;
      };

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
        res.status(400).json({ error: 'Testo non valido o troppo lungo.' });
        return;
      }

      if (!/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,4})?$/.test(tl)) {
        res.status(400).json({ error: 'Codice lingua non valido.' });
        return;
      }

      const segments = splitTextForGoogleTts(rawText);
      if (segments.length === 0) {
        res.status(400).json({ error: 'Nessun testo pronunciabile.' });
        return;
      }

      const audioBuffers: Buffer[] = [];
      for (const seg of segments) {
        const buf = await fetchGoogleTtsChunk(seg, tl);
        audioBuffers.push(buf);
      }

      let finalMp3: Buffer = Buffer.concat(audioBuffers);
      const needsShaping =
        Math.abs(pitchFactor - 1.0) > 0.015 || Math.abs(rateFactor - 1.0) > 0.02;

      if (HAS_FFMPEG && (needsShaping || audioBuffers.length > 1)) {
        finalMp3 = await processWithFfmpeg(finalMp3, pitchFactor, rateFactor);
      }

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'no-store');
      res.send(finalMp3);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Errore sintesi audio server.';
      res.status(502).json({ error: message });
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build not found');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Scena Vocale server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
