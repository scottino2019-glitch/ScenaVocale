import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Play,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Square,
  Trash2,
} from 'lucide-react';
import {
  Character,
  DialogueLine,
  DialogueProject,
  Mp3Bitrate,
  PlaybackEngineMode,
  RoomAmbience,
} from '../types/dialogue';
import { COLOR_ORDER, SPEAKER_COLORS } from '../data/presets';

interface ScriptEditorProps {
  project: DialogueProject;
  activeLineId: string | null;
  isPlaying: boolean;
  hasSystemVoices: boolean;
  onUpdateProject: (patch: Partial<DialogueProject>) => void;
  onUpdateLine: (id: string, patch: Partial<DialogueLine>) => void;
  onAddLine: (characterId?: string) => void;
  onMoveLine: (id: string, direction: -1 | 1) => void;
  onDuplicateLine: (id: string) => void;
  onDeleteLine: (id: string) => void;
  onPlaySingleLine: (line: DialogueLine) => void;
  onStopPlayback: () => void;
}

export function ScriptEditor({
  project,
  activeLineId,
  isPlaying,
  hasSystemVoices,
  onUpdateProject,
  onUpdateLine,
  onAddLine,
  onMoveLine,
  onDuplicateLine,
  onDeleteLine,
  onPlaySingleLine,
  onStopPlayback,
}: ScriptEditorProps) {
  const [openSlidersId, setOpenSlidersId] = useState<string | null>(null);

  const charMap = new Map<string, { char: Character; index: number }>();
  project.characters.forEach((c, idx) => charMap.set(c.id, { char: c, index: idx }));

  const insertToken = (line: DialogueLine, token: string) => {
    const trimmed = line.text.trimEnd();
    const nextText = trimmed ? `${trimmed} ${token}` : token;
    onUpdateLine(line.id, { text: nextText });
  };

  return (
    <main className="flex-1 min-w-0 flex flex-col bg-[#8DA495]">
      {/* Studio Workspace Toolbar */}
      <section
        aria-label="Impostazioni progetto"
        className="bg-[#C5C0D2] border-b border-[#7F7994] px-6 py-5"
      >
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
          {/* Dialogue Title Input */}
          <div className="min-w-0 flex-1 max-w-md">
            <label
              htmlFor="project-title"
              className="block text-sm font-bold text-[#1B1E36] mb-1.5"
            >
              Titolo del dialogo
            </label>
            <input
              id="project-title"
              type="text"
              value={project.title}
              onChange={(e) => onUpdateProject({ title: e.target.value })}
              placeholder="Inserisci titolo del dialogo..."
              className="w-full px-3.5 py-2 font-display text-lg font-bold text-[#1B1E36] bg-[#D4D0DF] border border-[#7F7994] rounded-lg focus:outline-none focus:border-[#4E2030]"
            />
          </div>

          {/* Engine & Export Controls */}
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <span className="block text-sm font-bold text-[#1B1E36] mb-1.5">
                Motore di ascolto
              </span>
              <div className="inline-flex p-1 bg-[#AFA8BF] rounded-lg border border-[#7F7994]">
                <button
                  type="button"
                  onClick={() => onUpdateProject({ engine: 'webspeech' as PlaybackEngineMode })}
                  className={`px-3.5 py-1.5 text-sm font-bold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    project.engine === 'webspeech'
                      ? 'bg-[#4E2030] text-[#EEDFE4]'
                      : 'text-[#1B1E36] hover:text-[#4E2030]'
                  }`}
                >
                  Voci Google / Android
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateProject({ engine: 'studio' as PlaybackEngineMode })}
                  className={`px-3.5 py-1.5 text-sm font-bold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    project.engine === 'studio'
                      ? 'bg-[#4E2030] text-[#EEDFE4]'
                      : 'text-[#1B1E36] hover:text-[#4E2030]'
                  }`}
                >
                  Sintesi Offline (MP3)
                </button>
              </div>
            </div>

            {project.engine === 'studio' && (
              <div>
                <label
                  htmlFor="ambience-select"
                  className="block text-sm font-bold text-[#1B1E36] mb-1.5"
                >
                  Acustica stanza (MP3)
                </label>
                <select
                  id="ambience-select"
                  value={project.ambience}
                  onChange={(e) =>
                    onUpdateProject({ ambience: e.target.value as RoomAmbience })
                  }
                  className="px-3.5 py-2 text-sm font-bold text-[#1B1E36] bg-[#D4D0DF] border border-[#7F7994] rounded-lg focus:outline-none focus:border-[#4E2030]"
                >
                  <option value="dry">Secco</option>
                  <option value="studio">Studio Caldo</option>
                  <option value="theater">Teatro</option>
                </select>
              </div>
            )}

            <div>
              <label
                htmlFor="bitrate-select"
                className="block text-sm font-bold text-[#1B1E36] mb-1.5"
              >
                Qualità MP3
              </label>
              <select
                id="bitrate-select"
                value={project.mp3Bitrate}
                onChange={(e) =>
                  onUpdateProject({
                    mp3Bitrate: Number(e.target.value) as Mp3Bitrate,
                  })
                }
                className="px-3.5 py-2 text-sm font-bold text-[#1B1E36] bg-[#D4D0DF] border border-[#7F7994] rounded-lg font-mono tabular-nums focus:outline-none focus:border-[#4E2030]"
              >
                <option value={128}>128 kbps</option>
                <option value={192}>192 kbps</option>
                <option value={320}>320 kbps</option>
              </select>
            </div>
          </div>
        </div>

        {project.engine === 'webspeech' && !hasSystemVoices && (
          <p className="mt-3 text-sm font-semibold text-[#3B2642]">
            Questo ambiente browser non espone voci Google/Android native: la riproduzione usa automaticamente la sintesi offline. Su Chrome desktop o Android vedrai tutte le voci Google del dispositivo.
          </p>
        )}
      </section>

      {/* Script Lines List */}
      <div className="p-6 space-y-5 flex-1 max-w-4xl w-full mx-auto">
        {project.lines.length === 0 ? (
          <div className="bg-[#C5C0D2] border border-[#7F7994] rounded-xl p-10 text-center">
            <h3 className="font-display text-xl font-bold text-[#1B1E36]">
              Nessuna battuta nel dialogo
            </h3>
            <p className="mt-2 text-base text-[#35304A] max-w-md mx-auto">
              Inizia aggiungendo la prima battuta per uno dei personaggi del tuo cast.
            </p>
            <button
              type="button"
              onClick={() => onAddLine(project.characters[0]?.id)}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 text-[15px] font-bold text-[#DCEBE8] bg-[#146C60] rounded-lg hover:bg-[#198273] transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Aggiungi prima battuta</span>
            </button>
          </div>
        ) : (
          project.lines.map((line, index) => {
            const entry = charMap.get(line.characterId);
            const char = entry?.char || project.characters[0];
            const colorKey =
              char?.color || COLOR_ORDER[index % COLOR_ORDER.length];
            const colorStyle = SPEAKER_COLORS[colorKey];
            const isActive = activeLineId === line.id && isPlaying;
            const slidersOpen = openSlidersId === line.id;
            const currentVol = line.volumePercent ?? 100;
            const hasCustomOffsets =
              line.rateOffset !== 0 ||
              currentVol !== 100 ||
              line.pauseAfterMs !== project.defaultPauseMs;

            return (
              <article
                key={line.id}
                className={`rounded-xl border transition-colors ${
                  isActive
                    ? 'bg-[#D1CBE0] border-[#4E2030] ring-2 ring-[#4E2030]'
                    : 'bg-[#C5C0D2] border-[#7F7994] hover:border-[#4E2030]'
                }`}
              >
                {/* Row Header */}
                <div className="px-5 py-3.5 border-b border-[#9C96B0] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3 min-w-0">
                    <span className="font-mono text-sm font-bold text-[#4E2030] tabular-nums w-7">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-8 h-8 rounded-md ${colorStyle.bg} ${colorStyle.text} text-sm font-bold flex items-center justify-center shrink-0`}
                        aria-hidden="true"
                      >
                        {char?.name.slice(0, 1).toUpperCase() || '?'}
                      </span>
                      <select
                        aria-label={`Personaggio battuta ${index + 1}`}
                        value={char?.id || ''}
                        onChange={(e) =>
                          onUpdateLine(line.id, { characterId: e.target.value })
                        }
                        className="px-3 py-1.5 text-[15px] font-bold text-[#1B1E36] bg-[#D4D0DF] border border-[#7F7994] rounded-lg focus:outline-none focus:border-[#4E2030]"
                      >
                        {project.characters.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.gender === 'male' ? 'U' : 'D'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Directly audible speed preset */}
                    <select
                      aria-label={`Velocità battuta ${index + 1}`}
                      value={line.rateOffset}
                      onChange={(e) =>
                        onUpdateLine(line.id, {
                          rateOffset: parseInt(e.target.value, 10),
                        })
                      }
                      className="px-3 py-1.5 text-sm font-bold text-[#1B1E36] bg-[#D4D0DF] border border-[#7F7994] rounded-lg focus:outline-none focus:border-[#4E2030]"
                    >
                      <option value={-25}>Velocità: Lenta (0.75x)</option>
                      <option value={0}>Velocità: Normale (1.0x)</option>
                      <option value={35}>Velocità: Rapida (1.35x)</option>
                      {line.rateOffset !== -25 &&
                        line.rateOffset !== 0 &&
                        line.rateOffset !== 35 && (
                          <option value={line.rateOffset}>
                            Velocità: {((100 + line.rateOffset) / 100).toFixed(2)}x
                          </option>
                        )}
                    </select>

                    {/* Directly audible volume preset */}
                    <select
                      aria-label={`Volume battuta ${index + 1}`}
                      value={currentVol}
                      onChange={(e) =>
                        onUpdateLine(line.id, {
                          volumePercent: parseInt(e.target.value, 10),
                        })
                      }
                      className="px-3 py-1.5 text-sm font-bold text-[#1B1E36] bg-[#D4D0DF] border border-[#7F7994] rounded-lg focus:outline-none focus:border-[#4E2030]"
                    >
                      <option value={100}>Volume: Normale (100%)</option>
                      <option value={70}>Volume: Medio (70%)</option>
                      <option value={40}>Volume: Sottovoce (40%)</option>
                    </select>
                  </div>

                  {/* Row Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        isActive ? onStopPlayback() : onPlaySingleLine(line)
                      }
                      title={isActive ? 'Ferma battuta' : 'Ascolta questa battuta'}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-bold rounded-lg transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#9E2A3B] text-[#F2DCE0]'
                          : 'bg-[#234B8A] text-[#DCE5F2] hover:bg-[#2C5CA6]'
                      }`}
                    >
                      {isActive ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                          <span>Ascolta</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setOpenSlidersId(slidersOpen ? null : line.id)
                      }
                      title="Regola pausa e velocità fine"
                      aria-label="Regola pausa e velocità fine"
                      className={`p-2 rounded-lg transition-colors cursor-pointer ${
                        slidersOpen || hasCustomOffsets
                          ? 'bg-[#4E2030] text-[#EEDFE4]'
                          : 'bg-[#AFA8BF] text-[#1B1E36] hover:bg-[#9E96B0]'
                      }`}
                    >
                      <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onMoveLine(line.id, -1)}
                      disabled={index === 0}
                      title="Sposta su"
                      aria-label="Sposta battuta su"
                      className="p-2 rounded-lg bg-[#AFA8BF] text-[#1B1E36] hover:bg-[#9E96B0] disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ArrowUp className="w-4 h-4" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onMoveLine(line.id, 1)}
                      disabled={index === project.lines.length - 1}
                      title="Sposta giù"
                      aria-label="Sposta battuta giù"
                      className="p-2 rounded-lg bg-[#AFA8BF] text-[#1B1E36] hover:bg-[#9E96B0] disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ArrowDown className="w-4 h-4" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDuplicateLine(line.id)}
                      title="Duplica battuta"
                      aria-label="Duplica battuta"
                      className="p-2 rounded-lg bg-[#AFA8BF] text-[#1B1E36] hover:bg-[#9E96B0] transition-colors cursor-pointer"
                    >
                      <Copy className="w-4 h-4" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteLine(line.id)}
                      title="Elimina battuta"
                      aria-label="Elimina battuta"
                      className="p-2 rounded-lg bg-[#D4B8C0] text-[#7D1D2B] hover:bg-[#C6A2AC] transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Textarea & Real Pause Token Helpers */}
                <div className="p-5">
                  <textarea
                    rows={2}
                    value={line.text}
                    onChange={(e) =>
                      onUpdateLine(line.id, { text: e.target.value })
                    }
                    placeholder={`Scrivi la battuta di ${char?.name || 'questo personaggio'}...`}
                    className="w-full resize-y px-3.5 py-2.5 text-[17px] leading-relaxed font-medium text-[#1B1E36] bg-[#D4D0DF] border border-[#7F7994] rounded-lg focus:outline-none focus:border-[#4E2030] placeholder:text-[#554F6B]"
                  />

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-[#2F2B47]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">Inserisci pausa interna:</span>
                      <button
                        type="button"
                        onClick={() => insertToken(line, '[pausa 500ms]')}
                        className="px-3 py-1 text-sm font-bold text-[#1B1E36] bg-[#AFA8BF] border border-[#7F7994] hover:border-[#4E2030] hover:bg-[#A39BB5] rounded-md transition-colors cursor-pointer"
                      >
                        + Pausa 500ms
                      </button>
                      <button
                        type="button"
                        onClick={() => insertToken(line, '[pausa 1.2s]')}
                        className="px-3 py-1 text-sm font-bold text-[#1B1E36] bg-[#AFA8BF] border border-[#7F7994] hover:border-[#4E2030] hover:bg-[#A39BB5] rounded-md transition-colors cursor-pointer"
                      >
                        + Pausa 1.2s
                      </button>
                    </div>

                    <div className="font-mono text-sm font-semibold tabular-nums text-[#4E2030]">
                      <span>Pausa fine battuta: {line.pauseAfterMs}ms</span>
                    </div>
                  </div>
                </div>

                {/* Fine-grained Rate & Pause Sliders */}
                {slidersOpen && (
                  <div className="px-5 pb-5 pt-4 bg-[#B6B0C6] border-t border-[#8B85A0] rounded-b-xl">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <span className="font-bold text-[#1B1E36]">
                            Velocità fine
                          </span>
                          <span className="font-mono font-bold text-[#4E2030] tabular-nums">
                            {((100 + line.rateOffset) / 100).toFixed(2)}x
                          </span>
                        </div>
                        <input
                          type="range"
                          min={-30}
                          max={45}
                          step={5}
                          value={line.rateOffset}
                          onChange={(e) =>
                            onUpdateLine(line.id, {
                              rateOffset: parseInt(e.target.value, 10),
                            })
                          }
                          className="w-full studio-slider"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <span className="font-bold text-[#1B1E36]">
                            Pausa dopo battuta
                          </span>
                          <span className="font-mono font-bold text-[#4E2030] tabular-nums">
                            {line.pauseAfterMs} ms
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={2500}
                          step={100}
                          value={line.pauseAfterMs}
                          onChange={(e) =>
                            onUpdateLine(line.id, {
                              pauseAfterMs: parseInt(e.target.value, 10),
                            })
                          }
                          className="w-full studio-slider"
                        />
                      </div>
                    </div>

                    {hasCustomOffsets && (
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateLine(line.id, {
                              pitchOffset: 0,
                              rateOffset: 0,
                              volumePercent: 100,
                              pauseAfterMs: project.defaultPauseMs,
                            })
                          }
                          className="inline-flex items-center gap-1.5 text-sm font-bold text-[#4E2030] hover:text-[#146C60] cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Ripristina valori base</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}

        {/* Quick Turn Add Bar */}
        <div className="pt-2 pb-6 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onAddLine()}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-[15px] font-bold text-[#EEDFE4] bg-[#4E2030] hover:bg-[#632B3E] rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Nuova battuta (alterna)</span>
          </button>

          {project.characters.map((c, idx) => {
            const colorStyle =
              SPEAKER_COLORS[c.color] ||
              SPEAKER_COLORS[COLOR_ORDER[idx % COLOR_ORDER.length]];
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onAddLine(c.id)}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-[#1B1E36] bg-[#C5C0D2] border border-[#7F7994] hover:border-[#4E2030] hover:bg-[#D4D0DF] rounded-lg transition-colors cursor-pointer"
              >
                <span
                  className={`w-3 h-3 rounded-sm ${colorStyle.bg}`}
                  aria-hidden="true"
                />
                <span>+ {c.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
