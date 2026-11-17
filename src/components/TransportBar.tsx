import { useEffect, useRef } from 'react';
import { Download, Play, Square } from 'lucide-react';
import { Character, DialogueLine } from '../types/dialogue';
import { EMOTION_PROFILES } from '../data/presets';

interface TransportBarProps {
  isPlaying: boolean;
  activeLine: DialogueLine | null;
  activeLineIndex: number;
  totalLines: number;
  activeCharacter: Character | null;
  estimatedDurationSec: number;
  analyser: AnalyserNode | null;
  exportProgress: { percent: number; stage: string } | null;
  lastExportUrl: { url: string; fileName: string; sizeKb: number } | null;
  onTogglePlayAll: () => void;
  onExportMp3: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}

export function TransportBar({
  isPlaying,
  activeLine,
  activeLineIndex,
  totalLines,
  activeCharacter,
  estimatedDurationSec,
  analyser,
  exportProgress,
  lastExportUrl,
  onTogglePlayAll,
  onExportMp3,
}: TransportBarProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const barCount = 40;
    const freqData = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      if (isPlaying && analyser && freqData) {
        analyser.getByteFrequencyData(freqData);
      }

      const gap = 3;
      const barWidth = (width - gap * (barCount - 1)) / barCount;

      for (let i = 0; i < barCount; i++) {
        let ratio = 0.14;
        if (isPlaying) {
          if (analyser && freqData) {
            const bin = Math.min(freqData.length - 1, Math.floor((i / barCount) * 48));
            ratio = Math.max(0.14, freqData[bin] / 255);
          } else {
            const t = performance.now() * 0.008;
            ratio = 0.25 + 0.45 * Math.abs(Math.sin(t + i * 0.45));
          }
        } else {
          ratio = 0.16 + 0.14 * Math.abs(Math.sin(i * 0.42));
        }

        const barHeight = Math.max(4, Math.round(ratio * (height - 6)));
        const x = i * (barWidth + gap);
        const y = Math.round((height - barHeight) / 2);

        ctx.fillStyle = isPlaying ? '#E8C27A' : '#8A475D';
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }

      if (isPlaying) {
        rafId = requestAnimationFrame(draw);
      }
    };

    draw();
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isPlaying, analyser, activeLine]);

  return (
    <footer className="sticky bottom-0 z-30 bg-[#4E2030] border-t border-[#7D3C52] px-6 py-3.5">
      <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Left: Master Play / Stop + Current Turn Context */}
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={onTogglePlayAll}
            disabled={totalLines === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-[15px] font-bold rounded-lg bg-[#234B8A] text-[#DCE5F2] hover:bg-[#2C5CA6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8C27A]"
          >
            {isPlaying ? (
              <>
                <Square className="w-4 h-4 fill-current" aria-hidden="true" />
                <span>Ferma</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                <span>Riproduci Tutto</span>
              </>
            )}
          </button>

          <div className="min-w-0">
            {exportProgress ? (
              <div className="flex items-center gap-3">
                <div className="w-40 h-2 bg-[#3A1522] rounded-full overflow-hidden border border-[#8A475D]">
                  <div
                    className="h-full bg-[#146C60] transition-all duration-150"
                    style={{ width: `${exportProgress.percent}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-[#EEDFE4] truncate tabular-nums">
                  {exportProgress.percent}% · {exportProgress.stage}
                </span>
              </div>
            ) : isPlaying && activeLine && activeCharacter ? (
              <div className="text-[15px] text-[#EEDFE4] font-semibold truncate flex items-center gap-2">
                <span className="tabular-nums text-[#E8C27A]">
                  Battuta {activeLineIndex + 1} di {totalLines}
                </span>
                <span aria-hidden="true" className="text-[#B88999]">·</span>
                <span>{activeCharacter.name}</span>
                <span aria-hidden="true" className="text-[#B88999]">·</span>
                <span className="text-[#D6B8C2]">
                  {EMOTION_PROFILES[activeLine.emotion].label}
                </span>
              </div>
            ) : (
              <div className="text-sm text-[#D6B8C2] flex items-center gap-2 truncate">
                <span className="tabular-nums font-semibold text-[#EEDFE4]">
                  {totalLines} {totalLines === 1 ? 'battuta' : 'battute'}
                </span>
                <span aria-hidden="true">·</span>
                <span>Pronto per riproduzione o esportazione MP3</span>
              </div>
            )}
          </div>
        </div>

        {/* Center: Live Audio Spectrum Canvas */}
        <div className="hidden sm:flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={220}
            height={36}
            aria-label="Visualizzatore spettro audio"
            className="block"
          />
        </div>

        {/* Right: Duration & MP3 Export */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className="text-xs font-medium text-[#D6B8C2]">Durata stimata</div>
            <div className="font-mono text-base font-bold text-[#EEDFE4] tabular-nums">
              {formatDuration(estimatedDurationSec)}
            </div>
          </div>

          {lastExportUrl && !exportProgress && (
            <a
              href={lastExportUrl.url}
              download={lastExportUrl.fileName}
              className="hidden md:inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold text-[#E8C27A] bg-[#3A1522] border border-[#E8C27A] hover:bg-[#632B3E] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>Scarica ({lastExportUrl.sizeKb} KB)</span>
            </a>
          )}

          <button
            type="button"
            onClick={onExportMp3}
            disabled={Boolean(exportProgress) || totalLines === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-[15px] font-bold text-[#DCEBE8] bg-[#146C60] rounded-lg hover:bg-[#198273] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8C27A]"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>MP3</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
