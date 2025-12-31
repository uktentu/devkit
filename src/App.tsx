import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Code2,
  ArrowRightLeft,
  Trash2,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Minimize2,
  Maximize2,
  FileJson,
  Calendar,
  Lock,
  Wrench,
  FileCode,
  Settings,
  Database,
  User,
  MessageSquare,
  Menu,
  X
} from 'lucide-react';
import JsonFormatterPage from './pages/JsonFormatterPage';
import DateConverterPage from './pages/DateConverterPage';
import Base64Page from './pages/Base64Page';
import ToolsPage from './pages/ToolsPage';
import JsonXmlPage from './pages/JsonXmlPage';
import YamlPropsPage from './pages/YamlPropsPage';
import MongoSqlPage from './pages/MongoSqlPage';
import AboutPage from './pages/AboutPage';
import BugRunnerPage from './pages/BugRunnerPage';
import SecretGamePage from './pages/SecretGamePage';
import FeedbackPage from './pages/FeedbackPage';

type AppPage = 'compare' | 'format' | 'date' | 'base64' | 'tools' | 'xml' | 'yaml' | 'mongo' | 'about' | 'game' | 'secret' | 'feedback';

// Types
interface DiffLine {
  lineNum: number;
  content: string;
  status: 'unchanged' | 'added' | 'removed' | 'modified';
  path?: string;
  isCollapsible?: boolean;
  depth: number;
}

interface DiffResult {
  leftLines: DiffLine[];
  rightLines: DiffLine[];
}

/**
 * Parse JSON and get semantic path for each line
 */
const getLinePaths = (jsonStr: string): Map<number, { path: string; isCollapsible: boolean; depth: number }> => {
  const result = new Map<number, { path: string; isCollapsible: boolean; depth: number }>();
  const lines = jsonStr.split('\n');
  const pathStack: string[] = [];
  let currentKey = '';
  let depth = 0;

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    const openBrackets = (line.match(/[{[]/g) || []).length;
    const closeBrackets = (line.match(/[}\]]/g) || []).length;

    const keyMatch = trimmed.match(/^"([^"]+)"\s*:/);
    if (keyMatch) {
      currentKey = keyMatch[1];
    }

    const currentPath = [...pathStack, currentKey].filter(Boolean).join('.');
    const isCollapsible = trimmed.includes('{') || trimmed.includes('[');

    result.set(idx, {
      path: currentPath || 'root',
      isCollapsible,
      depth
    });

    if (openBrackets > closeBrackets) {
      pathStack.push(currentKey);
      currentKey = '';
      depth++;
    } else if (closeBrackets > openBrackets) {
      pathStack.pop();
      depth--;
    }
  });

  return result;
};

/**
 * Semantic comparison that preserves original text
 */
const compareJsonPreserving = (leftJson: string, rightJson: string): DiffResult => {
  let formattedLeft = '';
  let formattedRight = '';

  try {
    formattedLeft = JSON.stringify(JSON.parse(leftJson), null, 2);
    formattedRight = JSON.stringify(JSON.parse(rightJson), null, 2);
  } catch {
    return { leftLines: [], rightLines: [] };
  }

  const leftLines = formattedLeft.split('\n');
  const rightLines = formattedRight.split('\n');

  const leftPaths = getLinePaths(formattedLeft);
  const rightPaths = getLinePaths(formattedRight);

  const resultLeft: DiffLine[] = [];
  const resultRight: DiffLine[] = [];

  let leftIdx = 0;
  let rightIdx = 0;
  let lineNum = 1;

  while (leftIdx < leftLines.length || rightIdx < rightLines.length) {
    const leftContent = leftLines[leftIdx] ?? null;
    const rightContent = rightLines[rightIdx] ?? null;
    const leftPathInfo = leftPaths.get(leftIdx);
    const rightPathInfo = rightPaths.get(rightIdx);

    if (leftContent === rightContent) {
      resultLeft.push({
        lineNum: lineNum,
        content: leftContent,
        status: 'unchanged',
        path: leftPathInfo?.path,
        isCollapsible: leftPathInfo?.isCollapsible,
        depth: leftPathInfo?.depth ?? 0
      });
      resultRight.push({
        lineNum: lineNum,
        content: rightContent,
        status: 'unchanged',
        path: rightPathInfo?.path,
        isCollapsible: rightPathInfo?.isCollapsible,
        depth: rightPathInfo?.depth ?? 0
      });
      leftIdx++;
      rightIdx++;
      lineNum++;
    } else if (leftContent !== null && rightContent !== null) {
      const leftKey = leftContent.match(/"([^"]+)"\s*:/)?.[1];
      const rightKey = rightContent.match(/"([^"]+)"\s*:/)?.[1];

      if (leftKey && rightKey && leftKey === rightKey) {
        resultLeft.push({
          lineNum: lineNum,
          content: leftContent,
          status: 'modified',
          path: leftPathInfo?.path,
          isCollapsible: leftPathInfo?.isCollapsible,
          depth: leftPathInfo?.depth ?? 0
        });
        resultRight.push({
          lineNum: lineNum,
          content: rightContent,
          status: 'modified',
          path: rightPathInfo?.path,
          isCollapsible: rightPathInfo?.isCollapsible,
          depth: rightPathInfo?.depth ?? 0
        });
        leftIdx++;
        rightIdx++;
        lineNum++;
      } else {
        const leftInRight = rightLines.slice(rightIdx).includes(leftContent);
        const rightInLeft = leftLines.slice(leftIdx).includes(rightContent);

        if (!leftInRight && rightInLeft) {
          resultLeft.push({
            lineNum: lineNum,
            content: leftContent,
            status: 'removed',
            path: leftPathInfo?.path,
            isCollapsible: leftPathInfo?.isCollapsible,
            depth: leftPathInfo?.depth ?? 0
          });
          resultRight.push({
            lineNum: lineNum,
            content: '',
            status: 'removed',
            depth: leftPathInfo?.depth ?? 0
          });
          leftIdx++;
          lineNum++;
        } else if (leftInRight && !rightInLeft) {
          resultLeft.push({
            lineNum: lineNum,
            content: '',
            status: 'added',
            depth: rightPathInfo?.depth ?? 0
          });
          resultRight.push({
            lineNum: lineNum,
            content: rightContent,
            status: 'added',
            path: rightPathInfo?.path,
            isCollapsible: rightPathInfo?.isCollapsible,
            depth: rightPathInfo?.depth ?? 0
          });
          rightIdx++;
          lineNum++;
        } else {
          resultLeft.push({
            lineNum: lineNum,
            content: leftContent,
            status: 'removed',
            path: leftPathInfo?.path,
            isCollapsible: leftPathInfo?.isCollapsible,
            depth: leftPathInfo?.depth ?? 0
          });
          resultRight.push({
            lineNum: lineNum,
            content: '',
            status: 'removed',
            depth: leftPathInfo?.depth ?? 0
          });
          lineNum++;

          resultLeft.push({
            lineNum: lineNum,
            content: '',
            status: 'added',
            depth: rightPathInfo?.depth ?? 0
          });
          resultRight.push({
            lineNum: lineNum,
            content: rightContent,
            status: 'added',
            path: rightPathInfo?.path,
            isCollapsible: rightPathInfo?.isCollapsible,
            depth: rightPathInfo?.depth ?? 0
          });
          leftIdx++;
          rightIdx++;
          lineNum++;
        }
      }
    } else if (leftContent !== null) {
      resultLeft.push({
        lineNum: lineNum,
        content: leftContent,
        status: 'removed',
        path: leftPathInfo?.path,
        isCollapsible: leftPathInfo?.isCollapsible,
        depth: leftPathInfo?.depth ?? 0
      });
      resultRight.push({
        lineNum: lineNum,
        content: '',
        status: 'removed',
        depth: leftPathInfo?.depth ?? 0
      });
      leftIdx++;
      lineNum++;
    } else if (rightContent !== null) {
      resultLeft.push({
        lineNum: lineNum,
        content: '',
        status: 'added',
        depth: rightPathInfo?.depth ?? 0
      });
      resultRight.push({
        lineNum: lineNum,
        content: rightContent,
        status: 'added',
        path: rightPathInfo?.path,
        isCollapsible: rightPathInfo?.isCollapsible,
        depth: rightPathInfo?.depth ?? 0
      });
      rightIdx++;
      lineNum++;
    }
  }

  return { leftLines: resultLeft, rightLines: resultRight };
};

// --- LineRenderer Component (VS Code Style) ---

interface LineRendererProps {
  line: DiffLine;
  side: 'left' | 'right';
  isCollapsed: boolean;
  onToggleCollapse: (path: string) => void;
  otherLine?: DiffLine; // For character-level diff highlighting
}

// Helper function to find character-level differences between two strings
const getCharDiff = (left: string, right: string): { leftHighlight: [number, number][]; rightHighlight: [number, number][] } => {
  const leftHighlight: [number, number][] = [];
  const rightHighlight: [number, number][] = [];

  // Find the value portion after the colon for JSON lines
  const leftMatch = left.match(/^(\s*"[^"]+"\s*:\s*)/);
  const rightMatch = right.match(/^(\s*"[^"]+"\s*:\s*)/);

  if (leftMatch && rightMatch && leftMatch[0].length === rightMatch[0].length) {
    // Keys match, highlight only the value portion
    const prefixLen = leftMatch[0].length;
    leftHighlight.push([prefixLen, left.length]);
    rightHighlight.push([prefixLen, right.length]);
  } else {
    // Highlight the whole line
    leftHighlight.push([0, left.length]);
    rightHighlight.push([0, right.length]);
  }

  return { leftHighlight, rightHighlight };
};

// Helper to render content with character-level highlighting
const renderHighlightedContent = (content: string, highlights: [number, number][], highlightClass: string) => {
  if (highlights.length === 0) {
    return <span>{content}</span>;
  }

  const result: React.ReactNode[] = [];
  let lastEnd = 0;

  highlights.forEach(([start, end], idx) => {
    if (start > lastEnd) {
      result.push(<span key={`text-${idx}`}>{content.slice(lastEnd, start)}</span>);
    }
    result.push(
      <span key={`hl-${idx}`} className={highlightClass}>
        {content.slice(start, end)}
      </span>
    );
    lastEnd = end;
  });

  if (lastEnd < content.length) {
    result.push(<span key="end">{content.slice(lastEnd)}</span>);
  }

  return <>{result}</>;
};

const LineRenderer: React.FC<LineRendererProps> = ({ line, side, isCollapsed, onToggleCollapse, otherLine }) => {
  const isEmpty = line.content === '';

  // VS Code dark theme colors
  let bgClass = 'bg-[#1e1e1e]';
  let textClass = 'text-[#d4d4d4]';
  let gutterColor = 'border-transparent';
  const lineNumClass = 'text-[#858585]';
  let highlights: [number, number][] = [];
  let highlightClass = '';

  if (isEmpty) {
    // Empty line placeholder (for alignment)
    return (
      <div className="h-6 flex items-center bg-[#1e1e1e] group">
        <div className="w-1 h-full border-l-2 border-transparent flex-shrink-0"></div>
        <span className="w-12 pr-3 text-xs text-[#858585] text-right select-none block font-mono flex-shrink-0">{line.lineNum}</span>
        <div className="flex-1 h-full bg-[#2d2d2d] opacity-50"></div>
      </div>
    );
  }

  // Color based on change status - VS Code style
  if (line.status === 'added') {
    if (side === 'right') {
      bgClass = 'bg-[#1e3a1e]';
      gutterColor = 'border-[#4d9f4d]';
      textClass = 'text-[#d4d4d4]';
    }
  } else if (line.status === 'removed') {
    if (side === 'left') {
      bgClass = 'bg-[#3a1d1e]';
      gutterColor = 'border-[#9f4d4d]';
      textClass = 'text-[#d4d4d4]';
    }
  } else if (line.status === 'modified') {
    // Modified lines get character-level highlighting
    bgClass = side === 'left' ? 'bg-[#3a2a1e]' : 'bg-[#1e3a2a]';
    gutterColor = side === 'left' ? 'border-[#9f7f4d]' : 'border-[#4d9f7f]';

    // Calculate character-level highlights
    if (otherLine && otherLine.content) {
      const diff = getCharDiff(line.content, otherLine.content);
      highlights = side === 'left' ? diff.leftHighlight : diff.rightHighlight;
      highlightClass = side === 'left' ? 'bg-[#5c3a1e] rounded-sm' : 'bg-[#1e5c3a] rounded-sm';
    }
  }

  const showCollapseToggle = line.isCollapsible && line.path;

  return (
    <div className={`h-6 flex items-center font-mono text-sm group ${bgClass}`}>
      {/* Gutter indicator */}
      <div className={`w-1 h-full border-l-2 ${gutterColor} flex-shrink-0`}></div>

      {/* Line number */}
      <span className={`w-12 pr-3 text-xs ${lineNumClass} text-right select-none block font-mono flex-shrink-0 group-hover:text-[#a0a0a0]`}>
        {line.lineNum}
      </span>

      {/* Collapse toggle */}
      {showCollapseToggle && (
        <button
          onClick={() => line.path && onToggleCollapse(line.path)}
          className="w-4 h-4 flex items-center justify-center mr-1 text-[#858585] hover:text-[#0078d4] hover:bg-[#2a2d2e] rounded transition-colors flex-shrink-0"
        >
          {isCollapsed ? (
            <ChevronRight size={12} />
          ) : (
            <ChevronDown size={12} />
          )}
        </button>
      )}

      {/* Content with optional character-level highlighting */}
      <pre className={`m-0 p-0 bg-transparent whitespace-pre overflow-visible ${textClass}`}>
        <code>
          {highlights.length > 0
            ? renderHighlightedContent(line.content, highlights, highlightClass)
            : line.content
          }
        </code>
      </pre>

      {isCollapsed && showCollapseToggle && (
        <span className="text-[#858585] ml-1">...</span>
      )}
    </div>
  );
};

// --- Diff Minimap Component (VS Code style overview) ---
interface DiffMinimapProps {
  lines: DiffLine[];
  totalHeight: number;
  onScrollTo: (lineNum: number) => void;
}

const DiffMinimap: React.FC<DiffMinimapProps> = ({ lines, totalHeight, onScrollTo }) => {
  const minimapHeight = Math.min(totalHeight, 400);
  const lineHeight = lines.length > 0 ? minimapHeight / lines.length : 0;

  return (
    <div
      className="w-3 bg-[#1e1e1e] border-l border-[#3c3c3c] flex-shrink-0 relative cursor-pointer hidden md:block"
      style={{ height: minimapHeight }}
    >
      {lines.map((line, idx) => {
        if (line.status === 'unchanged' || line.content === '') return null;

        let color = 'transparent';
        if (line.status === 'added') color = '#4d9f4d';
        else if (line.status === 'removed') color = '#9f4d4d';
        else if (line.status === 'modified') color = '#9f7f4d';

        const top = idx * lineHeight;
        const height = Math.max(lineHeight, 2);

        return (
          <div
            key={idx}
            className="absolute right-0 w-2 hover:w-3 transition-all cursor-pointer"
            style={{
              top: `${top}px`,
              height: `${height}px`,
              backgroundColor: color,
              opacity: 0.8
            }}
            onClick={() => onScrollTo(line.lineNum)}
            title={`Line ${line.lineNum}: ${line.status}`}
          />
        );
      })}
    </div>
  );
};

// --- Compare Page Component ---

interface ComparePageProps {
  onOpenInFormat: (json: string) => void;
  jsonA: string;
  setJsonA: (v: string) => void;
  jsonB: string;
  setJsonB: (v: string) => void;
  diffResult: DiffResult | null;
  setDiffResult: (v: DiffResult | null) => void;
  compareMode: 'input' | 'compare';
  setCompareMode: (v: 'input' | 'compare') => void;
  collapsedPaths: Set<string>;
  setCollapsedPaths: React.Dispatch<React.SetStateAction<Set<string>>>;
}

function ComparePage({
  onOpenInFormat,
  jsonA,
  setJsonA,
  jsonB,
  setJsonB,
  diffResult,
  setDiffResult,
  compareMode: mode,
  setCompareMode: setMode,
  collapsedPaths,
  setCollapsedPaths
}: ComparePageProps) {
  const [error, setError] = useState<string | null>(null);

  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  const handleScroll = (source: React.RefObject<HTMLDivElement | null>, target: React.RefObject<HTMLDivElement | null>) => {
    if (isScrolling.current) return;
    isScrolling.current = true;
    if (target.current && source.current) {
      target.current.scrollTop = source.current.scrollTop;
      target.current.scrollLeft = source.current.scrollLeft;
    }
    setTimeout(() => { isScrolling.current = false; }, 50);
  };

  const togglePath = useCallback((path: string) => {
    setCollapsedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, [setCollapsedPaths]);

  const handleExpandAll = useCallback(() => setCollapsedPaths(new Set()), [setCollapsedPaths]);

  const handleCollapseAll = useCallback(() => {
    if (!diffResult) return;

    // Collapse top-level nodes (depth 1) which will hide their nested children
    // This shows the main structure but hides the details
    const topLevelPaths = new Set<string>();

    diffResult.leftLines.forEach(line => {
      if (line.isCollapsible && line.path && line.depth === 1) {
        topLevelPaths.add(line.path);
      }
    });

    diffResult.rightLines.forEach(line => {
      if (line.isCollapsible && line.path && line.depth === 1) {
        topLevelPaths.add(line.path);
      }
    });

    setCollapsedPaths(topLevelPaths);
  }, [diffResult, setCollapsedPaths]);

  const filteredLines = useMemo(() => {
    if (!diffResult) return { leftLines: [], rightLines: [] };

    const filterByCollapsed = (lines: DiffLine[]) => {
      const result: DiffLine[] = [];
      let skipUntilDepth = -1;

      for (const line of lines) {
        if (skipUntilDepth >= 0 && line.depth > skipUntilDepth) {
          continue;
        }
        skipUntilDepth = -1;

        if (line.isCollapsible && line.path && collapsedPaths.has(line.path)) {
          result.push(line);
          skipUntilDepth = line.depth;
          continue;
        }

        result.push(line);
      }

      return result;
    };

    return {
      leftLines: filterByCollapsed(diffResult.leftLines),
      rightLines: filterByCollapsed(diffResult.rightLines)
    };
  }, [diffResult, collapsedPaths]);

  const processDiff = () => {
    try {
      JSON.parse(jsonA);
      JSON.parse(jsonB);
      const result = compareJsonPreserving(jsonA, jsonB);
      setDiffResult(result);
      setCollapsedPaths(new Set());
      setMode('compare');
      setError(null);
    } catch (e) {
      setError("Invalid JSON: " + (e as Error).message);
    }
  };

  const formatJson = () => {
    try {
      const a = JSON.stringify(JSON.parse(jsonA), null, 2);
      const b = JSON.stringify(JSON.parse(jsonB), null, 2);
      setJsonA(a);
      setJsonB(b);
      setError(null);
    } catch {
      setError("Cannot format: Invalid JSON found.");
    }
  };

  const clearAll = () => {
    setJsonA('');
    setJsonB('');
    setMode('input');
  };

  const stats = useMemo(() => {
    if (mode !== 'compare' || !diffResult) return null;
    let added = 0, removed = 0, modified = 0;
    diffResult.leftLines.forEach(l => {
      if (l.status === 'added') added++;
      if (l.status === 'removed') removed++;
      if (l.status === 'modified') modified++;
    });
    return { added, removed, modified };
  }, [diffResult, mode]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex-shrink-0 border-b border-slate-200 px-3 md:px-4 py-2 flex flex-wrap items-center justify-between gap-2 bg-slate-50">
        <div className="flex items-center gap-2 md:gap-4">
          {mode === 'compare' && stats && (
            <div className="flex gap-2 md:gap-3 text-xs md:text-sm font-medium">
              <span className="flex items-center text-green-600 bg-green-50 px-1.5 md:px-2 py-0.5 md:py-1 rounded">
                +{stats.added}
              </span>
              <span className="flex items-center text-red-600 bg-red-50 px-1.5 md:px-2 py-0.5 md:py-1 rounded">
                -{stats.removed}
              </span>
              <span className="flex items-center text-amber-600 bg-amber-50 px-1.5 md:px-2 py-0.5 md:py-1 rounded">
                ~{stats.modified}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          {mode === 'input' ? (
            <>
              <button onClick={formatJson} className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                <Code2 size={14} /> <span className="hidden sm:inline">Prettify</span>
              </button>
              <button onClick={clearAll} className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                <Trash2 size={14} /> <span className="hidden sm:inline">Clear</span>
              </button>
              <button
                onClick={processDiff}
                className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-1.5 text-xs md:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm transition-all active:scale-95"
              >
                Compare <ChevronRight size={14} />
              </button>
            </>
          ) : (
            <>
              <button onClick={handleExpandAll} className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                <Maximize2 size={14} />
              </button>
              <button onClick={handleCollapseAll} className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                <Minimize2 size={14} />
              </button>
              <button
                onClick={() => setMode('input')}
                className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-1.5 text-xs md:text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded shadow-sm transition-all"
              >
                Edit
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex-shrink-0 bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2 text-red-700">
          <AlertCircle size={16} />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {mode === 'input' ? (
          <div className="flex-1 flex flex-col md:flex-row md:divide-x divide-slate-200 bg-white">
            {/* Left Input with Line Numbers */}
            <div className="flex-1 flex flex-col min-h-[200px] md:min-h-0 border-b md:border-b-0 border-slate-200">
              <div className="flex-shrink-0 px-4 py-2 border-b border-slate-100 bg-slate-50/50">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Original</span>
              </div>
              <div className="flex-1 flex overflow-hidden">
                <div className="flex-shrink-0 bg-slate-50 border-r border-slate-200 overflow-hidden select-none hidden md:block">
                  <div className="pt-4 pb-4">
                    {jsonA.split('\n').map((_, idx) => (
                      <div key={idx} className="h-5 text-right pr-3 pl-2 text-xs text-slate-400 font-mono">
                        {idx + 1}
                      </div>
                    ))}
                  </div>
                </div>
                <textarea
                  value={jsonA}
                  onChange={(e) => setJsonA(e.target.value)}
                  className="flex-1 p-3 md:p-4 font-mono text-sm bg-white border-0 resize-none text-slate-700 focus:outline-none leading-5"
                  spellCheck={false}
                  placeholder='{"key": "value"}'
                />
              </div>
            </div>
            {/* Right Input with Line Numbers */}
            <div className="flex-1 flex flex-col min-h-[200px] md:min-h-0">
              <div className="flex-shrink-0 px-4 py-2 border-b border-slate-100 bg-slate-50/50">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Modified</span>
              </div>
              <div className="flex-1 flex overflow-hidden">
                <div className="flex-shrink-0 bg-slate-50 border-r border-slate-200 overflow-hidden select-none hidden md:block">
                  <div className="pt-4 pb-4">
                    {jsonB.split('\n').map((_, idx) => (
                      <div key={idx} className="h-5 text-right pr-3 pl-2 text-xs text-slate-400 font-mono">
                        {idx + 1}
                      </div>
                    ))}
                  </div>
                </div>
                <textarea
                  value={jsonB}
                  onChange={(e) => setJsonB(e.target.value)}
                  className="flex-1 p-3 md:p-4 font-mono text-sm bg-white border-0 resize-none text-slate-700 focus:outline-none leading-5"
                  spellCheck={false}
                  placeholder='{"key": "new_value"}'
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col bg-[#1e1e1e]">
            {/* VS Code style panel headers */}
            <div className="flex flex-col md:flex-row border-b border-[#3c3c3c] bg-[#252526] text-xs font-medium text-[#cccccc]">
              <div className="w-full md:w-1/2 p-2 px-4 border-b md:border-b-0 md:border-r border-[#3c3c3c] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileJson size={14} className="text-[#75beff]" />
                  <span>Original</span>
                </div>
                <button
                  onClick={() => onOpenInFormat(jsonA)}
                  className="text-[10px] px-2 py-0.5 text-[#75beff] hover:bg-[#37373d] rounded transition-colors font-medium"
                >
                  Open in Format →
                </button>
              </div>
              <div className="w-full md:w-1/2 p-2 px-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileJson size={14} className="text-[#75beff]" />
                  <span>Modified</span>
                </div>
                <button
                  onClick={() => onOpenInFormat(jsonB)}
                  className="text-[10px] px-2 py-0.5 text-[#75beff] hover:bg-[#37373d] rounded transition-colors font-medium"
                >
                  Open in Format →
                </button>
              </div>
            </div>
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Left panel with minimap */}
              <div className="w-full md:w-1/2 flex border-b md:border-b-0 md:border-r border-[#3c3c3c]">
                <div
                  ref={leftRef}
                  onScroll={() => handleScroll(leftRef, rightRef)}
                  className="flex-1 overflow-auto bg-[#1e1e1e] min-h-[200px] md:min-h-0"
                >
                  <div className="min-w-fit">
                    {filteredLines.leftLines.map((line, idx) => (
                      <LineRenderer
                        key={`L-${idx}`}
                        line={line}
                        side="left"
                        isCollapsed={line.path ? collapsedPaths.has(line.path) : false}
                        onToggleCollapse={togglePath}
                        otherLine={line.status === 'modified' ? filteredLines.rightLines[idx] : undefined}
                      />
                    ))}
                  </div>
                </div>
                <DiffMinimap
                  lines={filteredLines.leftLines}
                  totalHeight={filteredLines.leftLines.length * 24}
                  onScrollTo={(lineNum) => {
                    if (leftRef.current) {
                      leftRef.current.scrollTop = (lineNum - 1) * 24;
                    }
                  }}
                />
              </div>
              {/* Right panel with minimap */}
              <div className="w-full md:w-1/2 flex">
                <div
                  ref={rightRef}
                  onScroll={() => handleScroll(rightRef, leftRef)}
                  className="flex-1 overflow-auto bg-[#1e1e1e] min-h-[200px] md:min-h-0"
                >
                  <div className="min-w-fit">
                    {filteredLines.rightLines.map((line, idx) => (
                      <LineRenderer
                        key={`R-${idx}`}
                        line={line}
                        side="right"
                        isCollapsed={line.path ? collapsedPaths.has(line.path) : false}
                        onToggleCollapse={togglePath}
                        otherLine={line.status === 'modified' ? filteredLines.leftLines[idx] : undefined}
                      />
                    ))}
                  </div>
                </div>
                <DiffMinimap
                  lines={filteredLines.rightLines}
                  totalHeight={filteredLines.rightLines.length * 24}
                  onScrollTo={(lineNum) => {
                    if (rightRef.current) {
                      rightRef.current.scrollTop = (lineNum - 1) * 24;
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main App with Page Navigation ---



const KONAMI_CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];

export default function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>('compare');

  // Persistent Compare page state
  const [jsonA, setJsonA] = useState('{\n  "project": "SuperApp",\n  "version": 1.0,\n  "settings": {\n    "theme": "light",\n    "notifications": true\n  },\n  "tags": ["react", "tailwind"]\n}');
  const [jsonB, setJsonB] = useState('{\n  "project": "SuperApp Pro",\n  "version": 1.2,\n  "settings": {\n    "theme": "dark",\n    "advanced": true\n  },\n  "tags": ["react", "typescript"]\n}');
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [compareMode, setCompareMode] = useState<'input' | 'compare'>('input');
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set());
  const [formatterJson, setFormatterJson] = useState<string | undefined>(undefined);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // --- Refs ---
  const konamiIndex = useRef(0);

  // Confetti Logic
  const clickCount = useRef(0);
  const lastClickTime = useRef(0);

  const handleLogoClick = () => {
    const now = Date.now();
    if (now - lastClickTime.current > 500) {
      clickCount.current = 0;
    }
    clickCount.current++;
    lastClickTime.current = now;

    if (clickCount.current === 5) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444']
      });
      clickCount.current = 0;
    }
  };

  const openInFormat = (json: string) => {
    setFormatterJson(json);
    setCurrentPage('format');
  };

  useEffect(() => {
    // Disable Inspect Element and Context Menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Konami Code
      if (e.code === KONAMI_CODE[konamiIndex.current]) {
        konamiIndex.current++;
        if (konamiIndex.current === KONAMI_CODE.length) {
          // Success!
          confetti({
            particleCount: 200,
            spread: 100,
            origin: { y: 0.6 }
          });
          setCurrentPage('secret');
          konamiIndex.current = 0;
        }
      } else {
        konamiIndex.current = 0;
      }

      // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Cmd+Opt+I (Mac)
      if (
        e.code === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.code === 'KeyI') ||
        (e.ctrlKey && e.shiftKey && e.code === 'KeyJ') ||
        (e.ctrlKey && e.code === 'KeyU') ||
        (e.metaKey && e.altKey && e.code === 'KeyI')
      ) {
        e.preventDefault();
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Header with Navigation */}
      <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between shadow-sm z-20 sticky top-0">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex items-center gap-2 md:gap-3">
            <div
              className="bg-blue-600 p-1.5 md:p-2 rounded-lg text-white cursor-pointer active:scale-95 transition-transform select-none"
              onClick={handleLogoClick}
              title="Click me 5 times!"
            >
              <FileJson size={18} className="md:w-5 md:h-5" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold tracking-tight text-slate-900">DevKit</h1>
            </div>
          </div>

          {/* Desktop Page Tabs - hidden on mobile */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 rounded-lg p-1 overflow-x-auto">
            <button
              onClick={() => setCurrentPage('compare')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${currentPage === 'compare'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
            >
              <ArrowRightLeft size={16} />
              Compare
            </button>
            <button
              onClick={() => setCurrentPage('format')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${currentPage === 'format'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
            >
              <Code2 size={16} />
              Format
            </button>
            <button
              onClick={() => setCurrentPage('date')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${currentPage === 'date'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
            >
              <Calendar size={16} />
              Date
            </button>
            <button
              onClick={() => setCurrentPage('base64')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${currentPage === 'base64'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
            >
              <Lock size={16} />
              Base64
            </button>
            <button
              onClick={() => setCurrentPage('tools')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${currentPage === 'tools'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
            >
              <Wrench size={16} />
              Tools
            </button>
            <button
              onClick={() => setCurrentPage('xml')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${currentPage === 'xml'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
            >
              <FileCode size={16} />
              XML
            </button>
            <button
              onClick={() => setCurrentPage('yaml')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${currentPage === 'yaml'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
            >
              <Settings size={16} />
              YAML
            </button>
            <button
              onClick={() => setCurrentPage('mongo')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${currentPage === 'mongo'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
            >
              <Database size={16} />
              Mongo
            </button>
            <button
              onClick={() => setCurrentPage('feedback')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${currentPage === 'feedback'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
            >
              <MessageSquare size={16} />
              Feedback
            </button>
            <button
              onClick={() => setCurrentPage('about')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${currentPage === 'about'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
            >
              <User size={16} />
              About
            </button>
          </nav>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[57px] bg-black/50 z-50" onClick={() => setMobileMenuOpen(false)}>
          <nav className="bg-white border-b border-slate-200 shadow-lg max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {[
              { id: 'compare' as AppPage, icon: ArrowRightLeft, label: 'Compare' },
              { id: 'format' as AppPage, icon: Code2, label: 'Format' },
              { id: 'date' as AppPage, icon: Calendar, label: 'Date' },
              { id: 'base64' as AppPage, icon: Lock, label: 'Base64' },
              { id: 'tools' as AppPage, icon: Wrench, label: 'Tools' },
              { id: 'xml' as AppPage, icon: FileCode, label: 'XML' },
              { id: 'yaml' as AppPage, icon: Settings, label: 'YAML' },
              { id: 'mongo' as AppPage, icon: Database, label: 'Mongo' },
              { id: 'feedback' as AppPage, icon: MessageSquare, label: 'Feedback' },
              { id: 'about' as AppPage, icon: User, label: 'About' },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => { setCurrentPage(id); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left text-base font-medium border-b border-slate-100 transition-colors ${currentPage === id
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-700 hover:bg-slate-50'
                  }`}
              >
                <Icon size={20} />
                {label}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Page Content */}
      {currentPage === 'compare' && (
        <ComparePage
          onOpenInFormat={openInFormat}
          jsonA={jsonA}
          setJsonA={setJsonA}
          jsonB={jsonB}
          setJsonB={setJsonB}
          diffResult={diffResult}
          setDiffResult={setDiffResult}
          compareMode={compareMode}
          setCompareMode={setCompareMode}
          collapsedPaths={collapsedPaths}
          setCollapsedPaths={setCollapsedPaths}
        />
      )}
      {currentPage === 'format' && <JsonFormatterPage initialJson={formatterJson} key={formatterJson} />}
      {currentPage === 'date' && <DateConverterPage />}
      {currentPage === 'base64' && <Base64Page />}
      {currentPage === 'tools' && <ToolsPage />}
      {currentPage === 'xml' && <JsonXmlPage />}
      {currentPage === 'yaml' && <YamlPropsPage />}
      {currentPage === 'mongo' && <MongoSqlPage />}
      {currentPage === 'feedback' && <FeedbackPage />}
      {currentPage === 'about' && <AboutPage onStartGame={() => setCurrentPage('game')} />}
      {currentPage === 'game' && <BugRunnerPage />}
      {currentPage === 'secret' && <SecretGamePage onExit={() => setCurrentPage('about')} />}
    </div>
  );
}
