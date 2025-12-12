import React from 'react';
import { AlertCircle, Wand2 } from 'lucide-react';

interface JsonInputProps {
    value: string;
    onChange: (value: string) => void;
    onFormat: () => void;
    error: string | null;
    label: string;
    placeholder?: string;
}

export const JsonInput: React.FC<JsonInputProps> = ({
    value,
    onChange,
    onFormat,
    error,
    label,
    placeholder = 'Paste your JSON here...',
}) => {
    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-300">{label}</h3>
                <button
                    onClick={onFormat}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors duration-150"
                >
                    <Wand2 className="w-3.5 h-3.5" />
                    Format
                </button>
            </div>

            {/* Text Area */}
            <div className="relative flex-1">
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    spellCheck={false}
                    className={`w-full h-full min-h-[200px] p-4 text-sm font-mono bg-slate-900 border-2 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 ${error
                            ? 'border-red-500/50 text-red-300'
                            : 'border-slate-700 text-slate-200 hover:border-slate-600'
                        }`}
                />

                {/* Error Message */}
                {error && (
                    <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-400 bg-red-950/80 border border-red-500/30 rounded-md backdrop-blur-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{error}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
