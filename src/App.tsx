import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Character,
  DialogueLine,
  DialogueProject,
  DialogueTemplate,
} from './types/dialogue';
import {
  CAST_COMBINATIONS,
  COLOR_ORDER,
  DIALOGUE_TEMPLATES,
  SUPPORTED_LANGUAGES,
  VOICE_VARIANTS,
} from './data/presets';
import {
  DialoguePlaybackController,
  estimateProjectDurationSec,
  exportDialogueToMp3,
  recordGoogleDialogueToMp3,
} from './audio/dialogueEngine';
import { TopBar } from './components/TopBar';
import { CastPanel } from './components/CastPanel';
import { ScriptEditor } from './components/ScriptEditor';
import { TransportBar } from './components/TransportBar';
import { TemplatesModal } from './components/TemplatesModal';
import { ProsodyGuideModal } from './components/ProsodyGuideModal';
import { GoogleVoicesModal } from './components/GoogleVoicesModal';
import { ExportMp3Modal } from './components/ExportMp3Modal';
import { detectVoiceGender, mapVoiceLangToLanguageCode } from './utils/googleVoices';

const STORAGE_KEY = 'scena-vocale-project-v6';

function createInitialProject(): DialogueProject {
  const defaultTemplate = DIALOGUE_TEMPLATES[0];
  return {
    title: defaultTemplate.title,
    engine: 'webspeech',
    ambience: 'dry',
    defaultPauseMs: 380,
    mp3Bitrate: 192,
    characters: defaultTemplate.characters.map((c) => ({ ...c, basePitch: 1.0 })),
    lines: defaultTemplate.lines.map((l) => ({ ...l, pitchOffset: 0 })),
  };
}

function loadSavedProject(): DialogueProject {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialProject();
    const parsed = JSON.parse(raw) as DialogueProject;
    if (
      parsed &&
      Array.isArray(parsed.characters) &&
      parsed.characters.length >= 2 &&
      Array.isArray(parsed.lines)
    ) {
      return parsed;
    }
  } catch {
    // Fallback to clean default template
  }
  return createInitialProject();
}

export default function App() {
  const [project, setProject] = useState<DialogueProject>(() =>
    loadSavedProject()
  );
  const [activeSection, setActiveSection] = useState<'script' | 'cast'>('script');
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [voiceCatalogCharId, setVoiceCatalogCharId] = useState<string | null>(null);
  const [previewingVoiceUri, setPreviewingVoiceUri] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const [previewingCharId, setPreviewingCharId] = useState<string | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  const [systemVoices, setSystemVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [exportProgress, setExportProgress] = useState<{
    percent: number;
    stage: string;
  } | null>(null);
  const [lastExportUrl, setLastExportUrl] = useState<{
    url: string;
    fileName: string;
    sizeKb: number;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const playerRef = useRef<DialoguePlaybackController | null>(null);
  if (!playerRef.current) {
    playerRef.current = new DialoguePlaybackController();
  }

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } catch {
      // Ignore quota errors
    }
  }, [project]);

  const refreshSystemVoices = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    setSystemVoices(voices);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    refreshSystemVoices();
    const timers = [
      window.setTimeout(refreshSystemVoices, 200),
      window.setTimeout(refreshSystemVoices, 700),
      window.setTimeout(refreshSystemVoices, 1500),
    ];
    window.speechSynthesis.addEventListener('voiceschanged', refreshSystemVoices);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.speechSynthesis.removeEventListener('voiceschanged', refreshSystemVoices);
    };
  }, [refreshSystemVoices]);

  useEffect(() => {
    const controller = playerRef.current;
    return () => {
      controller?.stop();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (lastExportUrl) URL.revokeObjectURL(lastExportUrl.url);
    };
  }, [lastExportUrl]);

  const estimatedDurationSec = useMemo(
    () => estimateProjectDurationSec(project),
    [project]
  );

  const handleStopPlayback = useCallback(() => {
    playerRef.current?.stop();
    setIsPlaying(false);
    setActiveLineId(null);
    setPreviewingCharId(null);
    setPreviewingVoiceUri(null);
  }, []);

  const handlePreviewCatalogVoice = useCallback(
    async (voice: SpeechSynthesisVoice, sampleText: string) => {
      if (previewingVoiceUri === voice.voiceURI) {
        handleStopPlayback();
        return;
      }
      handleStopPlayback();
      setPreviewingVoiceUri(voice.voiceURI);
      await playerRef.current?.previewSystemVoice(voice, sampleText, () => {
        setPreviewingVoiceUri(null);
      });
    },
    [handleStopPlayback, previewingVoiceUri]
  );

  const handleAssignCatalogVoice = useCallback(
    (characterId: string, voice: SpeechSynthesisVoice) => {
      const detectedGender = detectVoiceGender(voice);
      const mappedLang = mapVoiceLangToLanguageCode(voice.lang);
      setProject((prev) => ({
        ...prev,
        characters: prev.characters.map((c) => {
          if (c.id !== characterId) return c;
          return {
            ...c,
            systemVoiceUri: voice.voiceURI,
            gender: detectedGender !== 'unknown' ? detectedGender : c.gender,
            language: mappedLang || c.language,
          };
        }),
      }));
    },
    []
  );

  const handleUpdateProject = useCallback((patch: Partial<DialogueProject>) => {
    setProject((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleApplyCombination = useCallback(
    (presetId: string) => {
      handleStopPlayback();
      const preset = CAST_COMBINATIONS.find((c) => c.id === presetId);
      if (!preset) return;
      const newChars = preset.characters.map((c) => ({ ...c }));
      setProject((prev) => {
        const remappedLines = prev.lines.map((line, idx) => ({
          ...line,
          characterId: newChars[idx % newChars.length].id,
        }));
        return {
          ...prev,
          characters: newChars,
          lines: remappedLines,
        };
      });
    },
    [handleStopPlayback]
  );

  const handleAddCharacter = useCallback(() => {
    setProject((prev) => {
      const nextIdx = prev.characters.length;
      const gender = nextIdx % 2 === 0 ? 'male' : 'female';
      const variants = VOICE_VARIANTS[gender];
      const variant = variants[nextIdx % variants.length].id;
      const panSpread = nextIdx % 2 === 0 ? -0.35 : 0.35;
      const newChar: Character = {
        id: `char-${Date.now()}`,
        name: `Personaggio ${nextIdx + 1}`,
        role: gender === 'male' ? 'Voce Maschile' : 'Voce Femminile',
        gender,
        language: 'it',
        variant,
        basePitch: 1.0,
        baseRate: 1.0,
        pan: panSpread,
        color: COLOR_ORDER[nextIdx % COLOR_ORDER.length],
      };
      return {
        ...prev,
        characters: [...prev.characters, newChar],
      };
    });
  }, []);

  const handleUpdateCharacter = useCallback(
    (id: string, patch: Partial<Character>) => {
      setProject((prev) => ({
        ...prev,
        characters: prev.characters.map((c) =>
          c.id === id ? { ...c, ...patch } : c
        ),
      }));
    },
    []
  );

  const handleRemoveCharacter = useCallback((id: string) => {
    setProject((prev) => {
      if (prev.characters.length <= 2) return prev;
      const remaining = prev.characters.filter((c) => c.id !== id);
      const fallbackId = remaining[0].id;
      return {
        ...prev,
        characters: remaining,
        lines: prev.lines.map((l) =>
          l.characterId === id ? { ...l, characterId: fallbackId } : l
        ),
      };
    });
  }, []);

  const handlePreviewCharacter = useCallback(
    async (char: Character) => {
      setErrorMsg(null);
      if (previewingCharId === char.id && isPlaying) {
        handleStopPlayback();
        return;
      }
      handleStopPlayback();
      setPreviewingCharId(char.id);
      setIsPlaying(true);

      const langInfo = SUPPORTED_LANGUAGES.find((l) => l.code === char.language);
      const sampleText =
        langInfo?.samplePhrase ||
        `Ciao, sono ${char.name || 'la tua voce'}. Ecco come suona il mio timbro.`;

      const sampleLine: DialogueLine = {
        id: 'preview-sample',
        characterId: char.id,
        text: sampleText,
        emotion: 'neutro',
        emphasis: 'normale',
        pitchOffset: 0,
        rateOffset: 0,
        pauseAfterMs: 0,
      };

      const controller = playerRef.current!;
      await controller.playLines(project, [sampleLine], {
        onLineStart: () => {
          setAnalyserNode(controller.getAnalyser());
        },
        onFinish: () => {
          setIsPlaying(false);
          setPreviewingCharId(null);
        },
        onError: (msg) => {
          setErrorMsg(msg);
          setIsPlaying(false);
          setPreviewingCharId(null);
        },
      });
    },
    [handleStopPlayback, isPlaying, previewingCharId, project]
  );

  const handleAddLine = useCallback((characterId?: string) => {
    setProject((prev) => {
      let targetCharId = characterId;
      if (!targetCharId) {
        const lastLine = prev.lines[prev.lines.length - 1];
        if (!lastLine) {
          targetCharId = prev.characters[0]?.id;
        } else {
          const lastIdx = prev.characters.findIndex(
            (c) => c.id === lastLine.characterId
          );
          const nextIdx = (lastIdx + 1) % prev.characters.length;
          targetCharId = prev.characters[nextIdx]?.id;
        }
      }
      const newLine: DialogueLine = {
        id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        characterId: targetCharId || prev.characters[0].id,
        text: '',
        emotion: 'neutro',
        emphasis: 'normale',
        pitchOffset: 0,
        rateOffset: 0,
        pauseAfterMs: prev.defaultPauseMs,
      };
      return {
        ...prev,
        lines: [...prev.lines, newLine],
      };
    });
  }, []);

  const handleUpdateLine = useCallback(
    (id: string, patch: Partial<DialogueLine>) => {
      setProject((prev) => ({
        ...prev,
        lines: prev.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      }));
    },
    []
  );

  const handleMoveLine = useCallback((id: string, direction: -1 | 1) => {
    setProject((prev) => {
      const idx = prev.lines.findIndex((l) => l.id === id);
      const targetIdx = idx + direction;
      if (idx === -1 || targetIdx < 0 || targetIdx >= prev.lines.length) {
        return prev;
      }
      const next = [...prev.lines];
      const [item] = next.splice(idx, 1);
      next.splice(targetIdx, 0, item);
      return { ...prev, lines: next };
    });
  }, []);

  const handleDuplicateLine = useCallback((id: string) => {
    setProject((prev) => {
      const idx = prev.lines.findIndex((l) => l.id === id);
      if (idx === -1) return prev;
      const original = prev.lines[idx];
      const copy: DialogueLine = {
        ...original,
        id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };
      const next = [...prev.lines];
      next.splice(idx + 1, 0, copy);
      return { ...prev, lines: next };
    });
  }, []);

  const handleDeleteLine = useCallback((id: string) => {
    setProject((prev) => ({
      ...prev,
      lines: prev.lines.filter((l) => l.id !== id),
    }));
  }, []);

  const handlePlaySingleLine = useCallback(
    async (line: DialogueLine) => {
      setErrorMsg(null);
      handleStopPlayback();
      setIsPlaying(true);
      setActiveLineId(line.id);
      const idx = project.lines.findIndex((l) => l.id === line.id);
      setActiveLineIndex(Math.max(0, idx));

      const controller = playerRef.current!;
      await controller.playLines(project, [line], {
        onLineStart: () => {
          setAnalyserNode(controller.getAnalyser());
        },
        onFinish: () => {
          setIsPlaying(false);
          setActiveLineId(null);
        },
        onError: (msg) => {
          setErrorMsg(msg);
          setIsPlaying(false);
          setActiveLineId(null);
        },
      });
    },
    [handleStopPlayback, project]
  );

  const handleTogglePlayAll = useCallback(async () => {
    setErrorMsg(null);
    if (isPlaying) {
      handleStopPlayback();
      return;
    }

    const playableLines = project.lines.filter((l) => l.text.trim().length > 0);
    if (playableLines.length === 0) {
      setErrorMsg('Scrivi almeno una battuta con del testo per avviare la riproduzione.');
      return;
    }

    setIsPlaying(true);
    const controller = playerRef.current!;
    await controller.playLines(project, playableLines, {
      onLineStart: (lineId, idx) => {
        setActiveLineId(lineId);
        setActiveLineIndex(idx);
        setAnalyserNode(controller.getAnalyser());
      },
      onFinish: () => {
        setIsPlaying(false);
        setActiveLineId(null);
      },
      onError: (msg) => {
        setErrorMsg(msg);
        setIsPlaying(false);
        setActiveLineId(null);
      },
    });
  }, [handleStopPlayback, isPlaying, project]);

  const triggerMp3Download = useCallback(
    (result: { blob: Blob; fileName: string }) => {
      const objectUrl = URL.createObjectURL(result.blob);
      setLastExportUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return {
          url: objectUrl,
          fileName: result.fileName,
          sizeKb: Math.max(1, Math.round(result.blob.size / 1024)),
        };
      });

      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = result.fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    },
    []
  );

  const handleOpenExportModal = useCallback(() => {
    setErrorMsg(null);
    const hasText = project.lines.some((l) => l.text.trim().length > 0);
    if (!hasText) {
      setErrorMsg('Aggiungi almeno una battuta con testo prima di esportare.');
      return;
    }
    setIsExportModalOpen(true);
  }, [project.lines]);

  const handleExportOfflineMp3 = useCallback(async () => {
    setErrorMsg(null);
    handleStopPlayback();
    setExportProgress({ percent: 0, stage: 'Preparazione sintesi offline...' });

    try {
      const result = await exportDialogueToMp3(project, (percent, stage) => {
        setExportProgress({ percent, stage });
      });
      triggerMp3Download(result);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Errore durante la generazione del file MP3.'
      );
    } finally {
      setExportProgress(null);
    }
  }, [handleStopPlayback, project, triggerMp3Download]);

  const handleRecordGoogleMp3 = useCallback(async () => {
    setErrorMsg(null);
    handleStopPlayback();
    setIsPlaying(true);
    setExportProgress({ percent: 2, stage: 'Seleziona "Condividi audio di sistema"...' });

    try {
      const result = await recordGoogleDialogueToMp3(
        project,
        playerRef.current!,
        (percent, stage) => {
          setExportProgress({ percent, stage });
        },
        (lineId, idx) => {
          setActiveLineId(lineId);
          setActiveLineIndex(idx);
        }
      );
      triggerMp3Download(result);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Registrazione voci Google non riuscita.'
      );
    } finally {
      setIsPlaying(false);
      setActiveLineId(null);
      setExportProgress(null);
    }
  }, [handleStopPlayback, project, triggerMp3Download]);

  const handleSelectTemplate = useCallback(
    (tpl: DialogueTemplate) => {
      handleStopPlayback();
      setProject((prev) => ({
        ...prev,
        title: tpl.title,
        characters: tpl.characters.map((c) => ({ ...c })),
        lines: tpl.lines.map((l) => ({ ...l })),
      }));
      setActiveSection('script');
    },
    [handleStopPlayback]
  );

  const activeLine = useMemo(
    () => project.lines.find((l) => l.id === activeLineId) || null,
    [project.lines, activeLineId]
  );

  const activeCharacter = useMemo(() => {
    if (!activeLine) return null;
    return (
      project.characters.find((c) => c.id === activeLine.characterId) ||
      project.characters[0] ||
      null
    );
  }, [activeLine, project.characters]);

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#8DA495] text-[#1B1E36]">
      <TopBar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onExportMp3={handleOpenExportModal}
        isExporting={Boolean(exportProgress)}
        hasLines={project.lines.some((l) => l.text.trim().length > 0)}
      />

      {errorMsg && (
        <div
          role="alert"
          className="bg-[#D4B8C0] border-b border-[#9E2A3B] px-6 py-3 text-sm font-bold text-[#6E1725] flex items-center justify-between gap-4"
        >
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-[#1B1E36] hover:underline cursor-pointer shrink-0"
          >
            Chiudi
          </button>
        </div>
      )}

      {/* Mobile section switcher (< lg) */}
      <div className="lg:hidden bg-[#4E2030] border-b border-[#7D3C52] px-4 py-2.5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveSection('script')}
          className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors cursor-pointer ${
            activeSection === 'script'
              ? 'bg-[#146C60] text-[#DCEBE8]'
              : 'bg-[#632B3E] text-[#EEDFE4]'
          }`}
        >
          Sceneggiatura ({project.lines.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('cast')}
          className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors cursor-pointer ${
            activeSection === 'cast'
              ? 'bg-[#146C60] text-[#DCEBE8]'
              : 'bg-[#632B3E] text-[#EEDFE4]'
          }`}
        >
          Personaggi ({project.characters.length})
        </button>
      </div>

      {/* Main 2-Column Studio Layout */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-[1440px] w-full mx-auto bg-[#8DA495] lg:border-x lg:border-[#6A8273]">
        <div
          className={`${
            activeSection === 'cast' ? 'flex' : 'hidden lg:flex'
          } flex-col`}
        >
          <CastPanel
            characters={project.characters}
            engine={project.engine}
            systemVoices={systemVoices}
            previewingCharId={previewingCharId}
            onApplyCombination={handleApplyCombination}
            onAddCharacter={handleAddCharacter}
            onUpdateCharacter={handleUpdateCharacter}
            onRemoveCharacter={handleRemoveCharacter}
            onPreviewCharacter={handlePreviewCharacter}
            onRefreshVoices={refreshSystemVoices}
            onOpenVoiceCatalog={(charId) => setVoiceCatalogCharId(charId)}
          />
        </div>

        <div
          className={`${
            activeSection === 'script' ? 'flex' : 'hidden lg:flex'
          } flex-1 min-w-0 flex-col`}
        >
          <ScriptEditor
            project={project}
            activeLineId={activeLineId}
            isPlaying={isPlaying}
            hasSystemVoices={systemVoices.length > 0}
            onUpdateProject={handleUpdateProject}
            onUpdateLine={handleUpdateLine}
            onAddLine={handleAddLine}
            onMoveLine={handleMoveLine}
            onDuplicateLine={handleDuplicateLine}
            onDeleteLine={handleDeleteLine}
            onPlaySingleLine={handlePlaySingleLine}
            onStopPlayback={handleStopPlayback}
          />
        </div>
      </div>

      <TransportBar
        isPlaying={isPlaying}
        activeLine={activeLine}
        activeLineIndex={activeLineIndex}
        totalLines={project.lines.filter((l) => l.text.trim().length > 0).length}
        activeCharacter={activeCharacter}
        estimatedDurationSec={estimatedDurationSec}
        analyser={analyserNode}
        exportProgress={exportProgress}
        lastExportUrl={lastExportUrl}
        onTogglePlayAll={handleTogglePlayAll}
        onExportMp3={handleOpenExportModal}
      />

      <TemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />

      <ProsodyGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      <GoogleVoicesModal
        isOpen={Boolean(voiceCatalogCharId)}
        targetCharacter={
          project.characters.find((c) => c.id === voiceCatalogCharId) || null
        }
        systemVoices={systemVoices}
        previewingVoiceUri={previewingVoiceUri}
        onClose={() => {
          handleStopPlayback();
          setVoiceCatalogCharId(null);
        }}
        onRefreshVoices={refreshSystemVoices}
        onPreviewVoice={handlePreviewCatalogVoice}
        onAssignVoice={handleAssignCatalogVoice}
      />

      <ExportMp3Modal
        isOpen={isExportModalOpen}
        engine={project.engine}
        hasSystemVoices={systemVoices.length > 0}
        mp3Bitrate={project.mp3Bitrate}
        estimatedDurationSec={estimatedDurationSec}
        lineCount={project.lines.filter((l) => l.text.trim().length > 0).length}
        isExporting={Boolean(exportProgress)}
        onClose={() => setIsExportModalOpen(false)}
        onRecordGoogleMp3={handleRecordGoogleMp3}
        onExportOfflineMp3={handleExportOfflineMp3}
      />
    </div>
  );
}
