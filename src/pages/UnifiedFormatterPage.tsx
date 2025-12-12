import { useState, useMemo } from 'react';
import {
    Copy,
    Check,
    Trash2,
    AlertCircle,
    FileJson,
    FileCode,
    Database
} from 'lucide-react';

type FormatType = 'json' | 'xml' | 'sql';

// Format JSON
function formatJson(input: string): { success: boolean; value: string; error: string | null } {
    try {
        const parsed = JSON.parse(input);
        return { success: true, value: JSON.stringify(parsed, null, 2), error: null };
    } catch (e) {
        return { success: false, value: '', error: (e as Error).message };
    }
}

// Format XML
function formatXml(input: string): { success: boolean; value: string; error: string | null } {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(input, 'text/xml');

        const parseError = doc.querySelector('parsererror');
        if (parseError) {
            return { success: false, value: '', error: 'Invalid XML' };
        }

        function serializeNode(node: Node, indent: number): string {
            const spaces = '  '.repeat(indent);

            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent?.trim();
                return text || '';
            }

            if (node.nodeType === Node.ELEMENT_NODE) {
                const elem = node as Element;
                const tagName = elem.tagName;

                let attrs = '';
                for (let i = 0; i < elem.attributes.length; i++) {
                    const attr = elem.attributes[i];
                    attrs += ` ${attr.name}="${attr.value}"`;
                }

                const children = Array.from(elem.childNodes);
                const elementChildren = children.filter(n => n.nodeType === Node.ELEMENT_NODE);
                const textChildren = children
                    .filter(n => n.nodeType === Node.TEXT_NODE)
                    .map(n => n.textContent?.trim())
                    .filter(Boolean);

                if (elementChildren.length === 0 && textChildren.length === 0) {
                    return `${spaces}<${tagName}${attrs}/>`;
                }

                if (elementChildren.length === 0 && textChildren.length > 0) {
                    return `${spaces}<${tagName}${attrs}>${textChildren.join('')}</${tagName}>`;
                }

                const childContent = children
                    .map(child => serializeNode(child, indent + 1))
                    .filter(Boolean)
                    .join('\n');

                return `${spaces}<${tagName}${attrs}>\n${childContent}\n${spaces}</${tagName}>`;
            }

            return '';
        }

        const formatted = serializeNode(doc.documentElement, 0);
        return { success: true, value: formatted, error: null };
    } catch (e) {
        return { success: false, value: '', error: (e as Error).message };
    }
}

// Format SQL
function formatSql(input: string): { success: boolean; value: string; error: string | null } {
    try {
        const keywords = [
            'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'INSERT', 'INTO', 'VALUES',
            'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER', 'ADD',
            'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AS', 'ORDER', 'BY',
            'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'ALL', 'DISTINCT',
            'NOT', 'NULL', 'IS', 'IN', 'LIKE', 'BETWEEN', 'EXISTS', 'CASE', 'WHEN',
            'THEN', 'ELSE', 'END', 'ASC', 'DESC', 'PRIMARY', 'KEY', 'FOREIGN',
            'REFERENCES', 'INDEX', 'UNIQUE', 'DEFAULT', 'CHECK', 'CONSTRAINT'
        ];

        let formatted = input.trim();

        // Uppercase keywords
        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            formatted = formatted.replace(regex, keyword);
        });

        // Add newlines before major keywords
        const newlineKeywords = [
            'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'ORDER BY', 'GROUP BY',
            'HAVING', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN',
            'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE',
            'DROP TABLE', 'ALTER TABLE', 'UNION', 'LIMIT', 'OFFSET'
        ];

        newlineKeywords.forEach(keyword => {
            const regex = new RegExp(`\\s*(${keyword})`, 'gi');
            formatted = formatted.replace(regex, `\n${keyword.toUpperCase()}`);
        });

        // Indent after SELECT, FROM, WHERE etc.
        const lines = formatted.split('\n').filter(l => l.trim());
        const result: string[] = [];
        let indent = 0;

        for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed.startsWith('SELECT') || trimmed.startsWith('FROM') ||
                trimmed.startsWith('WHERE') || trimmed.startsWith('SET') ||
                trimmed.startsWith('VALUES')) {
                result.push(trimmed);
                indent = 1;
            } else if (trimmed.startsWith('AND') || trimmed.startsWith('OR')) {
                result.push('  ' + trimmed);
            } else if (trimmed.startsWith('ORDER') || trimmed.startsWith('GROUP') ||
                trimmed.startsWith('HAVING') || trimmed.startsWith('LIMIT')) {
                indent = 0;
                result.push(trimmed);
            } else if (trimmed.match(/^(LEFT|RIGHT|INNER|OUTER|CROSS)?\s*JOIN/i)) {
                result.push(trimmed);
            } else {
                result.push('  '.repeat(indent) + trimmed);
            }
        }

        return { success: true, value: result.join('\n'), error: null };
    } catch (e) {
        return { success: false, value: '', error: (e as Error).message };
    }
}

// Minify functions
function minifyJson(input: string): { success: boolean; value: string; error: string | null } {
    try {
        const parsed = JSON.parse(input);
        return { success: true, value: JSON.stringify(parsed), error: null };
    } catch (e) {
        return { success: false, value: '', error: (e as Error).message };
    }
}

function minifyXml(input: string): { success: boolean; value: string; error: string | null } {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(input, 'text/xml');
        const parseError = doc.querySelector('parsererror');
        if (parseError) {
            return { success: false, value: '', error: 'Invalid XML' };
        }
        const serializer = new XMLSerializer();
        let minified = serializer.serializeToString(doc);
        // Remove extra whitespace
        minified = minified.replace(/>\s+</g, '><').trim();
        return { success: true, value: minified, error: null };
    } catch (e) {
        return { success: false, value: '', error: (e as Error).message };
    }
}

function minifySql(input: string): { success: boolean; value: string; error: string | null } {
    try {
        const minified = input.replace(/\s+/g, ' ').trim();
        return { success: true, value: minified, error: null };
    } catch (e) {
        return { success: false, value: '', error: (e as Error).message };
    }
}

export default function UnifiedFormatterPage() {
    const [input, setInput] = useState('{\n  "name": "John Doe",\n  "age": 30,\n  "email": "john@example.com"\n}');
    const [formatType, setFormatType] = useState<FormatType>('json');
    const [copied, setCopied] = useState(false);

    const formatted = useMemo(() => {
        if (!input.trim()) return { success: true, value: '', error: null };

        switch (formatType) {
            case 'json':
                return formatJson(input);
            case 'xml':
                return formatXml(input);
            case 'sql':
                return formatSql(input);
            default:
                return { success: true, value: input, error: null };
        }
    }, [input, formatType]);

    const minified = useMemo(() => {
        if (!input.trim()) return { success: true, value: '', error: null };

        switch (formatType) {
            case 'json':
                return minifyJson(input);
            case 'xml':
                return minifyXml(input);
            case 'sql':
                return minifySql(input);
            default:
                return { success: true, value: input, error: null };
        }
    }, [input, formatType]);

    const copyFormatted = () => {
        if (formatted.value) {
            navigator.clipboard.writeText(formatted.value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const applyFormatted = () => {
        if (formatted.success && formatted.value) {
            setInput(formatted.value);
        }
    };

    const applyMinified = () => {
        if (minified.success && minified.value) {
            setInput(minified.value);
        }
    };

    const loadSample = () => {
        switch (formatType) {
            case 'json':
                setInput('{\n  "name": "John Doe",\n  "age": 30,\n  "email": "john@example.com",\n  "address": {\n    "city": "New York",\n    "country": "USA"\n  }\n}');
                break;
            case 'xml':
                setInput('<person><name>John Doe</name><age>30</age><email>john@example.com</email><address><city>New York</city><country>USA</country></address></person>');
                break;
            case 'sql':
                setInput('SELECT u.id, u.name, u.email, o.order_id, o.total FROM users u LEFT JOIN orders o ON u.id = o.user_id WHERE u.status = \'active\' AND o.created_at > \'2024-01-01\' ORDER BY o.created_at DESC LIMIT 100');
                break;
        }
    };

    const formatTypes: { id: FormatType; label: string; icon: React.ReactNode }[] = [
        { id: 'json', label: 'JSON', icon: <FileJson size={16} /> },
        { id: 'xml', label: 'XML', icon: <FileCode size={16} /> },
        { id: 'sql', label: 'SQL', icon: <Database size={16} /> }
    ];

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {/* Toolbar */}
            <div className="flex-shrink-0 border-b border-slate-200 px-4 py-2 flex items-center gap-4 bg-slate-50">
                {/* Format Type Selector */}
                <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-1">
                    {formatTypes.map(type => (
                        <button
                            key={type.id}
                            onClick={() => setFormatType(type.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors ${formatType === type.id
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            {type.icon}
                            {type.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1" />

                <button
                    onClick={loadSample}
                    className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors"
                >
                    Load Sample
                </button>

                <button
                    onClick={applyFormatted}
                    disabled={!formatted.success}
                    className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-40"
                >
                    Prettify
                </button>

                <button
                    onClick={applyMinified}
                    disabled={!minified.success}
                    className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors disabled:opacity-40"
                >
                    Minify
                </button>

                <button
                    onClick={() => setInput('')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                    <Trash2 size={14} /> Clear
                </button>
            </div>

            {/* Error Banner */}
            {!formatted.success && input.trim() && (
                <div className="flex-shrink-0 bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2 text-red-700">
                    <AlertCircle size={16} />
                    <span className="text-sm font-medium">{formatted.error}</span>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Input Panel */}
                <div className="w-1/2 flex flex-col border-r border-slate-200">
                    <div className="flex-shrink-0 px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Input</span>
                        <span className="text-xs text-slate-400">{input.length} chars</span>
                    </div>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="flex-1 w-full p-4 font-mono text-sm bg-white border-0 resize-none text-slate-700 focus:outline-none"
                        spellCheck={false}
                        placeholder={`Enter ${formatType.toUpperCase()} to format...`}
                    />
                </div>

                {/* Output Panel */}
                <div className="w-1/2 flex flex-col">
                    <div className="flex-shrink-0 px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Formatted Output</span>
                        <button
                            onClick={copyFormatted}
                            disabled={!formatted.value}
                            className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-40"
                        >
                            {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>

                    {formatted.success ? (
                        <div className="flex-1 overflow-auto bg-slate-900">
                            <pre className="p-4 font-mono text-sm text-slate-100 whitespace-pre">
                                {formatted.value || 'Output will appear here'}
                            </pre>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center bg-slate-50 text-slate-400">
                            Enter valid {formatType.toUpperCase()} to see formatted output
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
