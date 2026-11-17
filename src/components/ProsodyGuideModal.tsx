import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ProsodyGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProsodyGuideModal({ isOpen, onClose }: ProsodyGuideModalProps) {
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
      aria-labelledby="guide-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2A1624]/75"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#C5C0D2] rounded-xl border border-[#7F7994] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 bg-[#4E2030] border-b border-[#7D3C52] flex items-center justify-between gap-4">
          <div>
            <h2
              id="guide-title"
              className="font-display text-xl font-bold text-[#EEDFE4]"
            >
              Guida alla Prosodia Deterministica
            </h2>
            <p className="text-sm text-[#D6B8C2] mt-0.5">
              Sintesi vocale locale multilingue e regole acustiche senza AI.
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

        <div className="p-6 space-y-5 overflow-y-auto text-[15px] text-[#1B1E36] leading-relaxed">
          <div>
            <h3 className="font-display text-base font-bold text-[#4E2030] mb-1.5">
              1. Punteggiatura espressiva
            </h3>
            <p>
              Il motore analizza ogni frase mantenendo il timbro vocale naturale (senza distorsioni di tono) e regola automaticamente ritmo e pause respiratorie:
            </p>
            <ul className="mt-2.5 space-y-2 text-sm text-[#2F2B47]">
              <li>
                <span className="font-mono font-bold text-[#146C60]">?</span> — Lascia l’inflessione interrogativa naturale della voce e aggiunge una pausa chiara a fine domanda.
              </li>
              <li>
                <span className="font-mono font-bold text-[#146C60]">!</span> — Aumenta energia, volume e slancio ritmico.
              </li>
              <li>
                <span className="font-mono font-bold text-[#146C60]">...</span> — Rallenta la cadenza e introduce una pausa riflessiva.
              </li>
              <li>
                <span className="font-mono font-bold text-[#146C60]">, ; :</span> — Preserva il respiro continuo interno alla frase.
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-[#9C96B0]">
            <h3 className="font-display text-base font-bold text-[#4E2030] mb-1.5">
              2. Marcatori di pausa ed enfasi
            </h3>
            <ul className="mt-2 space-y-2 text-sm text-[#2F2B47]">
              <li>
                <span className="font-mono font-bold text-[#146C60]">[pausa 400ms]</span> o{' '}
                <span className="font-mono font-bold text-[#146C60]">[pausa 1.2s]</span> — Inserisce un silenzio esatto all’interno della battuta.
              </li>
              <li>
                <span className="font-mono font-bold text-[#146C60]">*parola o frase*</span> — Enfatizza la porzione di testo rallentandone leggermente la scansione.
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-[#9C96B0]">
            <h3 className="font-display text-base font-bold text-[#4E2030] mb-1.5">
              3. Voci Google / Android e Lingue Mondiali
            </h3>
            <p className="text-sm text-[#2F2B47]">
              Ogni personaggio può selezionare qualsiasi voce Google / Android installata sul dispositivo o sul browser in lingue Occidentali, Slave e Orientali, senza alterazione artificiale del tono.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
