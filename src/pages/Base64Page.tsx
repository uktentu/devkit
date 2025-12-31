import { useState, useMemo } from 'react';
import {
    Lock,
    Unlock,
    Copy,
    Check,
    Trash2,
    ArrowDownUp,
    FileText,
    AlertCircle
} from 'lucide-react';

type Mode = 'encode' | 'decode';

export default function Base64Page() {
    const [inputValue, setInputValue] = useState('');
    const [mode, setMode] = useState<Mode>('encode');
    const [copied, setCopied] = useState(false);

    const result = useMemo(() => {
        if (!inputValue.trim()) return { success: true, value: '', error: null };

        try {
            if (mode === 'encode') {
                // Encode: text to base64
                const encoded = btoa(unescape(encodeURIComponent(inputValue)));
                return { success: true, value: encoded, error: null };
            } else {
                // Decode: base64 to text
                const decoded = decodeURIComponent(escape(atob(inputValue)));
                return { success: true, value: decoded, error: null };
            }
        } catch {
            return {
                success: false,
                value: '',
                error: mode === 'decode' ? 'Invalid Base64 string' : 'Encoding error'
            };
        }
    }, [inputValue, mode]);

    const copyToClipboard = () => {
        if (result.value) {
            navigator.clipboard.writeText(result.value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const swapValues = () => {
        if (result.success && result.value) {
            setInputValue(result.value);
            setMode(mode === 'encode' ? 'decode' : 'encode');
        }
    };

    const clear = () => {
        setInputValue('');
    };

    const stats = useMemo(() => {
        if (!inputValue) return null;
        return {
            inputLength: inputValue.length,
            inputBytes: new Blob([inputValue]).size,
            outputLength: result.value?.length || 0,
            outputBytes: result.value ? new Blob([result.value]).size : 0
        };
    }, [inputValue, result]);

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {/* Toolbar */}
            <div className="flex-shrink-0 border-b border-slate-200 px-4 md:px-6 py-3 flex flex-wrap items-center gap-3 md:gap-4 bg-slate-50">
                <div className="flex items-center gap-2">
                    {mode === 'encode' ? <Lock size={18} className="text-slate-500" /> : <Unlock size={18} className="text-slate-500" />}
                    <span className="font-medium text-slate-700 text-sm md:text-base">Base64 {mode === 'encode' ? 'Encoder' : 'Decoder'}</span>
                </div>

                <div className="flex-1 min-w-0" />

                {/* Mode Toggle */}
                <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-1">
                    <button
                        onClick={() => setMode('encode')}
                        className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium rounded transition-colors ${mode === 'encode'
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        <Lock size={14} /> <span className="hidden sm:inline">Encode</span>
                    </button>
                    <button
                        onClick={() => setMode('decode')}
                        className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium rounded transition-colors ${mode === 'decode'
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        <Unlock size={14} /> <span className="hidden sm:inline">Decode</span>
                    </button>
                </div>

                <button
                    onClick={swapValues}
                    disabled={!result.success || !result.value}
                    className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-40"
                >
                    <ArrowDownUp size={14} /> <span className="hidden sm:inline">Swap</span>
                </button>

                <button
                    onClick={clear}
                    className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                    <Trash2 size={14} /> <span className="hidden sm:inline">Clear</span>
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Input Panel */}
                <div className="w-full md:w-1/2 flex flex-col border-b md:border-b-0 md:border-r border-slate-200 min-h-[150px] md:min-h-0">
                    <div className="flex-shrink-0 px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText size={14} className="text-slate-400" />
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                {mode === 'encode' ? 'Plain Text' : 'Base64 Input'}
                            </span>
                        </div>
                        {stats && (
                            <span className="text-xs text-slate-400">
                                {stats.inputLength} chars
                            </span>
                        )}
                    </div>
                    <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="flex-1 w-full p-3 md:p-4 font-mono text-sm bg-white border-0 resize-none text-slate-700 focus:outline-none"
                        spellCheck={false}
                        placeholder={mode === 'encode' ? 'Enter text to encode...' : 'Enter Base64 string to decode...'}
                    />
                </div>

                {/* Output Panel */}
                <div className="w-full md:w-1/2 flex flex-col min-h-[150px] md:min-h-0">
                    <div className="flex-shrink-0 px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {mode === 'encode' ? <Lock size={14} className="text-slate-400" /> : <Unlock size={14} className="text-slate-400" />}
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                {mode === 'encode' ? 'Base64 Output' : 'Decoded Text'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {stats && result.success && (
                                <span className="text-xs text-slate-400 hidden sm:inline">
                                    {stats.outputLength} chars
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
                        <div className="flex-1 overflow-auto p-3 md:p-4 bg-slate-50">
                            {result.value ? (
                                <pre className="font-mono text-sm whitespace-pre-wrap break-all text-slate-700">
                                    {result.value}
                                </pre>
                            ) : (
                                <div className="flex-1 flex items-center justify-center h-full text-slate-400 text-sm">
                                    {mode === 'encode' ? 'Encoded output will appear here' : 'Decoded output will appear here'}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-4 bg-red-50">
                            <AlertCircle size={32} className="text-red-400 mb-2" />
                            <span className="text-red-600 font-medium">{result.error}</span>
                            <span className="text-sm text-red-500 mt-1">Please check your input</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Info Footer */}
            <div className="flex-shrink-0 border-t border-slate-200 px-4 md:px-6 py-2 bg-slate-50 text-xs text-slate-500">
                <span className="font-medium">Tip:</span> Base64 encoding increases size by ~33%.
            </div>
        </div>
    );
}
