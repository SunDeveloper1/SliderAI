import React, { useState } from "react";
import { X, Eye, Edit3, Columns, Trash2 } from "lucide-react";
import SlideRenderer from "./SlideRenderer";

interface PreviewCompareProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PreviewCompare({ isOpen, onClose }: PreviewCompareProps) {
  const [markdownLeft, setMarkdownLeft] = useState<string>(
    `# Source A\n\nEdit or paste markdown here.\n\n- Beautiful list item\n- Re-usable slide renderer`
  );
  const [markdownRight, setMarkdownRight] = useState<string>(
    `# Source B\n\nEdit or paste markdown here.\n\n- Supports formatting\n- Supports custom code blocks`
  );
  const [isComparePreview, setIsComparePreview] = useState<boolean>(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 font-sans select-none overflow-hidden transition-all duration-300">
      {/* Top Header Section */}
      <header className="h-16 px-6 bg-slate-950/90 border-b border-slate-800/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Columns className="w-4 h-4 text-slate-400" />
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest font-mono text-slate-200">
              Preview Compare
            </h2>
            <p className="text-[10px] text-slate-500 font-mono">
              Side-by-side markdown comparison
            </p>
          </div>
        </div>

        {/* Minimalist Segmented Toggle Button */}
        <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-lg">
          <button
            onClick={() => setIsComparePreview(false)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-medium uppercase tracking-wider transition-all duration-150 cursor-pointer ${
              !isComparePreview
                ? "bg-slate-800 text-slate-100"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Edit3 className="w-3 h-3" />
            <span>Editor</span>
          </button>
          <button
            onClick={() => setIsComparePreview(true)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-medium uppercase tracking-wider transition-all duration-150 cursor-pointer ${
              isComparePreview
                ? "bg-slate-800 text-slate-100"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Preview</span>
          </button>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-900 rounded-md transition cursor-pointer"
          title="Exit Tool"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-800/60 overflow-hidden bg-slate-950">
        {/* Column Left */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Column Header */}
          <div className="px-5 py-2.5 bg-slate-950 border-b border-slate-800/40 flex items-center justify-between shrink-0">
            <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-widest">
              Source A
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-slate-500 font-mono">
                {markdownLeft.length} characters
              </span>
              <button
                onClick={() => setMarkdownLeft("")}
                className="p-1 text-slate-600 hover:text-rose-400 rounded transition cursor-pointer"
                title="Clear"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Body Content A */}
          <div className="flex-1 overflow-hidden p-4 sm:p-6 flex flex-col">
            {!isComparePreview ? (
              <textarea
                value={markdownLeft}
                onChange={(e) => setMarkdownLeft(e.target.value)}
                placeholder="Paste your markdown here..."
                className="w-full flex-1 bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 font-mono text-xs leading-relaxed text-slate-300 placeholder:text-slate-700 focus:outline-none focus:border-slate-700 transition-all resize-none"
              />
            ) : (
              <div className="w-full flex-1 bg-slate-900/20 border border-slate-850 rounded-xl p-6 sm:p-8 overflow-y-auto">
                <SlideRenderer
                  content={markdownLeft}
                  isReaderMode={true}
                  readerTheme="dark"
                  readerFontSize={15}
                  readerFontFamily="sans"
                />
              </div>
            )}
          </div>
        </div>

        {/* Column Right */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Column Header */}
          <div className="px-5 py-2.5 bg-slate-950 border-b border-slate-800/40 flex items-center justify-between shrink-0">
            <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-widest">
              Source B
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-slate-500 font-mono">
                {markdownRight.length} characters
              </span>
              <button
                onClick={() => setMarkdownRight("")}
                className="p-1 text-slate-600 hover:text-rose-400 rounded transition cursor-pointer"
                title="Clear"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Body Content B */}
          <div className="flex-1 overflow-hidden p-4 sm:p-6 flex flex-col">
            {!isComparePreview ? (
              <textarea
                value={markdownRight}
                onChange={(e) => setMarkdownRight(e.target.value)}
                placeholder="Paste your markdown here..."
                className="w-full flex-1 bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 font-mono text-xs leading-relaxed text-slate-300 placeholder:text-slate-700 focus:outline-none focus:border-slate-700 transition-all resize-none"
              />
            ) : (
              <div className="w-full flex-1 bg-slate-900/20 border border-slate-850 rounded-xl p-6 sm:p-8 overflow-y-auto">
                <SlideRenderer
                  content={markdownRight}
                  isReaderMode={true}
                  readerTheme="dark"
                  readerFontSize={15}
                  readerFontFamily="sans"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
