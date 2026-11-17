import { useEffect, useMemo, useState } from 'react';
import { Check, RefreshCw, Search, Volume2, X } from 'lucide-react';
import { Character, LanguageGroup } from '../types/dialogue';
import { formatVoiceOption, mapVoiceLangToLanguageCode } from '../utils/googleVoices';

interface GoogleVoicesModalProps {
  isOpen: boolean;
  targetCharacter: Character | null;
  systemVoices: SpeechSynthesisVoice[];
  previewingVoiceUri: string | null;
  onClose: () => void;
  onRefreshVoices: () => void;
  onPreviewVoice: (voice: SpeechSynthesisVoice, sampleText: string) => void;
  onAssignVoice: (characterId: string, voice: SpeechSynthesisVoice) => void;
}

type CatalogFilter = 'all' | 'google' | LanguageGroup;

const FILTER_TABS: { id: CatalogFilter; label: string }[] = [
  { id: 'all', label: 'Tutte le voci' },
  { id: 'google', label: 'Solo Google / Android' },
  { id: 'occidentali', label: 'Occidentali' },
  { id: 'slave', label: 'Slave' },
  { id: 'orientali', label: 'Orientali' },
];

export function GoogleVoicesModal({
  isOpen,
  targetCharacter,
  systemVoices,
  previewingVoiceUri,
  onClose,
  onRefreshVoices,
  onPreviewVoice,
  onAssignVoice,
}: GoogleVoicesModalProps) {
  const [filter, setFilter] = useState<CatalogFilter>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const formattedVoices = useMemo(() => {
    return systemVoices
      .map((v) => formatVoiceOption(v))
      .sort((a, b) => {
        if (a.isGoogleAndroid !== b.isGoogleAndroid) {
          return a.isGoogleAndroid ? -1 : 1;
        }
        return a.label.localeCompare(b.label, 'it');
      });
  }, [systemVoices]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return formattedVoices.filter((item) => {
      if (filter === 'google' && !item.isGoogleAndroid) return false;
      if (
        (filter === 'occidentali' || filter === 'slave' || filter === 'orientali') &&
        item.group !== filter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        item.label.toLowerCase().includes(q) ||
        item.langCode.toLowerCase().includes(q) ||
        item.voice.name.toLowerCase().includes(q)
      );
    });
  }, [filter, formattedVoices, search]);

  if (!isOpen || !targetCharacter) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="google-voices-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2A1624]/75"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-[#C5C0D2] rounded-xl border border-[#7F7994] shadow-2xl overflow-hidden max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#4E2030] border-b border-[#7D3C52] flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2
              id="google-voices-title"
              className="font-display text-xl font-bold text-[#EEDFE4] truncate"
            >
              Catalogo Voci Google / Android per {targetCharacter.name}
            </h2>
            <p className="text-sm text-[#D6B8C2] mt-0.5 tabular-nums">
              {formattedVoices.length} voci rilevate dal browser/dispositivo · timbro naturale senza alterazioni di tono
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onRefreshVoices}
              title="Ricarica voci dal dispositivo"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-[#EEDFE4] bg-[#632B3E] hover:bg-[#7A374E] rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Ricarica</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Chiudi"
              className="p-2 text-[#EEDFE4] bg-[#632B3E] hover:bg-[#7A374E] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-4 bg-[#B6B0C6] border-b border-[#8B85A0] space-y-3">
          <div className="relative">
            <Search
              className="w-4 h-4 text-[#4E2030] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca voce Google / Android, lingua (es. it, en, pl, ru, ja) o genere..."
              className="w-full pl-10 pr-4 py-2 text-[15px] font-medium text-[#1B1E36] bg-[#D4D0DF] border border-[#7F7994] rounded-lg focus:outline-none focus:border-[#4E2030] placeholder:text-[#554F6B]"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3.5 py-1.5 text-sm font-bold rounded-lg transition-colors cursor-pointer ${
                  filter === tab.id
                    ? 'bg-[#4E2030] text-[#EEDFE4]'
                    : 'bg-[#D4D0DF] text-[#1B1E36] border border-[#7F7994] hover:border-[#4E2030]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Voice List */}
        <div className="divide-y divide-[#9C96B0] overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-[#1B1E36]">
              <p className="font-display text-lg font-bold">
                {formattedVoices.length === 0
                  ? 'Nessuna voce Google / Android esposta da questo browser'
                  : 'Nessuna voce trovata con questo filtro'}
              </p>
              <p className="text-sm text-[#35304A] mt-2 max-w-md mx-auto">
                {formattedVoices.length === 0
                  ? 'Su Chrome desktop o Android con Servizi Vocali Google installati vedrai tutte le voci disponibili per tutte le lingue. Premi Ricarica dopo aver abilitato le voci del sistema.'
                  : 'Prova a cambiare categoria o svuotare il campo di ricerca.'}
              </p>
            </div>
          ) : (
            filtered.map((item) => {
              const isSelected = targetCharacter.systemVoiceUri === item.voice.voiceURI;
              const isPreviewing = previewingVoiceUri === item.voice.voiceURI;
              const mappedLang = mapVoiceLangToLanguageCode(item.langCode);

              return (
                <div
                  key={item.voice.voiceURI}
                  className={`px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    isSelected ? 'bg-[#D4D0DF]' : 'hover:bg-[#CECADB]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-bold text-[#1B1E36] truncate">
                      {item.label}
                    </div>
                    <div className="text-sm text-[#35304A] flex flex-wrap items-center gap-2 mt-0.5">
                      <span className="font-mono font-semibold text-[#4E2030]">
                        {item.langCode}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {item.isGoogleAndroid ? 'Google / Android' : 'Voce Sistema'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{item.isLocal ? 'Locale' : 'Rete'}</span>
                      {mappedLang && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Compatibile con {mappedLang.toUpperCase()}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onPreviewVoice(item.voice, item.samplePhrase)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-bold rounded-lg transition-colors cursor-pointer ${
                        isPreviewing
                          ? 'bg-[#9E2A3B] text-[#F2DCE0]'
                          : 'bg-[#234B8A] text-[#DCE5F2] hover:bg-[#2C5CA6]'
                      }`}
                    >
                      <Volume2 className="w-4 h-4" aria-hidden="true" />
                      <span>{isPreviewing ? 'In ascolto' : 'Ascolta'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onAssignVoice(targetCharacter.id, item.voice);
                        onClose();
                      }}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-lg transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#4E2030] text-[#EEDFE4]'
                          : 'bg-[#146C60] text-[#DCEBE8] hover:bg-[#198273]'
                      }`}
                    >
                      {isSelected && <Check className="w-4 h-4" aria-hidden="true" />}
                      <span>{isSelected ? 'Attiva' : 'Scegli'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
