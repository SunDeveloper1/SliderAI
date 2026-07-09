import React from "react";
import { motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface SlideRendererProps {
  content: string;
  canvasData?: string;
  isReaderMode?: boolean;
  isSplitView?: boolean;
  readerTheme?: "warm" | "light" | "dark";
  readerFontSize?: number;
  readerFontFamily?: "serif" | "sans" | "mono";
}

function highlightCode(code: string, lang: string): React.ReactNode {
  if (!lang) return code;
  const language = lang.toLowerCase();

  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };

  if (["javascript", "typescript", "jsx", "tsx", "js", "ts", "json"].includes(language)) {
    const tokenRegex = new RegExp(
      [
        // Comments
        `(\\/\\/.*|\\/\\*[\\s\\S]*?\\*\\/)`,
        // Strings (double, single, template literals)
        `("(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'|\`(?:\\\\.|[^\`\\\\])*\`)`,
        // Numbers
        `\\b(\\d+(?:\\.\\d+)?)\\b`,
        // Keywords
        `\\b(const|let|var|function|return|import|export|from|default|class|extends|if|else|for|while|async|await|try|catch|new|throw|typeof|interface|type|public|private|protected|any|string|number|boolean|void)\\b`,
        // Tags/JSX structure
        `(<\\/?[a-zA-Z0-9:-]+|\\/?>)`
      ].join("|"),
      "g"
    );

    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = tokenRegex.exec(code)) !== null) {
      if (match.index > lastIndex) {
        parts.push(escapeHtml(code.substring(lastIndex, match.index)));
      }

      const [full, comment, str, num, keyword, tag] = match;

      if (comment) {
        parts.push(`<span class="text-slate-500 italic">${escapeHtml(comment)}</span>`);
      } else if (str) {
        parts.push(`<span class="text-amber-300">${escapeHtml(str)}</span>`);
      } else if (num) {
        parts.push(`<span class="text-rose-400">${escapeHtml(num)}</span>`);
      } else if (keyword) {
        parts.push(`<span class="text-indigo-400 font-bold">${escapeHtml(keyword)}</span>`);
      } else if (tag) {
        parts.push(`<span class="text-emerald-400 font-semibold">${escapeHtml(tag)}</span>`);
      } else {
        parts.push(escapeHtml(full));
      }

      lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < code.length) {
      parts.push(escapeHtml(code.substring(lastIndex)));
    }

    return <code dangerouslySetInnerHTML={{ __html: parts.join("") }} />;
  }

  if (language === "html" || language === "xml") {
    const tokenRegex = new RegExp(
      [
        // Comments
        `(<!--[\\s\\S]*?-->)`,
        // Tags
        `(<\\/?[a-zA-Z0-9:-]+|\\/?>)`,
        // Attribute values
        `("(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*')`,
        // Attribute names
        `\\b([a-zA-Z-]+)(?=\\s*=)`
      ].join("|"),
      "g"
    );

    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = tokenRegex.exec(code)) !== null) {
      if (match.index > lastIndex) {
        parts.push(escapeHtml(code.substring(lastIndex, match.index)));
      }

      const [full, comment, tag, str, attr] = match;

      if (comment) {
        parts.push(`<span class="text-slate-500 italic">${escapeHtml(comment)}</span>`);
      } else if (tag) {
        parts.push(`<span class="text-emerald-400 font-semibold">${escapeHtml(tag)}</span>`);
      } else if (str) {
        parts.push(`<span class="text-amber-300">${escapeHtml(str)}</span>`);
      } else if (attr) {
        parts.push(`<span class="text-sky-400">${escapeHtml(attr)}</span>`);
      } else {
        parts.push(escapeHtml(full));
      }

      lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < code.length) {
      parts.push(escapeHtml(code.substring(lastIndex)));
    }

    return <code dangerouslySetInnerHTML={{ __html: parts.join("") }} />;
  }

  if (language === "css") {
    const tokenRegex = new RegExp(
      [
        // Comments
        `(\\/\\*[\\s\\S]*?\\*\\/)`,
        // Selectors
        `([.#a-zA-Z0-9-,\\s]+)(?=\\s*\\{)`,
        // Property name + value
        `([a-zA-Z-]+)\\s*:\\s*([^;}]+)`
      ].join("|"),
      "g"
    );

    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = tokenRegex.exec(code)) !== null) {
      if (match.index > lastIndex) {
        parts.push(escapeHtml(code.substring(lastIndex, match.index)));
      }

      const [full, comment, selector, propVal] = match;

      if (comment) {
        parts.push(`<span class="text-slate-500 italic">${escapeHtml(comment)}</span>`);
      } else if (selector) {
        parts.push(`<span class="text-emerald-400 font-semibold">${escapeHtml(selector)}</span>`);
      } else if (propVal) {
        const colonIndex = propVal.indexOf(":");
        if (colonIndex !== -1) {
          const prop = propVal.substring(0, colonIndex);
          const val = propVal.substring(colonIndex + 1);
          parts.push(`<span class="text-sky-400">${escapeHtml(prop)}</span>:<span class="text-amber-300">${escapeHtml(val)}</span>`);
        } else {
          parts.push(escapeHtml(propVal));
        }
      } else {
        parts.push(escapeHtml(full));
      }

      lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < code.length) {
      parts.push(escapeHtml(code.substring(lastIndex)));
    }

    return <code dangerouslySetInnerHTML={{ __html: parts.join("") }} />;
  }

  return code;
}

export function splitMarkdownIntoPages(markdown: string): string[] {
  if (!markdown) return [""];

  // 1. Try splitting by explicit horizontal rules first
  // Handles: \n---\n, \n---\r\n, \n***\n, \n___\n with any spaces
  const hrRegex = /\r?\n\s*(?:---|===|\*\*\*|___)\s*(?:\r?\n|$)/;
  if (hrRegex.test(markdown)) {
    const parts = markdown.split(hrRegex).map(p => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts;
  }

  // 2. Try splitting by major headings: H1 and H2
  // We want to split *before* each heading so the heading starts a new page.
  // Using positive lookahead with newline to split cleanly.
  const headingRegex = /\r?\n(?=#{1,2}\s)/;
  const headingParts = markdown.split(headingRegex).map(p => p.trim()).filter(Boolean);
  if (headingParts.length > 1) {
    return headingParts;
  }

  // 3. Fallback: Split by paragraphs, grouping them into pages so each page stays under a certain character budget.
  // Budget is roughly 650 characters.
  const paragraphs = markdown.split(/\r?\n\s*\r?\n/).map(p => p.trim()).filter(Boolean);
  const pages: string[] = [];
  let currentPage = "";

  for (const para of paragraphs) {
    // If adding this paragraph exceeds the target page length, start a new page
    if (currentPage && (currentPage.length + para.length > 650)) {
      pages.push(currentPage);
      currentPage = para;
    } else {
      currentPage = currentPage ? currentPage + "\n\n" + para : para;
    }
  }
  if (currentPage) {
    pages.push(currentPage);
  }

  return pages.length > 0 ? pages : [markdown];
}

export default function SlideRenderer({
  content,
  canvasData,
  isReaderMode = false,
  isSplitView = false,
  readerTheme = "warm",
  readerFontSize = 18,
  readerFontFamily = "serif"
}: SlideRendererProps) {
  // Determine typeface family
  let fontFamilyStr = '"Inter", sans-serif';
  if (readerFontFamily === "serif") {
    fontFamilyStr = '"Merriweather", Georgia, Cambria, serif';
  } else if (readerFontFamily === "mono") {
    fontFamilyStr = '"JetBrains Mono", monospace';
  }

  // Theme-specific colors for reader mode
  const isDark = readerTheme === "dark";
  const isWarm = readerTheme === "warm";

  // Parse canvas elements and background characteristics
  let canvasElements: any[] = [];
  let boardBg = "transparent";
  if (canvasData) {
    try {
      const parsed = JSON.parse(canvasData);
      if (parsed && typeof parsed === "object" && "elements" in parsed) {
        canvasElements = parsed.elements || [];
        if (parsed.bgColor === "warm") boardBg = "#faf6ef";
        else if (parsed.bgColor === "slate") boardBg = "#1e293b";
        else if (parsed.bgColor === "blueprint") boardBg = "#0f172a";
        else if (parsed.bgColor === "white") boardBg = "#ffffff";
      } else if (Array.isArray(parsed)) {
        canvasElements = parsed;
      }
    } catch (e) {}
  }

  const textColorClass = isReaderMode
    ? isDark
      ? "text-slate-200"
      : isWarm
      ? "text-[#2e261a]"
      : "text-slate-800"
    : "text-slate-800";

  const strongColorClass = isReaderMode
    ? isDark
      ? "text-white"
      : isWarm
      ? "text-[#181105]"
      : "text-slate-900"
    : "text-slate-900";

  const eraserColor = isReaderMode
    ? isDark
      ? "#1E2022"
      : isWarm
      ? "#FAF6EF"
      : "#ffffff"
    : "#ffffff";

  // Heading components and standard ones styled beautifully
  const mdComponents = {
    h1: ({ children, ...props }: any) => {
      const headerBorder = isDark
        ? "border-rose-500/30"
        : isWarm
        ? "border-amber-750/30"
        : "border-blue-500";
      return (
        <h1
          style={isReaderMode ? { fontSize: "2.1em", lineHeight: "1.25" } : {}}
          className={`font-extrabold ${strongColorClass} mb-6 border-b-4 ${headerBorder} pb-2.5 inline-block break-inside-avoid-column break-inside-avoid ${
            isReaderMode ? "" : "text-3xl sm:text-4xl"
          }`}
          {...props}
        >
          {children}
        </h1>
      );
    },
    h2: ({ children, ...props }: any) => {
      const headerBorder = isDark
        ? "border-rose-500/25"
        : isWarm
        ? "border-amber-700/25"
        : "border-blue-500";
      return (
        <h2
          style={isReaderMode ? { fontSize: "1.65em", lineHeight: "1.3" } : {}}
          className={`font-semibold ${strongColorClass} mb-5 border-b-2 ${headerBorder} pb-1.5 mt-5 inline-block break-inside-avoid-column break-inside-avoid ${
            isReaderMode ? "" : "text-xl sm:text-2xl"
          }`}
          {...props}
        >
          {children}
        </h2>
      );
    },
    h3: ({ children, ...props }: any) => {
      return (
        <h3
          style={isReaderMode ? { fontSize: "1.35em", lineHeight: "1.4" } : {}}
          className={`font-bold tracking-tight ${strongColorClass} mt-4 mb-2.5 break-inside-avoid-column break-inside-avoid ${
            isReaderMode ? "" : "text-lg sm:text-xl"
          }`}
          {...props}
        >
          {children}
        </h3>
      );
    },
    p: ({ children, ...props }: any) => {
      return (
        <p
          style={isReaderMode ? { fontSize: "1.05em", lineHeight: "1.7" } : {}}
          className={`leading-relaxed my-2.5 ${textColorClass} ${
            isReaderMode ? "" : "text-sm sm:text-base"
          }`}
          {...props}
        >
          {children}
        </p>
      );
    },
    ul: ({ children, ...props }: any) => {
      return <ul className="pl-0 my-3 list-none" {...props}>{children}</ul>;
    },
    ol: ({ children, ...props }: any) => {
      return <ol className="pl-5 my-3 list-decimal" {...props}>{children}</ol>;
    },
    li: ({ children, ...props }: any) => {
      const bulletColor = isDark
        ? "bg-rose-450"
        : isWarm
        ? "bg-amber-800"
        : "bg-blue-500";
      return (
        <li
          style={isReaderMode ? { fontSize: "1.05em", lineHeight: "1.65" } : {}}
          className={`flex items-start gap-3.5 my-3 pl-0.5 list-none break-inside-avoid-column break-inside-avoid ${textColorClass}`}
          {...props}
        >
          <div className={`w-2 h-2 rounded-full ${bulletColor} mr-0.5 mt-2 shrink-0`} />
          <div className={isReaderMode ? "" : "text-base sm:text-lg flex-1"}>
            {children}
          </div>
        </li>
      );
    },
    blockquote: ({ children, ...props }: any) => {
      const bqBg = isDark
        ? "bg-slate-850 border-rose-500/50"
        : isWarm
        ? "bg-[#f5edd9] border-amber-800/50"
        : "bg-blue-50 border-blue-500";
      return (
        <blockquote className={`pl-4 border-l-4 py-2 my-4 rounded-r-md break-inside-avoid-column break-inside-avoid ${bqBg} italic ${textColorClass}`} {...props}>
          {children}
        </blockquote>
      );
    },
    img: ({ src, alt, ...props }: any) => {
      return (
        <div className="my-6 flex flex-col items-center break-inside-avoid-column break-inside-avoid">
          <img
            src={src}
            alt={alt || "Illustration"}
            referrerPolicy="no-referrer"
            className="max-h-80 object-contain rounded-lg border border-slate-200/65 shadow-md max-w-full"
            {...props}
          />
          {alt && (
            <span className="mt-2 text-xs italic opacity-60 text-center font-mono">
              {alt}
            </span>
          )}
        </div>
      );
    },
    table: ({ children, ...props }: any) => {
      return (
        <div className="overflow-x-auto my-6 rounded-lg border border-slate-200/50 break-inside-avoid-column break-inside-avoid">
          <table className="w-full text-left border-collapse" {...props}>{children}</table>
        </div>
      );
    },
    thead: ({ children, ...props }: any) => {
      const thBg = isDark ? "bg-slate-800" : isWarm ? "bg-[#e8dec7]" : "bg-slate-100";
      return <thead className={`${thBg} ${strongColorClass} font-semibold`} {...props}>{children}</thead>;
    },
    tbody: ({ children, ...props }: any) => {
      return <tbody {...props}>{children}</tbody>;
    },
    tr: ({ children, ...props }: any) => {
      const trBorder = isDark ? "border-slate-800" : isWarm ? "border-[#e0d3b6]" : "border-slate-150";
      return <tr className={`border-b ${trBorder} last:border-0`} {...props}>{children}</tr>;
    },
    th: ({ children, ...props }: any) => {
      return <th className="px-4 py-2.5 text-sm font-semibold" {...props}>{children}</th>;
    },
    td: ({ children, ...props }: any) => {
      return <td className="px-4 py-2 text-sm" {...props}>{children}</td>;
    },
    pre: ({ children }: any) => {
      return <>{children}</>;
    },
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || "");
      const codeStr = String(children).replace(/\n$/, "");
      
      // Inline Code rendering
      if (inline || !match) {
        const codeBg = isDark
          ? "bg-slate-800 border-slate-700 text-rose-400"
          : isWarm
          ? "bg-[#efe9dc] border-[#e0d3b6] text-amber-900"
          : "bg-slate-100 border-slate-200 text-rose-500";
        return (
          <code className={`${codeBg} border px-1.5 py-0.5 rounded text-xs font-mono font-medium`} {...props}>
            {children}
          </code>
        );
      }

      // Code Block Rendering
      const lang = match[1];
      const codeBgClass = isDark
        ? "bg-slate-950 border-slate-800 text-slate-100"
        : isWarm
        ? "bg-[#2c2419] border-[#1f1a11] text-[#faf6ef]"
        : "bg-slate-900 border-slate-950 text-slate-50";

      return (
        <div className={`my-6 rounded-xl overflow-hidden border shadow-lg ${codeBgClass} font-mono text-sm relative group break-inside-avoid-column break-inside-avoid`}>
          {/* Windows-like header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-black/20 border-b border-white/5 select-none">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80 block" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80 block" />
              <span className="w-3 h-3 rounded-full bg-green-500/80 block" />
            </div>
            <span className="text-xs uppercase opacity-50 font-bold tracking-wider">{lang}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(codeStr);
              }}
              className="text-xs opacity-50 hover:opacity-100 bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1 rounded transition cursor-pointer"
            >
              Copy
            </button>
          </div>
          <pre className="p-4 overflow-x-auto leading-relaxed text-xs sm:text-sm font-medium">
            {highlightCode(codeStr, lang)}
          </pre>
        </div>
      );
    }
  };

  // Helper to extract clean titles for whiteboard drawing bottom overlay
  const lines = content.split("\n");
  const overlayHeadings = lines
    .map(line => line.trim())
    .filter(line => line.startsWith("# ") || line.startsWith("## "))
    .map((line, idx) => {
      const isH1 = line.startsWith("# ");
      const text = line.substring(isH1 ? 2 : 3).replace(/\*\*|__|\*|_|`/g, "");
      if (isH1) {
        return (
          <h1
            key={idx}
            className={`font-extrabold ${strongColorClass} mb-4 text-2xl sm:text-3xl`}
          >
            {text}
          </h1>
        );
      } else {
        return (
          <h2
            key={idx}
            className={`font-semibold ${strongColorClass} mb-3 text-lg sm:text-xl`}
          >
            {text}
          </h2>
        );
      }
    });

  return (
    <motion.div
      key={content + (canvasElements.length > 0 ? "_canvas_" : "") + (isReaderMode ? `_reader_${readerTheme}_${readerFontSize}_${readerFontFamily}` : "_slide")}
      initial={{ opacity: 0, y: 7 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -7 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      style={isReaderMode ? { fontSize: `${readerFontSize}px`, fontFamily: fontFamilyStr } : {}}
      className={`slide-content ${isReaderMode ? "select-text" : "select-none"} py-1 text-left w-full h-full flex flex-col justify-start`}
    >
      {canvasElements.length > 0 ? (
        <div className="flex-1 flex flex-col gap-6 items-center justify-center min-h-[360px] w-full">
          {/* Responsive vector graphic wrapper with whiteboard color background */}
          <div 
            className="w-full relative aspect-video flex-1 flex items-center justify-center rounded-xl overflow-hidden border border-slate-205/85 shadow-sm"
            style={{ backgroundColor: boardBg !== "transparent" ? boardBg : undefined }}
          >
            <svg
              className="w-full h-full max-h-[480px] bg-transparent pointer-events-none"
              viewBox="0 0 800 500"
              preserveAspectRatio="xMidYMid meet"
            >
              {canvasElements.map((el, index) => {
                if (el.type === "text") {
                  return (
                    <text
                      key={el.id || index}
                      x={el.x}
                      y={el.y}
                      fill={isDark && el.color === "#1e293b" ? "#ffffff" : el.color}
                      fontSize={el.fontSize || 16}
                      fontWeight="bold"
                      fontFamily='"Inter", sans-serif'
                      dominantBaseline="hanging"
                    >
                      {el.text}
                    </text>
                  );
                }
                if (!el.points || el.points.length < 2) return null;
                
                if (el.type === "pencil" || el.type === "eraser") {
                  const smoothPathData = el.points.reduce((acc: string, pt: any, i: number, arr: any[]) => {
                    if (i === 0) return `M ${pt.x} ${pt.y}`;
                    if (i === arr.length - 1) return `${acc} L ${pt.x} ${pt.y}`;
                    const xc = (pt.x + arr[i + 1].x) / 2;
                    const yc = (pt.y + arr[i + 1].y) / 2;
                    return `${acc} Q ${pt.x} ${pt.y} ${xc} ${yc}`;
                  }, "");

                  let strokeOpacity = 1.0;
                  let strokeDashArray: string | undefined = undefined;
                  let strokeWidthVal = el.width;

                  if (el.type === "eraser") {
                    const finalEraserStroke = boardBg !== "transparent" ? boardBg : eraserColor;
                    return (
                      <path
                        key={el.id || index}
                        d={smoothPathData}
                        fill="none"
                        stroke={finalEraserStroke}
                        strokeWidth={strokeWidthVal}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    );
                  }

                  const style = el.brushStyle || "pencil";
                  if (style === "crayon") {
                    strokeOpacity = 0.55;
                    strokeDashArray = "1, 3";
                  } else if (style === "watercolor") {
                    strokeOpacity = 0.15;
                    strokeWidthVal = el.width * 2.2;
                  } else if (style === "highlighter") {
                    strokeOpacity = 0.32;
                    strokeWidthVal = el.width * 1.8;
                  } else if (style === "marker") {
                    strokeOpacity = 0.88;
                  } else {
                    strokeOpacity = 0.95;
                  }

                  return (
                    <path
                      key={el.id || index}
                      d={smoothPathData}
                      fill="none"
                      stroke={isDark && el.color === "#1e293b" ? "#ffffff" : el.color}
                      strokeWidth={strokeWidthVal}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray={strokeDashArray}
                      strokeOpacity={strokeOpacity}
                    />
                  );
                }
                if (el.type === "line") {
                  const p1 = el.points[0];
                  const p2 = el.points[1];
                  return (
                    <line
                      key={el.id || index}
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={isDark && el.color === "#1e293b" ? "#ffffff" : el.color}
                      strokeWidth={el.width}
                      strokeLinecap="round"
                    />
                  );
                }
                if (el.type === "rect") {
                  const p1 = el.points[0];
                  const p2 = el.points[1];
                  const x = Math.min(p1.x, p2.x);
                  const y = Math.min(p1.y, p2.y);
                  const w = Math.abs(p2.x - p1.x);
                  const h = Math.abs(p2.y - p1.y);
                  return (
                    <rect
                      key={el.id || index}
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      fill="none"
                      stroke={isDark && el.color === "#1e293b" ? "#ffffff" : el.color}
                      strokeWidth={el.width}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  );
                }
                if (el.type === "ellipse") {
                  const p1 = el.points[0];
                  const p2 = el.points[1];
                  const cx = (p1.x + p2.x) / 2;
                  const cy = (p1.y + p2.y) / 2;
                  const rx = Math.abs(p2.x - p1.x) / 2;
                  const ry = Math.abs(p2.y - p1.y) / 2;
                  return (
                    <ellipse
                      key={el.id || index}
                      cx={cx}
                      cy={cy}
                      rx={rx}
                      ry={ry}
                      fill="none"
                      stroke={isDark && el.color === "#1e293b" ? "#ffffff" : el.color}
                      strokeWidth={el.width}
                    />
                  );
                }
                return null;
              })}
            </svg>
          </div>
          {overlayHeadings}
        </div>
      ) : (
        isReaderMode && isSplitView ? (
          (() => {
            const pages = splitMarkdownIntoPages(content);
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 w-full pb-8">
                {pages.map((pageContent, idx) => (
                  <div
                    key={idx}
                    style={{ fontSize: `${readerFontSize}px`, fontFamily: fontFamilyStr }}
                    className={`flex flex-col justify-between p-8 sm:p-10 rounded-2xl shadow-xl border transition-all duration-300 h-[88vh] overflow-y-auto no-scrollbar ${
                      readerTheme === "warm"
                        ? "bg-[#FAF6EF]/60 text-[#2C2417] border-[#ebdcc3] hover:shadow-2xl hover:bg-[#FAF6EF]"
                        : readerTheme === "dark"
                        ? "bg-[#1E2022]/60 text-[#E0E2E4] border-slate-800 hover:shadow-2xl hover:bg-[#1E2022]"
                        : "bg-white text-slate-800 border-slate-200 hover:shadow-2xl"
                    }`}
                  >
                    <div className="markdown-body w-full flex-1">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={mdComponents}
                      >
                        {pageContent}
                      </ReactMarkdown>
                    </div>
                    {/* Subtle page indicator inside each card */}
                    <div className={`mt-6 pt-4 border-t border-dashed flex justify-between items-center text-[10px] uppercase font-bold tracking-wider opacity-60 shrink-0 ${
                      readerTheme === "warm"
                        ? "border-[#ebdcc3] text-[#a89679]"
                        : readerTheme === "dark"
                        ? "border-slate-800/80 text-slate-500"
                        : "border-slate-250 text-slate-400"
                    }`}>
                      <span>Page {idx + 1}</span>
                      <span>Section {idx + 1} of {pages.length}</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()
        ) : (
          <div className="markdown-body w-full">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={mdComponents}
            >
              {content}
            </ReactMarkdown>
          </div>
        )
      )}
    </motion.div>
  );
}
