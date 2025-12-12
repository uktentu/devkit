import { useState, useMemo } from 'react';
import {
    ArrowLeftRight,
    Copy,
    Check,
    Trash2,
    Code2,
    AlertCircle,
    FileCode
} from 'lucide-react';

type ConversionMode = 'json-to-xml' | 'xml-to-json' | 'format-xml';

// JSON to XML conversion
function jsonToXml(obj: unknown, rootName = 'root', indent = 0): string {
    const spaces = '  '.repeat(indent);

    if (obj === null) {
        return `${spaces}<${rootName} xsi:nil="true"/>`;
    }

    if (typeof obj !== 'object') {
        return `${spaces}<${rootName}>${escapeXml(String(obj))}</${rootName}>`;
    }

    if (Array.isArray(obj)) {
        if (obj.length === 0) {
            return `${spaces}<${rootName}/>`;
        }
        return obj.map((item) => jsonToXml(item, 'item', indent)).join('\n');
    }

    const entries = Object.entries(obj as Record<string, unknown>);
    if (entries.length === 0) {
        return `${spaces}<${rootName}/>`;
    }

    const children = entries.map(([key, value]) => {
        const safeName = key.replace(/[^a-zA-Z0-9_-]/g, '_');
        if (Array.isArray(value)) {
            const items = value.map(item => jsonToXml(item, safeName, indent + 1)).join('\n');
            return items;
        }
        return jsonToXml(value, safeName, indent + 1);
    }).join('\n');

    return `${spaces}<${rootName}>\n${children}\n${spaces}</${rootName}>`;
}

function escapeXml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// XML to JSON conversion
function xmlToJson(xml: string): unknown {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');

    const parseError = doc.querySelector('parsererror');
    if (parseError) {
        throw new Error('Invalid XML: ' + parseError.textContent);
    }

    function nodeToJson(node: Element): unknown {
        const result: Record<string, unknown> = {};

        // Handle attributes
        if (node.attributes.length > 0) {
            const attrs: Record<string, string> = {};
            for (let i = 0; i < node.attributes.length; i++) {
                const attr = node.attributes[i];
                attrs[`@${attr.name}`] = attr.value;
            }
            Object.assign(result, attrs);
        }

        // Handle child nodes
        const children = Array.from(node.childNodes);
        const textContent = children
            .filter(n => n.nodeType === Node.TEXT_NODE)
            .map(n => n.textContent?.trim())
            .filter(Boolean)
            .join('');

        const elementChildren = children.filter(n => n.nodeType === Node.ELEMENT_NODE) as Element[];

        if (elementChildren.length === 0 && textContent) {
            // Only text content
            if (Object.keys(result).length > 0) {
                result['#text'] = parseValue(textContent);
            } else {
                return parseValue(textContent);
            }
        } else if (elementChildren.length > 0) {
            // Group children by tag name
            const grouped: Record<string, unknown[]> = {};

            for (const child of elementChildren) {
                const name = child.tagName;
                if (!grouped[name]) grouped[name] = [];
                grouped[name].push(nodeToJson(child));
            }

            // Convert to final structure
            for (const [name, values] of Object.entries(grouped)) {
                result[name] = values.length === 1 ? values[0] : values;
            }
        }

        return result;
    }

    function parseValue(val: string): unknown {
        if (val === 'true') return true;
        if (val === 'false') return false;
        if (val === 'null') return null;
        const num = Number(val);
        if (!isNaN(num) && val.trim() !== '') return num;
        return val;
    }

    const root = doc.documentElement;
    const result: Record<string, unknown> = {};
    result[root.tagName] = nodeToJson(root);
    return result;
}

// Format XML
function formatXml(xml: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');

    const parseError = doc.querySelector('parsererror');
    if (parseError) {
        throw new Error('Invalid XML');
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

            // Build attributes string
            let attrs = '';
            for (let i = 0; i < elem.attributes.length; i++) {
                const attr = elem.attributes[i];
                attrs += ` ${attr.name}="${escapeXml(attr.value)}"`;
            }

            // Get children
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

    return serializeNode(doc.documentElement, 0);
}

export default function JsonXmlPage() {
    const [input, setInput] = useState('{\n  "person": {\n    "name": "John Doe",\n    "age": 30,\n    "email": "john@example.com",\n    "active": true,\n    "address": {\n      "city": "New York",\n      "country": "USA"\n    },\n    "hobbies": ["reading", "coding"]\n  }\n}');
    const [mode, setMode] = useState<ConversionMode>('json-to-xml');
    const [copied, setCopied] = useState(false);

    const result = useMemo(() => {
        if (!input.trim()) return { success: true, value: '', error: null };

        try {
            if (mode === 'json-to-xml') {
                const parsed = JSON.parse(input);
                const rootKey = Object.keys(parsed)[0] || 'root';
                const rootValue = parsed[rootKey] ?? parsed;
                const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + jsonToXml(rootValue, rootKey, 0);
                return { success: true, value: xml, error: null };
            } else if (mode === 'xml-to-json') {
                const json = xmlToJson(input);
                return { success: true, value: JSON.stringify(json, null, 2), error: null };
            } else {
                const formatted = formatXml(input);
                return { success: true, value: formatted, error: null };
            }
        } catch (e) {
            return { success: false, value: '', error: (e as Error).message };
        }
    }, [input, mode]);

    const copyToClipboard = () => {
        if (result.value) {
            navigator.clipboard.writeText(result.value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const swapValues = () => {
        if (result.success && result.value) {
            setInput(result.value);
            if (mode === 'json-to-xml') {
                setMode('xml-to-json');
            } else if (mode === 'xml-to-json') {
                setMode('json-to-xml');
            }
        }
    };

    const clear = () => {
        setInput('');
    };

    const loadSampleJson = () => {
        setInput('{\n  "person": {\n    "name": "John Doe",\n    "age": 30,\n    "email": "john@example.com",\n    "active": true,\n    "address": {\n      "city": "New York",\n      "country": "USA"\n    },\n    "hobbies": ["reading", "coding"]\n  }\n}');
        setMode('json-to-xml');
    };

    const loadSampleXml = () => {
        setInput(`<?xml version="1.0" encoding="UTF-8"?>
<person>
  <name>John Doe</name>
  <age>30</age>
  <email>john@example.com</email>
  <active>true</active>
  <address>
    <city>New York</city>
    <country>USA</country>
  </address>
  <hobbies>reading</hobbies>
  <hobbies>coding</hobbies>
</person>`);
        setMode('xml-to-json');
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {/* Toolbar */}
            <div className="flex-shrink-0 border-b border-slate-200 px-6 py-3 flex items-center gap-4 bg-slate-50">
                <div className="flex items-center gap-2">
                    <FileCode size={18} className="text-slate-500" />
                    <span className="font-medium text-slate-700">JSON ↔ XML Converter</span>
                </div>

                <div className="flex-1" />

                {/* Mode Toggle */}
                <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-1">
                    <button
                        onClick={() => setMode('json-to-xml')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors ${mode === 'json-to-xml'
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        JSON → XML
                    </button>
                    <button
                        onClick={() => setMode('xml-to-json')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors ${mode === 'xml-to-json'
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        XML → JSON
                    </button>
                    <button
                        onClick={() => setMode('format-xml')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors ${mode === 'format-xml'
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        <Code2 size={14} /> Format XML
                    </button>
                </div>

                <button
                    onClick={swapValues}
                    disabled={!result.success || !result.value || mode === 'format-xml'}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-40"
                >
                    <ArrowLeftRight size={14} /> Swap
                </button>

                <button
                    onClick={clear}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                    <Trash2 size={14} /> Clear
                </button>
            </div>

            {/* Samples */}
            <div className="flex-shrink-0 border-b border-slate-100 px-6 py-2 bg-slate-50/50 flex items-center gap-2 text-xs">
                <span className="text-slate-500">Load sample:</span>
                <button onClick={loadSampleJson} className="text-blue-600 hover:underline">JSON</button>
                <span className="text-slate-300">|</span>
                <button onClick={loadSampleXml} className="text-blue-600 hover:underline">XML</button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Input Panel */}
                <div className="w-1/2 flex flex-col border-r border-slate-200">
                    <div className="flex-shrink-0 px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            {mode === 'json-to-xml' ? 'JSON Input' : mode === 'xml-to-json' ? 'XML Input' : 'XML Input'}
                        </span>
                        <span className="text-xs text-slate-400">
                            {input.length} chars
                        </span>
                    </div>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="flex-1 w-full p-4 font-mono text-sm bg-white border-0 resize-none text-slate-700 focus:outline-none"
                        spellCheck={false}
                        placeholder={mode === 'json-to-xml' ? 'Enter JSON...' : 'Enter XML...'}
                    />
                </div>

                {/* Output Panel */}
                <div className="w-1/2 flex flex-col">
                    <div className="flex-shrink-0 px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            {mode === 'json-to-xml' ? 'XML Output' : mode === 'xml-to-json' ? 'JSON Output' : 'Formatted XML'}
                        </span>
                        <div className="flex items-center gap-2">
                            {result.success && (
                                <span className="text-xs text-slate-400">
                                    {result.value.length} chars
                                </span>
                            )}
                            <button
                                onClick={copyToClipboard}
                                disabled={!result.value}
                                className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-40"
                            >
                                {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                    </div>

                    {/* Output Content */}
                    {result.success ? (
                        <div className="flex-1 overflow-auto p-4 bg-slate-50">
                            {result.value ? (
                                <pre className="font-mono text-sm whitespace-pre text-slate-700">
                                    {result.value}
                                </pre>
                            ) : (
                                <div className="flex-1 flex items-center justify-center h-full text-slate-400 text-sm">
                                    Output will appear here
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-4 bg-red-50">
                            <AlertCircle size={32} className="text-red-400 mb-2" />
                            <span className="text-red-600 font-medium">Conversion Error</span>
                            <span className="text-sm text-red-500 mt-1 text-center max-w-md">{result.error}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
