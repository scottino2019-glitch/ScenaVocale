import { useEffect } from 'react';
import { Download, Mic, MonitorSpeaker, X } from 'lucide-react';
import { Mp3Bitrate, PlaybackEngineMode } from '../types/dialogue';

interface ExportMp3ModalProps {
  isOpen: boolean;
  engine: PlaybackEngineMode;
  hasSystemVoices: boolean;
  mp3Bitrate: Mp3Bitrate;
  estimatedDurationSec: number;
  lineCount: number;
  isExporting: boolean;
  onClose: () => void;
  onRecordGoogleMp3: () => void;
  onExportOfflineMp3: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function ExportMp3Modal({
  isOpen,
  engine,
  hasSystemVoices,
  mp3Bitrate,
  estimatedDurationSec,
  lineCount,
  isExporting,
  onClose,
  onRecordGoogleMp3,
  onExportOfflineMp3,
}: ExportMp3ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const canCaptureSystemAudio =
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices) &&
    typeof navigator.mediaDevices.getDisplayMedia === 'function';

  const canRecordGoogle = canCaptureSystemAudio && hasSystemVoices;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-mp3-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2A1624]/75"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#C5C0D2] rounded-xl border border-[#7F7994] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#4E2030] border-b border-[#7D3C52] flex items-center justify-between gap-4">
          <div>
            <h2
              id="export-mp3-title"
              className="font-display text-xl font-bold text-[#EEDFE4]"
            >
              Esporta Dialogo in MP3
            </h2>
            <p className="text-sm text-[#D6B8C2] mt-0.5 tabular-nums">
              {lineCount} {lineCount === 1 ? 'battuta' : 'battute'} · ~{formatDuration(estimatedDurationSec)} · {mp3Bitrate} kbps Stereo
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="p-2 text-[#EEDFE4] bg-[#632B3E] hover:bg-[#7A374E] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Export Options */}
        <div className="p-6 space-y-4">
          {/* Option 1: Real Google / Android Voices Capture */}
          <div className="p-5 bg-[#D4D0DF] border border-[#4E2030] rounded-xl space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-lg bg-[#4E2030] text-[#E8C27A] flex items-center justify-center shrink-0 mt-0.5">
                  <Mic className="w-5 h-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-bold text-[#1B1E36]">
                    Registra Voci Google / Android Reali
                  </h3>
                  <p className="text-[15px] text-[#35304A] mt-1 leading-relaxed">
                    Riproduce il dialogo una volta con le tue voci {engine === 'webspeech' ? 'Google / Android' : 'selezionate'} e salva in MP3 l’audio originale pulito e normalizzato, senza distorsioni.
                  </p>
                </div>
              </div>
            </div>

            {canRecordGoogle ? (
              <>
                <p className="text-sm font-semibold text-[#4E2030] bg-[#C5C0D2] border border-[#9C96B0] rounded-lg px-3.5 py-2.5">
                  Nella finestra del browser seleziona <span className="underline">Schermo intero</span> (o Scheda) e attiva la casella <span className="underline">Condividi audio di sistema</span>.
                </p>
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={() => {
                      onClose();
                      onRecordGoogleMp3();
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-[15px] font-bold text-[#DCEBE8] bg-[#146C60] hover:bg-[#198273] disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Mic className="w-4 h-4" aria-hidden="true" />
                    <span>Avvia Registrazione MP3</span>
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm font-semibold text-[#4E2030] bg-[#C5C0D2] border border-[#9C96B0] rounded-lg px-3.5 py-2.5">
                {!hasSystemVoices
                  ? 'Questo browser non espone voci Google / Android native: usa l’Esportazione MP3 Offline qui sotto.'
                  : 'Su browser mobile (Android/iOS) il sistema non consente di catturare l’audio interno della sintesi vocale: usa l’Esportazione MP3 Offline qui sotto.'}
              </p>
            )}
          </div>

          {/* Option 2: Instant Offline Synthesis MP3 */}
          <div className="p-5 bg-[#D4D0DF] border border-[#7F7994] rounded-xl space-y-3">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-lg bg-[#234B8A] text-[#DCE5F2] flex items-center justify-center shrink-0 mt-0.5">
                <MonitorSpeaker className="w-5 h-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-display text-lg font-bold text-[#1B1E36]">
                  Esporta MP3 Offline Istantaneo
                </h3>
                <p className="text-[15px] text-[#35304A] mt-1 leading-relaxed">
                  Genera subito il file MP3 in locale senza condividere lo schermo (100% senza AI). Usa i timbri formantici offline con controllo automatico del volume anti-distorsione.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={isExporting}
                onClick={() => {
                  onClose();
                  onExportOfflineMp3();
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-[15px] font-bold text-[#DCE5F2] bg-[#234B8A] hover:bg-[#2C5CA6] disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Esporta MP3 Offline</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
