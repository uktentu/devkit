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
  MessageSquare
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

// --- LineRenderer Component ---

interface LineRendererProps {
  line: DiffLine;
  side: 'left' | 'right';
  isCollapsed: boolean;
  onToggleCollapse: (path: string) => void;
}

const LineRenderer: React.FC<LineRendererProps> = ({ line, side, isCollapsed, onToggleCollapse }) => {
  const isEmpty = line.content === '';

  let bgClass = '';
  let textClass = 'text-slate-700';

  if (isEmpty) {
    return (
      <div className="h-6 flex items-center px-2 hover:bg-slate-50 group">
        <span className="w-10 mr-2 text-xs text-slate-300 text-right select-none block font-mono">{line.lineNum}</span>
        <div className="flex-1 h-full bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzjwqhhAGFQBVQAQxJcFCAAztE07B553hAAAAABJRU5ErkJggg==')] opacity-10"></div>
      </div>
    );
  }

  // Only color based on change status - Red, Green, Yellow
  if (line.status === 'added') {
    bgClass = side === 'right' ? 'bg-green-100' : '';
    textClass = side === 'right' ? 'text-green-800' : 'text-slate-400';
  } else if (line.status === 'removed') {
    bgClass = side === 'left' ? 'bg-red-100' : '';
    textClass = side === 'left' ? 'text-red-800' : 'text-slate-400';
  } else if (line.status === 'modified') {
    bgClass = 'bg-yellow-100';
    textClass = 'text-yellow-800';
  }

  const showCollapseToggle = line.isCollapsible && line.path;

  return (
    <div className={`h-6 flex items-center px-2 font-mono text-sm hover:brightness-95 transition-colors group ${bgClass} ${textClass}`}>
      <span className="w-10 mr-2 text-xs text-slate-400 text-right select-none block font-mono group-hover:text-slate-500 flex-shrink-0">{line.lineNum}</span>

      {showCollapseToggle && (
        <button
          onClick={() => line.path && onToggleCollapse(line.path)}
          className="w-4 h-4 flex items-center justify-center mr-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors flex-shrink-0"
        >
          {isCollapsed ? (
            <ChevronRight size={12} />
          ) : (
            <ChevronDown size={12} />
          )}
        </button>
      )}

      {/* Plain text - no syntax highlighting, only change-based coloring */}
      <pre className="m-0 p-0 bg-transparent whitespace-pre overflow-visible">
        <code>{line.content}</code>
      </pre>
      {isCollapsed && showCollapseToggle && (
        <span className="text-slate-400 ml-1">...</span>
      )}
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
    // We can't easily know all paths without traversing.
    // For now, let's just clear (expand all) or we need a way to find all paths.
    // Actually, Collapse All usually means "collapse top level" or "collapse everything".
    // Since default is expanded, adding root keys to collapsedPaths would collapse them.
    // Simplifying: Just reset for now or implement recursive path finding.
    setCollapsedPaths(new Set()); // Reset to expanded state as default
  }, [setCollapsedPaths]);

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
      <div className="flex-shrink-0 border-b border-slate-200 px-4 py-2 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-4">
          {mode === 'compare' && stats && (
            <div className="flex gap-3 text-sm font-medium">
              <span className="flex items-center text-green-600 bg-green-50 px-2 py-1 rounded">
                +{stats.added}
              </span>
              <span className="flex items-center text-red-600 bg-red-50 px-2 py-1 rounded">
                -{stats.removed}
              </span>
              <span className="flex items-center text-amber-600 bg-amber-50 px-2 py-1 rounded">
                ~{stats.modified}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {mode === 'input' ? (
            <>
              <button onClick={formatJson} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                <Code2 size={14} /> Prettify
              </button>
              <button onClick={clearAll} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                <Trash2 size={14} /> Clear
              </button>
              <button
                onClick={processDiff}
                className="flex items-center gap-2 px-4 py-1.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm transition-all active:scale-95"
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
                className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded shadow-sm transition-all"
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
      <div className="flex-1 flex overflow-hidden">
        {mode === 'input' ? (
          <div className="flex-1 flex divide-x divide-slate-200 bg-white">
            {/* Left Input with Line Numbers */}
            <div className="flex-1 flex flex-col">
              <div className="flex-shrink-0 px-4 py-2 border-b border-slate-100 bg-slate-50/50">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Original</span>
              </div>
              <div className="flex-1 flex overflow-hidden">
                <div className="flex-shrink-0 bg-slate-50 border-r border-slate-200 overflow-hidden select-none">
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
                  className="flex-1 p-4 font-mono text-sm bg-white border-0 resize-none text-slate-700 focus:outline-none leading-5"
                  spellCheck={false}
                  placeholder='{"key": "value"}'
                />
              </div>
            </div>
            {/* Right Input with Line Numbers */}
            <div className="flex-1 flex flex-col">
              <div className="flex-shrink-0 px-4 py-2 border-b border-slate-100 bg-slate-50/50">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Modified</span>
              </div>
              <div className="flex-1 flex overflow-hidden">
                <div className="flex-shrink-0 bg-slate-50 border-r border-slate-200 overflow-hidden select-none">
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
                  className="flex-1 p-4 font-mono text-sm bg-white border-0 resize-none text-slate-700 focus:outline-none leading-5"
                  spellCheck={false}
                  placeholder='{"key": "new_value"}'
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col bg-white">
            <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <div className="w-1/2 p-2 px-4 border-r border-slate-200 flex items-center justify-between">
                <span>Original</span>
                <button
                  onClick={() => onOpenInFormat(jsonA)}
                  className="text-[10px] px-2 py-0.5 text-blue-600 hover:bg-blue-100 rounded transition-colors normal-case font-medium"
                >
                  Open in Format →
                </button>
              </div>
              <div className="w-1/2 p-2 px-4 flex items-center justify-between">
                <span>Modified</span>
                <button
                  onClick={() => onOpenInFormat(jsonB)}
                  className="text-[10px] px-2 py-0.5 text-blue-600 hover:bg-blue-100 rounded transition-colors normal-case font-medium"
                >
                  Open in Format →
                </button>
              </div>
            </div>
            <div className="flex-1 flex overflow-hidden">
              <div
                ref={leftRef}
                onScroll={() => handleScroll(leftRef, rightRef)}
                className="w-1/2 overflow-auto border-r border-slate-200 bg-white"
              >
                <div className="min-w-fit">
                  {filteredLines.leftLines.map((line, idx) => (
                    <LineRenderer
                      key={`L-${idx}`}
                      line={line}
                      side="left"
                      isCollapsed={line.path ? collapsedPaths.has(line.path) : false}
                      onToggleCollapse={togglePath}
                    />
                  ))}
                </div>
              </div>
              <div
                ref={rightRef}
                onScroll={() => handleScroll(rightRef, leftRef)}
                className="w-1/2 overflow-auto bg-white"
              >
                <div className="min-w-fit">
                  {filteredLines.rightLines.map((line, idx) => (
                    <LineRenderer
                      key={`R-${idx}`}
                      line={line}
                      side="right"
                      isCollapsed={line.path ? collapsedPaths.has(line.path) : false}
                      onToggleCollapse={togglePath}
                    />
                  ))}
                </div>
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
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm z-10 sticky top-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div
              className="bg-blue-600 p-2 rounded-lg text-white cursor-pointer active:scale-95 transition-transform select-none"
              onClick={handleLogoClick}
              title="Click me 5 times!"
            >
              <FileJson size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">DevKit</h1>
            </div>
          </div>

          {/* Page Tabs */}
          <nav className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 overflow-x-auto">
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
      </header>

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
