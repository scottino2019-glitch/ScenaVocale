import { useEffect } from 'react';
import { X } from 'lucide-react';
import { DIALOGUE_TEMPLATES } from '../data/presets';
import { DialogueTemplate } from '../types/dialogue';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: DialogueTemplate) => void;
}

export function TemplatesModal({
  isOpen,
  onClose,
  onSelectTemplate,
}: TemplatesModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="templates-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2A1624]/75"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#C5C0D2] rounded-xl border border-[#7F7994] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 bg-[#4E2030] border-b border-[#7D3C52] flex items-center justify-between gap-4">
          <div>
            <h2
              id="templates-title"
              className="font-display text-xl font-bold text-[#EEDFE4]"
            >
              Scenari di Dialogo Pronti
            </h2>
            <p className="text-sm text-[#D6B8C2] mt-0.5">
              Seleziona una combinazione di voci per caricare personaggi, lingue e battute di esempio.
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

        <div className="divide-y divide-[#9C96B0] overflow-y-auto">
          {DIALOGUE_TEMPLATES.map((tpl) => (
            <div
              key={tpl.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#D1CBE0] transition-colors"
            >
              <div className="min-w-0">
                <div className="text-sm text-[#146C60] font-bold flex items-center gap-2">
                  <span>{tpl.combinationLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span>{tpl.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{tpl.lines.length} battute</span>
                </div>
                <h3 className="font-display text-lg font-bold text-[#1B1E36] mt-0.5">
                  {tpl.title}
                </h3>
                <p className="text-[15px] text-[#35304A] mt-1">{tpl.description}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onSelectTemplate(tpl);
                  onClose();
                }}
                className="px-4 py-2.5 text-sm font-bold text-[#DCEBE8] bg-[#146C60] hover:bg-[#198273] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Carica scenario
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
