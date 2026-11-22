import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ListFilter, Plus, RefreshCw, Search, Trash2, Volume2 } from 'lucide-react';
import {
  Character,
  Gender,
  LanguageCode,
  LanguageGroup,
  PlaybackEngineMode,
} from '../types/dialogue';
import {
  CAST_COMBINATIONS,
  COLOR_ORDER,
  LANGUAGE_GROUP_LABELS,
  SPEAKER_COLORS,
  SUPPORTED_LANGUAGES,
  VOICE_VARIANTS,
} from '../data/presets';
import { formatVoiceOption } from '../utils/googleVoices';

interface CastPanelProps {
  characters: Character[];
  engine: PlaybackEngineMode;
  systemVoices: SpeechSynthesisVoice[];
  previewingCharId: string | null;
  onApplyCombination: (presetId: string) => void;
  onAddCharacter: () => void;
  onUpdateCharacter: (id: string, patch: Partial<Character>) => void;
  onRemoveCharacter: (id: string) => void;
  onPreviewCharacter: (char: Character) => void;
  onRefreshVoices: () => void;
  onOpenVoiceCatalog: (characterId: string) => void;
}

const LANGUAGE_GROUPS: LanguageGroup[] = ['occidentali', 'slave', 'orientali'];

export function CastPanel({
  characters,
  engine,
  systemVoices,
  previewingCharId,
  onApplyCombination,
  onAddCharacter,
  onUpdateCharacter,
  onRemoveCharacter,
  onPreviewCharacter,
  onRefreshVoices,
  onOpenVoiceCatalog,
}: CastPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(
    characters[0]?.id ?? null
  );
  const [voiceFilter, setVoiceFilter] = useState('');

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

  const handleGenderChange = (char: Character, gender: Gender) => {
    const defaultVariant = VOICE_VARIANTS[gender][0].id;
    onUpdateCharacter(char.id, {
      gender,
      variant: defaultVariant,
      basePitch: 1.0,
      role: gender === 'male' ? 'Voce Maschile' : 'Voce Femminile',
    });
  };

  return (
    <aside
      aria-label="Gestione personaggi e voci Google Android"
      className="w-full lg:w-[410px] shrink-0 bg-[#4E2030] border-b lg:border-b-0 lg:border-r border-[#7D3C52] flex flex-col"
    >
      {/* Cast Combination Presets */}
      <div className="p-5 border-b border-[#7D3C52]">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-display text-lg font-bold text-[#EEDFE4]">
            Combinazioni Cast
          </h2>
          <span className="text-sm font-semibold text-[#E8C27A] tabular-nums">
            {characters.length} {characters.length === 1 ? 'voce' : 'voci'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {CAST_COMBINATIONS.map((combo) => (
            <button
              key={combo.id}
              type="button"
              onClick={() => onApplyCombination(combo.id)}
              title={combo.detail}
              className="px-3.5 py-2.5 text-left rounded-lg bg-[#632B3E] border border-[#8A475D] hover:border-[#E8C27A] hover:bg-[#703347] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8C27A]"
            >
              <div className="text-sm font-semibold text-[#EEDFE4] truncate">
                {combo.label}
              </div>
              <div className="text-xs text-[#D6B8C2] truncate mt-0.5">
                {combo.detail}
              </div>
            </button>
          ))}
          <button
            type="button"
            onClick={onAddCharacter}
            className="px-3.5 py-2.5 text-left rounded-lg bg-[#3A1522] border border-dashed border-[#E8C27A] hover:bg-[#632B3E] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8C27A] flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-[#E8C27A] shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#E8C27A] truncate">
                Aggiungi Voce
              </div>
              <div className="text-xs text-[#D6B8C2] truncate">
                Voce #{characters.length + 1}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Character List with crisp dividers */}
      <div className="divide-y divide-[#7D3C52] overflow-y-auto flex-1">
        {characters.map((char, idx) => {
          const isExpanded = expandedId === char.id;
          const colorStyle =
            SPEAKER_COLORS[char.color] ||
            SPEAKER_COLORS[COLOR_ORDER[idx % COLOR_ORDER.length]];
          const variants = VOICE_VARIANTS[char.gender];
          const langMeta = SUPPORTED_LANGUAGES.find(
            (l) => l.code === char.language
          );
          const langPrefix = (langMeta?.bcp47.split('-')[0] || 'it').toLowerCase();

          const q = voiceFilter.trim().toLowerCase();
          const matchingVoices = q
            ? formattedVoices.filter(
                (fv) =>
                  fv.label.toLowerCase().includes(q) ||
                  fv.langCode.toLowerCase().includes(q) ||
                  fv.voice.name.toLowerCase().includes(q)
              )
            : formattedVoices;

          const sameLangGoogle = matchingVoices.filter(
            (fv) =>
              fv.isGoogleAndroid &&
              fv.langCode.toLowerCase().replace('_', '-').startsWith(langPrefix)
          );
          const sameLangOther = matchingVoices.filter(
            (fv) =>
              !fv.isGoogleAndroid &&
              fv.langCode.toLowerCase().replace('_', '-').startsWith(langPrefix)
          );
          const otherLangVoices = matchingVoices.filter(
            (fv) =>
              !fv.langCode.toLowerCase().replace('_', '-').startsWith(langPrefix)
          );

          const selectedFormatted = formattedVoices.find(
            (fv) => fv.voice.voiceURI === char.systemVoiceUri
          );

          return (
            <div key={char.id} className="p-5 transition-colors">
              {/* Row Summary Header */}
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : char.id)}
                  className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8C27A] rounded"
                >
                  <span
                    className={`w-10 h-10 rounded-lg ${colorStyle.bg} ${colorStyle.text} font-display font-bold text-base flex items-center justify-center shrink-0`}
                  >
                    {char.name.slice(0, 1).toUpperCase() || '?'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-bold text-[#EEDFE4] truncate">
                      {char.name || 'Senza nome'}
                    </div>
                    <div className="text-sm text-[#D6B8C2] flex items-center gap-1.5 truncate">
                      <span>{char.gender === 'male' ? 'Maschile' : 'Femminile'}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">
                        {selectedFormatted
                          ? selectedFormatted.label
                          : langMeta?.label || char.language}
                      </span>
                    </div>
                  </div>
                </button>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onPreviewCharacter(char)}
                    title="Ascolta anteprima voce"
                    aria-label={`Prova voce di ${char.name}`}
                    className={`p-2.5 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8C27A] ${
                      previewingCharId === char.id
                        ? 'bg-[#146C60] text-[#DCEBE8]'
                        : 'bg-[#632B3E] text-[#EEDFE4] hover:bg-[#7A374E]'
                    }`}
                  >
                    <Volume2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : char.id)}
                    aria-label={isExpanded ? 'Comprimi impostazioni' : 'Espandi impostazioni'}
                    className="p-2.5 rounded-lg bg-[#632B3E] text-[#EEDFE4] hover:bg-[#7A374E] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8C27A]"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded Character Controls */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-[#7D3C52] space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#DFC5CE] mb-1.5">
                      Nome personaggio
                    </label>
                    <input
                      type="text"
                      value={char.name}
                      onChange={(e) =>
                        onUpdateCharacter(char.id, { name: e.target.value })
                      }
                      className="w-full px-3 py-2 text-[15px] text-[#EEDFE4] bg-[#3A1522] border border-[#8A475D] rounded-lg focus:outline-none focus:border-[#E8C27A]"
                      placeholder="Es. Marco"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#DFC5CE] mb-1.5">
                      Lingua (Occidentali · Slave · Orientali)
                    </label>
                    <select
                      value={char.language}
                      onChange={(e) =>
                        onUpdateCharacter(char.id, {
                          language: e.target.value as LanguageCode,
                          systemVoiceUri: undefined,
                        })
                      }
                      className="w-full px-3 py-2 text-[15px] text-[#EEDFE4] bg-[#3A1522] border border-[#8A475D] rounded-lg focus:outline-none focus:border-[#E8C27A]"
                    >
                      {LANGUAGE_GROUPS.map((grp) => (
                        <optgroup key={grp} label={LANGUAGE_GROUP_LABELS[grp]}>
                          {SUPPORTED_LANGUAGES.filter((l) => l.group === grp).map(
                            (lang) => (
                              <option key={lang.code} value={lang.code}>
                                {lang.label}
                              </option>
                            )
                          )}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  {/* Gender Segmented Toggle */}
                  <div>
                    <span className="block text-sm font-semibold text-[#DFC5CE] mb-1.5">
                      Genere Voce
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#3A1522] border border-[#8A475D] rounded-lg">
                      <button
                        type="button"
                        onClick={() => handleGenderChange(char, 'male')}
                        className={`py-2 text-sm font-bold rounded-md transition-colors cursor-pointer ${
                          char.gender === 'male'
                            ? 'bg-[#146C60] text-[#DCEBE8]'
                            : 'text-[#D6B8C2] hover:text-[#EEDFE4]'
                        }`}
                      >
                        Maschile
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGenderChange(char, 'female')}
                        className={`py-2 text-sm font-bold rounded-md transition-colors cursor-pointer ${
                          char.gender === 'female'
                            ? 'bg-[#146C60] text-[#DCEBE8]'
                            : 'text-[#D6B8C2] hover:text-[#EEDFE4]'
                        }`}
                      >
                        Femminile
                      </button>
                    </div>
                  </div>

                  {/* Wide Google / Android Voice Catalog Picker */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="block text-sm font-semibold text-[#DFC5CE]">
                        Voce Google / Android
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#E8C27A] tabular-nums">
                          {formattedVoices.length} disponibili
                        </span>
                        <button
                          type="button"
                          onClick={onRefreshVoices}
                          title="Ricarica elenco voci Google e Android"
                          aria-label="Ricarica elenco voci Google e Android"
                          className="p-1.5 rounded-md bg-[#632B3E] text-[#EEDFE4] hover:bg-[#7A374E] transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    {formattedVoices.length > 6 && (
                      <div className="relative">
                        <Search
                          className="w-4 h-4 text-[#B88999] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                          aria-hidden="true"
                        />
                        <input
                          type="text"
                          value={voiceFilter}
                          onChange={(e) => setVoiceFilter(e.target.value)}
                          placeholder="Filtra voci Google / Android..."
                          className="w-full pl-9 pr-3 py-1.5 text-sm text-[#EEDFE4] bg-[#3A1522] border border-[#8A475D] rounded-lg focus:outline-none focus:border-[#E8C27A] placeholder:text-[#A87F8E]"
                        />
                      </div>
                    )}

                    <select
                      value={char.systemVoiceUri || ''}
                      onChange={(e) =>
                        onUpdateCharacter(char.id, {
                          systemVoiceUri: e.target.value || undefined,
                        })
                      }
                      className="w-full px-3 py-2 text-[15px] text-[#EEDFE4] bg-[#3A1522] border border-[#8A475D] rounded-lg focus:outline-none focus:border-[#E8C27A]"
                    >
                      <option value="">
                        Automatica Google/Android ({char.gender === 'male' ? 'Maschile' : 'Femminile'} · {langMeta?.label})
                      </option>

                      {sameLangGoogle.length > 0 && (
                        <optgroup label={`Google / Android — ${langMeta?.label || char.language}`}>
                          {sameLangGoogle.map((fv) => (
                            <option key={fv.voice.voiceURI} value={fv.voice.voiceURI}>
                              {fv.label}
                            </option>
                          ))}
                        </optgroup>
                      )}

                      {sameLangOther.length > 0 && (
                        <optgroup label={`Altre voci di sistema — ${langMeta?.label || char.language}`}>
                          {sameLangOther.map((fv) => (
                            <option key={fv.voice.voiceURI} value={fv.voice.voiceURI}>
                              {fv.label} ({fv.langCode})
                            </option>
                          ))}
                        </optgroup>
                      )}

                      {otherLangVoices.length > 0 && (
                        <optgroup label="Tutte le altre voci Google / Android e Sistema">
                          {otherLangVoices.map((fv) => (
                            <option key={fv.voice.voiceURI} value={fv.voice.voiceURI}>
                              {fv.label} [{fv.langCode}]
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>

                    <button
                      type="button"
                      onClick={() => onOpenVoiceCatalog(char.id)}
                      className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 text-sm font-bold text-[#E8C27A] bg-[#3A1522] border border-[#8A475D] hover:border-[#E8C27A] hover:bg-[#632B3E] rounded-lg transition-colors cursor-pointer"
                    >
                      <ListFilter className="w-4 h-4" aria-hidden="true" />
                      <span>
                        Sfoglia e prova tutte le voci ({formattedVoices.length})
                      </span>
                    </button>
                  </div>

                  {/* Studio MP3 controls */}
                  {engine === 'studio' && (
                    <>
                      {char.language === 'eo' && (
                        <div>
                          <label className="block text-sm font-semibold text-[#DFC5CE] mb-1.5">
                            Timbro Sintesi Esperanto (MP3)
                          </label>
                          <select
                            value={char.variant}
                            onChange={(e) =>
                              onUpdateCharacter(char.id, { variant: e.target.value })
                            }
                            className="w-full px-3 py-2 text-[15px] text-[#EEDFE4] bg-[#3A1522] border border-[#8A475D] rounded-lg focus:outline-none focus:border-[#E8C27A]"
                          >
                            {variants.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.label} — {v.hint}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <span className="font-semibold text-[#DFC5CE]">
                            Posizione Stereo (MP3)
                          </span>
                          <span className="font-mono font-semibold text-[#E8C27A] tabular-nums">
                            {char.pan === 0
                              ? 'Centro'
                              : char.pan < 0
                                ? `Sx ${Math.round(Math.abs(char.pan) * 100)}%`
                                : `Dx ${Math.round(char.pan * 100)}%`}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={-0.7}
                          max={0.7}
                          step={0.05}
                          value={char.pan}
                          onChange={(e) =>
                            onUpdateCharacter(char.id, {
                              pan: parseFloat(e.target.value),
                            })
                          }
                          className="w-full studio-slider-dark"
                        />
                      </div>
                    </>
                  )}

                  {characters.length > 2 && (
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onRemoveCharacter(char.id)}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-[#F0B0BA] hover:bg-[#3A1522] rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                        <span>Rimuovi personaggio</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
