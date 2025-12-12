import { useState, useMemo, useCallback } from 'react';
import {
    Code2,
    List,
    TreePine,
    Minus,
    ChevronRight,
    ChevronDown,
    Copy,
    Check,
    AlertCircle,
    Trash2
} from 'lucide-react';

type ViewMode = 'formatted' | 'tree' | 'minified' | 'node';

interface TreeNode {
    key: string;
    value: unknown;
    type: string;
    path: string;
    depth: number;
    children?: TreeNode[];
}

// Build tree structure from JSON
const buildTree = (obj: unknown, key = 'root', path = 'root', depth = 0): TreeNode => {
    const type = obj === null ? 'null' : Array.isArray(obj) ? 'array' : typeof obj;

    const node: TreeNode = {
        key,
        value: obj,
        type,
        path,
        depth
    };

    if (type === 'object' && obj !== null) {
        node.children = Object.entries(obj as Record<string, unknown>).map(([k, v]) =>
            buildTree(v, k, `${path}.${k}`, depth + 1)
        );
    } else if (type === 'array') {
        node.children = (obj as unknown[]).map((item, idx) =>
            buildTree(item, `[${idx}]`, `${path}[${idx}]`, depth + 1)
        );
    }

    return node;
};

// Tree Node Component
interface TreeNodeProps {
    node: TreeNode;
    expandedPaths: Set<string>;
    onToggle: (path: string) => void;
    selectedPath: string | null;
    onSelect: (path: string) => void;
}

const TreeNodeComponent: React.FC<TreeNodeProps> = ({
    node,
    expandedPaths,
    onToggle,
    selectedPath,
    onSelect
}) => {
    const isExpanded = expandedPaths.has(node.path);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedPath === node.path;

    const renderValue = () => {
        if (node.type === 'object') return `{ ${node.children?.length} properties }`;
        if (node.type === 'array') return `[ ${node.children?.length} items ]`;
        if (node.type === 'string') return <span className="text-green-600">"{String(node.value)}"</span>;
        if (node.type === 'number') return <span className="text-orange-600">{String(node.value)}</span>;
        if (node.type === 'boolean') return <span className="text-purple-600">{String(node.value)}</span>;
        if (node.type === 'null') return <span className="text-slate-500">null</span>;
        return String(node.value);
    };

    const getTypeColor = () => {
        switch (node.type) {
            case 'object': return 'text-blue-500';
            case 'array': return 'text-indigo-500';
            case 'string': return 'text-green-500';
            case 'number': return 'text-orange-500';
            case 'boolean': return 'text-purple-500';
            case 'null': return 'text-slate-400';
            default: return 'text-slate-600';
        }
    };

    return (
        <div className="select-none">
            <div
                className={`flex items-center h-7 px-2 hover:bg-slate-100 cursor-pointer rounded transition-colors ${isSelected ? 'bg-blue-50 border-l-2 border-blue-500' : ''}`}
                style={{ paddingLeft: `${node.depth * 20 + 8}px` }}
                onClick={() => onSelect(node.path)}
            >
                {/* Expand/Collapse */}
                {hasChildren ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggle(node.path); }}
                        className="w-4 h-4 flex items-center justify-center mr-1 text-slate-400 hover:text-blue-600"
                    >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                ) : (
                    <span className="w-4 h-4 mr-1" />
                )}

                {/* Key */}
                <span className="text-blue-600 font-medium text-sm">{node.key}</span>
                <span className="text-slate-400 mx-1">:</span>

                {/* Type badge */}
                <span className={`text-xs px-1.5 py-0.5 rounded ${getTypeColor()} bg-slate-100 mr-2`}>
                    {node.type}
                </span>

                {/* Value preview */}
                <span className="text-sm text-slate-600 truncate">
                    {renderValue()}
                </span>
            </div>

            {/* Children */}
            {hasChildren && isExpanded && (
                <div>
                    {node.children!.map((child, idx) => (
                        <TreeNodeComponent
                            key={`${child.path}-${idx}`}
                            node={child}
                            expandedPaths={expandedPaths}
                            onToggle={onToggle}
                            selectedPath={selectedPath}
                            onSelect={onSelect}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// Node View Component - shows details of selected node
interface NodeViewProps {
    node: TreeNode | null;
    json: unknown;
}

const NodeView: React.FC<NodeViewProps> = ({ node }) => {
    const [copied, setCopied] = useState(false);

    if (!node) {
        return (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                Select a node from the tree to view details
            </div>
        );
    }

    const copyValue = () => {
        const value = node.type === 'object' || node.type === 'array'
            ? JSON.stringify(node.value, null, 2)
            : String(node.value);
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex-1 p-4 overflow-auto">
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800">{node.key}</h3>
                    <button
                        onClick={copyValue}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                        {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                </div>

                {/* Path */}
                <div className="text-xs text-slate-500 font-mono bg-slate-50 px-3 py-2 rounded">
                    {node.path}
                </div>

                {/* Type and Value */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-500 uppercase">Type:</span>
                        <span className={`text-sm font-medium ${node.type === 'string' ? 'text-green-600' : node.type === 'number' ? 'text-orange-600' : node.type === 'boolean' ? 'text-purple-600' : 'text-blue-600'}`}>
                            {node.type}
                        </span>
                    </div>

                    {(node.type === 'object' || node.type === 'array') ? (
                        <div>
                            <span className="text-xs font-medium text-slate-500 uppercase">
                                {node.type === 'array' ? 'Items:' : 'Properties:'}
                            </span>
                            <span className="ml-2 text-sm">{node.children?.length}</span>
                            <pre className="mt-2 p-3 bg-slate-50 rounded text-sm font-mono overflow-auto max-h-64">
                                {JSON.stringify(node.value, null, 2)}
                            </pre>
                        </div>
                    ) : (
                        <div>
                            <span className="text-xs font-medium text-slate-500 uppercase">Value:</span>
                            <div className="mt-1 p-3 bg-slate-50 rounded text-sm font-mono">
                                {node.type === 'string' ? `"${node.value}"` : String(node.value)}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface JsonFormatterPageProps {
    initialJson?: string;
}

// Helper: recursive find node
function findNode(node: TreeNode | null, path: string): TreeNode | null {
    if (!node) return null;
    if (node.path === path) return node;
    if (node.children) {
        for (const child of node.children) {
            const found = findNode(child, path);
            if (found) return found;
        }
    }
    return null;
}

export default function JsonFormatterPage({ initialJson }: JsonFormatterPageProps) {
    const [jsonInput, setJsonInput] = useState(initialJson || '{\n  "name": "John Doe",\n  "age": 30,\n  "email": "john@example.com",\n  "isActive": true,\n  "address": {\n    "street": "123 Main St",\n    "city": "New York",\n    "country": "USA"\n  },\n  "hobbies": ["reading", "coding", "gaming"],\n  "metadata": null\n}');
    const [viewMode, setViewMode] = useState<ViewMode>('formatted');
    // Error state not used in UI currently, handled in useMemo
    const [copied, setCopied] = useState(false);
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['root']));
    const [selectedPath, setSelectedPath] = useState<string | null>(null);

    // Parse JSON
    const parsed = useMemo(() => {
        if (!jsonInput.trim()) return { success: false, error: 'Empty input', data: null };
        try {
            const data = JSON.parse(jsonInput);
            return { success: true, error: null, data };
        } catch (e) {
            return { success: false, error: (e as Error).message, data: null };
        }
    }, [jsonInput]);

    // Format output based on mode
    const formatted = useMemo(() => {
        if (!parsed.success || !parsed.data) return '';
        switch (viewMode) {
            case 'formatted':
                return JSON.stringify(parsed.data, null, 2);
            case 'minified':
                return JSON.stringify(parsed.data);
            default:
                return '';
        }
    }, [parsed, viewMode]);

    // Build tree
    const tree = useMemo(() => {
        if (!parsed.success || !parsed.data) return null;
        return buildTree(parsed.data);
    }, [parsed]);

    // Find node by path
    // findNode moved to module scope

    const selectedNode = useMemo(() => {
        if (!tree || !selectedPath) return null;
        return findNode(tree, selectedPath);
    }, [tree, selectedPath]);

    const toggleExpand = useCallback((path: string) => {
        setExpandedPaths(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    }, []);

    const expandAll = useCallback(() => {
        if (!tree) return;
        const paths = new Set<string>();
        const collect = (node: TreeNode) => {
            paths.add(node.path);
            node.children?.forEach(collect);
        };
        collect(tree);
        setExpandedPaths(paths);
    }, [tree]);

    const collapseAll = useCallback(() => {
        setExpandedPaths(new Set(['root']));
    }, []);

    const formatInput = () => {
        if (parsed.success && parsed.data) {
            setJsonInput(JSON.stringify(parsed.data, null, 2));
        }
    };

    const minifyInput = () => {
        if (parsed.success && parsed.data) {
            setJsonInput(JSON.stringify(parsed.data));
        }
    };

    const copyOutput = () => {
        if (formatted) {
            navigator.clipboard.writeText(formatted);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const clearInput = () => {
        setJsonInput('');
    };

    // Syntax highlighting for formatted view (light theme)
    const highlightJson = (content: string) => {
        return content.replace(
            /("(?:[^"\\]|\\.)*")\s*(:)?|(\d+\.?\d*)|(\btrue\b|\bfalse\b)|(\bnull\b)|([{}[\],])/g,
            (match, str, colon, num, bool, nul, bracket) => {
                if (str && colon) {
                    return `<span class="text-blue-600">${str}</span><span class="text-slate-500">:</span>`;
                } else if (str) {
                    return `<span class="text-green-600">${str}</span>`;
                } else if (num) {
                    return `<span class="text-orange-600">${num}</span>`;
                } else if (bool) {
                    return `<span class="text-purple-600">${bool}</span>`;
                } else if (nul) {
                    return `<span class="text-slate-500">${nul}</span>`;
                } else if (bracket) {
                    return `<span class="text-slate-600">${bracket}</span>`;
                }
                return match;
            }
        );
    };

    // Syntax highlighting for dark theme
    const highlightJsonDark = (content: string) => {
        return content.replace(
            /("(?:[^"\\]|\\.)*")\s*(:)?|(\d+\.?\d*)|(\btrue\b|\bfalse\b)|(\bnull\b)|([{}[\],])/g,
            (match, str, colon, num, bool, nul, bracket) => {
                if (str && colon) {
                    return `<span class="text-sky-400">${str}</span><span class="text-slate-400">:</span>`;
                } else if (str) {
                    return `<span class="text-emerald-400">${str}</span>`;
                } else if (num) {
                    return `<span class="text-amber-400">${num}</span>`;
                } else if (bool) {
                    return `<span class="text-violet-400">${bool}</span>`;
                } else if (nul) {
                    return `<span class="text-slate-500">${nul}</span>`;
                } else if (bracket) {
                    return `<span class="text-slate-300">${bracket}</span>`;
                }
                return match;
            }
        );
    };

    const viewModes: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
        { id: 'formatted', label: 'Formatted', icon: <Code2 size={16} /> },
        { id: 'tree', label: 'Tree View', icon: <TreePine size={16} /> },
        { id: 'minified', label: 'Minified', icon: <Minus size={16} /> },
        { id: 'node', label: 'Node View', icon: <List size={16} /> }
    ];

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {/* Toolbar */}
            <div className="flex-shrink-0 border-b border-slate-200 px-4 py-2 flex items-center bg-slate-50">
                {/* Left actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={formatInput}
                        disabled={!parsed.success}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors disabled:opacity-40"
                    >
                        <Code2 size={14} /> Prettify
                    </button>
                    <button
                        onClick={minifyInput}
                        disabled={!parsed.success}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors disabled:opacity-40"
                    >
                        <Minus size={14} /> Minify
                    </button>
                    <button
                        onClick={clearInput}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                        <Trash2 size={14} /> Clear
                    </button>
                </div>

                {/* Spacer */}
                <div className="grow-[2]" />

                {/* View Mode Tabs - centered */}
                <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-1">
                    {viewModes.map(mode => (
                        <button
                            key={mode.id}
                            onClick={() => setViewMode(mode.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors ${viewMode === mode.id
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            {mode.icon}
                            <span className="hidden sm:inline">{mode.label}</span>
                        </button>
                    ))}
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Right actions - always same width */}
                <div className="flex items-center gap-2 w-[140px] justify-end">
                    <button
                        onClick={expandAll}
                        disabled={viewMode !== 'tree' && viewMode !== 'node'}
                        className={`px-2 py-1 text-xs font-medium rounded transition-colors ${viewMode === 'tree' || viewMode === 'node'
                            ? 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                            : 'text-transparent pointer-events-none'
                            }`}
                    >
                        Expand All
                    </button>
                    <button
                        onClick={collapseAll}
                        disabled={viewMode !== 'tree' && viewMode !== 'node'}
                        className={`px-2 py-1 text-xs font-medium rounded transition-colors ${viewMode === 'tree' || viewMode === 'node'
                            ? 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                            : 'text-transparent pointer-events-none'
                            }`}
                    >
                        Collapse All
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {!parsed.success && jsonInput.trim() && (
                <div className="flex-shrink-0 bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2 text-red-700">
                    <AlertCircle size={16} />
                    <span className="text-sm font-medium">Invalid JSON: {parsed.error}</span>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Input Panel */}
                <div className="w-1/2 flex flex-col border-r border-slate-200">
                    <div className="flex-shrink-0 px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Input JSON</span>
                        <span className="text-xs text-slate-400">
                            {parsed.success ? `✓ Valid JSON` : 'Paste your JSON here'}
                        </span>
                    </div>
                    <textarea
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        className="flex-1 w-full p-4 font-mono text-sm bg-white border-0 resize-none text-slate-700 focus:outline-none"
                        spellCheck={false}
                        placeholder='{"key": "value"}'
                    />
                </div>

                {/* Output Panel */}
                <div className="w-1/2 flex flex-col">
                    <div className="flex-shrink-0 px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            {viewMode === 'formatted' ? 'Formatted Output' :
                                viewMode === 'minified' ? 'Minified Output' :
                                    viewMode === 'tree' ? 'Tree View' : 'Node View'}
                        </span>
                        {(viewMode === 'formatted' || viewMode === 'minified') && (
                            <button
                                onClick={copyOutput}
                                disabled={!formatted}
                                className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-40"
                            >
                                {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        )}
                    </div>

                    {/* View Content */}
                    {viewMode === 'formatted' && parsed.success && (
                        <div className="flex-1 overflow-auto bg-slate-900">
                            <div className="min-w-fit">
                                {formatted.split('\n').map((line, idx) => (
                                    <div key={idx} className="flex hover:bg-slate-800/50 group">
                                        <span className="w-12 flex-shrink-0 text-right pr-4 py-0.5 text-xs text-slate-500 select-none bg-slate-900 border-r border-slate-700 group-hover:text-slate-400">
                                            {idx + 1}
                                        </span>
                                        <pre className="flex-1 m-0 py-0.5 pl-4 text-sm font-mono whitespace-pre">
                                            <code dangerouslySetInnerHTML={{ __html: highlightJsonDark(line) || '\u00A0' }} />
                                        </pre>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {viewMode === 'minified' && parsed.success && (
                        <div className="flex-1 overflow-auto p-4 bg-slate-50">
                            <pre className="font-mono text-sm whitespace-pre-wrap break-all">
                                <code dangerouslySetInnerHTML={{ __html: highlightJson(formatted) }} />
                            </pre>
                        </div>
                    )}

                    {viewMode === 'tree' && parsed.success && tree && (
                        <div className="flex-1 overflow-auto py-2">
                            <TreeNodeComponent
                                node={tree}
                                expandedPaths={expandedPaths}
                                onToggle={toggleExpand}
                                selectedPath={selectedPath}
                                onSelect={setSelectedPath}
                            />
                        </div>
                    )}

                    {viewMode === 'node' && (
                        <div className="flex-1 flex overflow-hidden">
                            {/* Tree sidebar */}
                            <div className="w-1/2 border-r border-slate-200 overflow-auto py-2">
                                {parsed.success && tree && (
                                    <TreeNodeComponent
                                        node={tree}
                                        expandedPaths={expandedPaths}
                                        onToggle={toggleExpand}
                                        selectedPath={selectedPath}
                                        onSelect={setSelectedPath}
                                    />
                                )}
                            </div>
                            {/* Node details */}
                            <NodeView node={selectedNode} json={parsed.data} />
                        </div>
                    )}

                    {!parsed.success && (
                        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                            Enter valid JSON to see output
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
