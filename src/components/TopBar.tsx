import { Download } from 'lucide-react';

interface TopBarProps {
  activeSection: 'script' | 'cast';
  onSelectSection: (section: 'script' | 'cast') => void;
  onOpenTemplates: () => void;
  onOpenGuide: () => void;
  onExportMp3: () => void;
  isExporting: boolean;
  hasLines: boolean;
}

export function TopBar({
  activeSection,
  onSelectSection,
  onOpenTemplates,
  onOpenGuide,
  onExportMp3,
  isExporting,
  hasLines,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-[#4E2030] border-b border-[#7D3C52] px-6 py-4">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-8">
        {/* Zone 1: Single-element Brand Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onSelectSection('script');
          }}
          className="font-display text-2xl font-bold tracking-tight text-[#EEDFE4] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D8A449] rounded"
        >
          Scena Vocale
        </a>

        {/* Zone 2: 4 single-line navigation links */}
        <nav
          aria-label="Navigazione principale"
          className="hidden md:flex items-center gap-8 text-[15px] font-semibold text-[#D6B8C2]"
        >
          <button
            type="button"
            onClick={() => onSelectSection('script')}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D8A449] rounded ${
              activeSection === 'script'
                ? 'text-[#E8C27A] underline underline-offset-8 decoration-2 decoration-[#E8C27A]'
                : 'hover:text-[#EEDFE4]'
            }`}
          >
            Sceneggiatura
          </button>
          <button
            type="button"
            onClick={() => onSelectSection('cast')}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D8A449] rounded ${
              activeSection === 'cast'
                ? 'text-[#E8C27A] underline underline-offset-8 decoration-2 decoration-[#E8C27A]'
                : 'hover:text-[#EEDFE4]'
            }`}
          >
            Personaggi
          </button>
          <button
            type="button"
            onClick={onOpenTemplates}
            className="whitespace-nowrap shrink-0 py-1 hover:text-[#EEDFE4] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D8A449] rounded"
          >
            Scenari Pronti
          </button>
          <button
            type="button"
            onClick={onOpenGuide}
            className="whitespace-nowrap shrink-0 py-1 hover:text-[#EEDFE4] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D8A449] rounded"
          >
            Guida Prosodia
          </button>
        </nav>

        {/* Zone 3: 1 primary CTA */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onExportMp3}
            disabled={isExporting || !hasLines}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-[15px] font-bold text-[#DCEBE8] bg-[#146C60] rounded-lg hover:bg-[#198273] active:bg-[#10574E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8C27A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#4E2030]"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>{isExporting ? 'Esportazione...' : 'Esporta MP3'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
