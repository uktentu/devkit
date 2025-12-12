import { useState, useMemo } from 'react';
import {
    Search,
    Type,
    FileText,
    Copy,
    Check,
    AlertCircle,
    Trash2
} from 'lucide-react';

type ToolTab = 'regex' | 'case' | 'markdown';

// --- Regex Tester ---
function RegexTester() {
    const [pattern, setPattern] = useState('');
    const [flags, setFlags] = useState('g');
    const [testString, setTestString] = useState('Hello World! hello world! HELLO WORLD!');
    const [copied, setCopied] = useState(false);

    const result = useMemo(() => {
        if (!pattern) return { valid: true, matches: [], error: null };

        try {
            const regex = new RegExp(pattern, flags);
            const matches: { match: string; index: number; groups?: RegExpMatchArray['groups'] }[] = [];
            let match;

            if (flags.includes('g')) {
                while ((match = regex.exec(testString)) !== null) {
                    matches.push({ match: match[0], index: match.index, groups: match.groups });
                    if (!regex.global) break;
                }
            } else {
                match = regex.exec(testString);
                if (match) {
                    matches.push({ match: match[0], index: match.index, groups: match.groups });
                }
            }

            return { valid: true, matches, error: null };
        } catch (e) {
            return { valid: false, matches: [], error: (e as Error).message };
        }
    }, [pattern, flags, testString]);

    const highlightedText = useMemo(() => {
        if (!pattern || !result.valid || result.matches.length === 0) return testString;

        try {
            const regex = new RegExp(pattern, flags);
            return testString.replace(regex, (match) => `<mark class="bg-yellow-300 px-0.5 rounded">${match}</mark>`);
        } catch {
            return testString;
        }
    }, [pattern, flags, testString, result]);

    const copyPattern = () => {
        navigator.clipboard.writeText(`/${pattern}/${flags}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Pattern Input */}
            <div className="flex-shrink-0 p-4 border-b border-slate-200 space-y-3">
                <div className="flex gap-2">
                    <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                        <span className="px-3 text-slate-400 font-mono">/</span>
                        <input
                            type="text"
                            value={pattern}
                            onChange={(e) => setPattern(e.target.value)}
                            placeholder="Enter regex pattern..."
                            className="flex-1 py-2 bg-transparent font-mono text-sm focus:outline-none"
                        />
                        <span className="px-1 text-slate-400 font-mono">/</span>
                        <input
                            type="text"
                            value={flags}
                            onChange={(e) => setFlags(e.target.value)}
                            placeholder="g"
                            className="w-12 py-2 bg-transparent font-mono text-sm focus:outline-none text-center"
                        />
                    </div>
                    <button
                        onClick={copyPattern}
                        disabled={!pattern}
                        className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40"
                    >
                        {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                    </button>
                </div>

                {!result.valid && (
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                        <AlertCircle size={14} />
                        <span>{result.error}</span>
                    </div>
                )}

                {result.valid && pattern && (
                    <div className="text-sm text-slate-600">
                        <span className="font-medium text-green-600">{result.matches.length}</span> match{result.matches.length !== 1 ? 'es' : ''} found
                    </div>
                )}
            </div>

            {/* Test String & Results */}
            <div className="flex-1 flex overflow-hidden">
                <div className="w-1/2 flex flex-col border-r border-slate-200">
                    <div className="flex-shrink-0 px-4 py-2 border-b border-slate-100 bg-slate-50/50">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Test String</span>
                    </div>
                    <textarea
                        value={testString}
                        onChange={(e) => setTestString(e.target.value)}
                        className="flex-1 p-4 font-mono text-sm resize-none focus:outline-none"
                        placeholder="Enter text to test against..."
                    />
                </div>
                <div className="w-1/2 flex flex-col">
                    <div className="flex-shrink-0 px-4 py-2 border-b border-slate-100 bg-slate-50/50">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Highlighted Matches</span>
                    </div>
                    <div className="flex-1 p-4 overflow-auto bg-slate-50">
                        <div
                            className="font-mono text-sm whitespace-pre-wrap"
                            dangerouslySetInnerHTML={{ __html: highlightedText }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Extracted component
const CaseRow = ({ label, value, copied, onCopy }: { label: string; value: string; copied: string | null; onCopy: (v: string, l: string) => void }) => (
    <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
        <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-slate-500 mb-0.5">{label}</div>
            <div className="font-mono text-sm text-slate-800 truncate">{value}</div>
        </div>
        <button
            onClick={() => onCopy(value, label)}
            className="ml-2 p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors flex-shrink-0"
        >
            {copied === label ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
        </button>
    </div>
);

// --- Case Converter ---
function CaseConverter() {
    const [input, setInput] = useState('hello world example text');
    const [copied, setCopied] = useState<string | null>(null);

    const conversions = useMemo(() => {
        const text = input || '';
        return {
            uppercase: text.toUpperCase(),
            lowercase: text.toLowerCase(),
            titleCase: text.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase()),
            sentenceCase: text.charAt(0).toUpperCase() + text.slice(1).toLowerCase(),
            camelCase: text.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase()),
            pascalCase: text.toLowerCase().replace(/(^|[^a-zA-Z0-9]+)(.)/g, (_, __, c) => c.toUpperCase()),
            snakeCase: text.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
            kebabCase: text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
            constantCase: text.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, ''),
            dotCase: text.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '')
        };
    }, [input]);

    const copyToClipboard = (value: string, label: string) => {
        navigator.clipboard.writeText(value);
        setCopied(label);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Input */}
            <div className="flex-shrink-0 p-4 border-b border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                    <Type size={16} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-600">Input Text</span>
                    <button
                        onClick={() => setInput('')}
                        className="ml-auto p-1 text-slate-400 hover:text-red-500 rounded"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    rows={3}
                    placeholder="Enter text to convert..."
                />
            </div>

            {/* Conversions */}
            <div className="flex-1 overflow-auto p-4">
                <div className="grid grid-cols-2 gap-2">
                    <CaseRow label="UPPERCASE" value={conversions.uppercase} copied={copied} onCopy={copyToClipboard} />
                    <CaseRow label="lowercase" value={conversions.lowercase} copied={copied} onCopy={copyToClipboard} />
                    <CaseRow label="Title Case" value={conversions.titleCase} copied={copied} onCopy={copyToClipboard} />
                    <CaseRow label="Sentence case" value={conversions.sentenceCase} copied={copied} onCopy={copyToClipboard} />
                    <CaseRow label="camelCase" value={conversions.camelCase} copied={copied} onCopy={copyToClipboard} />
                    <CaseRow label="PascalCase" value={conversions.pascalCase} copied={copied} onCopy={copyToClipboard} />
                    <CaseRow label="snake_case" value={conversions.snakeCase} copied={copied} onCopy={copyToClipboard} />
                    <CaseRow label="kebab-case" value={conversions.kebabCase} copied={copied} onCopy={copyToClipboard} />
                    <CaseRow label="CONSTANT_CASE" value={conversions.constantCase} copied={copied} onCopy={copyToClipboard} />
                    <CaseRow label="dot.case" value={conversions.dotCase} copied={copied} onCopy={copyToClipboard} />
                </div>
            </div>
        </div>
    );
}

// --- Markdown Previewer ---
function MarkdownPreviewer() {
    const [markdown, setMarkdown] = useState(`# Welcome to Markdown Preview

This is a **bold** text and this is *italic*.

## Features
- Live preview
- Standard markdown support
- Code blocks

### Code Example
\`\`\`javascript
const hello = "world";
console.log(hello);
\`\`\`

> This is a blockquote

[Link example](https://example.com)

| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
`);

    const renderMarkdown = (md: string): string => {
        let html = md
            // Escape HTML
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            // Code blocks
            .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-slate-800 text-slate-100 p-3 rounded-lg overflow-x-auto my-2"><code>$2</code></pre>')
            // Inline code
            .replace(/`([^`]+)`/g, '<code class="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono text-pink-600">$1</code>')
            // Headers
            .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold mt-4 mb-2 text-slate-800">$1</h3>')
            .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-5 mb-2 text-slate-800">$1</h2>')
            .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-3 text-slate-900">$1</h1>')
            // Bold and Italic
            .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold">$1</strong>')
            .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
            // Links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank">$1</a>')
            // Blockquotes
            .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-slate-300 pl-4 py-1 my-2 text-slate-600 italic">$1</blockquote>')
            // Lists
            .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
            // Tables (simple)
            .replace(/\|(.+)\|/g, (match) => {
                const cells = match.split('|').filter(c => c.trim()).map(c => c.trim());
                if (cells.every(c => /^-+$/.test(c))) return '';
                return '<tr>' + cells.map(c => `<td class="border border-slate-200 px-3 py-1">${c}</td>`).join('') + '</tr>';
            })
            // Paragraphs
            .replace(/\n\n/g, '</p><p class="my-2">')
            .replace(/\n/g, '<br/>');

        // Wrap tables
        html = html.replace(/(<tr>[\s\S]*?<\/tr>)+/g, '<table class="border-collapse border border-slate-200 my-3">$&</table>');

        return `<p class="my-2">${html}</p>`;
    };

    const renderedHtml = useMemo(() => renderMarkdown(markdown), [markdown]);

    return (
        <div className="flex-1 flex overflow-hidden">
            {/* Editor */}
            <div className="w-1/2 flex flex-col border-r border-slate-200">
                <div className="flex-shrink-0 px-4 py-2 border-b border-slate-100 bg-slate-50/50">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Markdown</span>
                </div>
                <textarea
                    value={markdown}
                    onChange={(e) => setMarkdown(e.target.value)}
                    className="flex-1 p-4 font-mono text-sm resize-none focus:outline-none"
                    placeholder="Enter markdown..."
                />
            </div>

            {/* Preview */}
            <div className="w-1/2 flex flex-col">
                <div className="flex-shrink-0 px-4 py-2 border-b border-slate-100 bg-slate-50/50">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Preview</span>
                </div>
                <div
                    className="flex-1 p-4 overflow-auto prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />
            </div>
        </div>
    );
}

// --- Main Tools Page ---
export default function ToolsPage() {
    const [activeTab, setActiveTab] = useState<ToolTab>('regex');

    const tabs: { id: ToolTab; label: string; icon: React.ReactNode }[] = [
        { id: 'regex', label: 'Regex Tester', icon: <Search size={16} /> },
        { id: 'case', label: 'Case Converter', icon: <Type size={16} /> },
        { id: 'markdown', label: 'Markdown Preview', icon: <FileText size={16} /> }
    ];

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {/* Tool Tabs */}
            <div className="flex-shrink-0 border-b border-slate-200 px-4 py-2 flex items-center gap-2 bg-slate-50">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === tab.id
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tool Content */}
            {activeTab === 'regex' && <RegexTester />}
            {activeTab === 'case' && <CaseConverter />}
            {activeTab === 'markdown' && <MarkdownPreviewer />}
        </div>
    );
}
