import { useState, useMemo } from 'react';
import {
    Calendar,
    Clock,
    Copy,
    Check,
    RefreshCw,
    ArrowUpDown,
    Globe,
    Plus,
    X
} from 'lucide-react';

type TimeUnit = 'nanoseconds' | 'milliseconds' | 'seconds' | 'datetime';

interface ConversionResult {
    nanoseconds: string;
    milliseconds: string;
    seconds: string;
    datetime: string;
    iso: string;
    relative: string;
}

// Common timezones for quick selection
const COMMON_TIMEZONES = [
    { id: 'UTC', label: 'UTC', offset: 'UTC+0' },
    { id: 'America/New_York', label: 'New York (EST)', offset: 'UTC-5' },
    { id: 'America/Los_Angeles', label: 'Los Angeles (PST)', offset: 'UTC-8' },
    { id: 'America/Chicago', label: 'Chicago (CST)', offset: 'UTC-6' },
    { id: 'Europe/London', label: 'London (GMT)', offset: 'UTC+0' },
    { id: 'Europe/Paris', label: 'Paris (CET)', offset: 'UTC+1' },
    { id: 'Europe/Berlin', label: 'Berlin (CET)', offset: 'UTC+1' },
    { id: 'Asia/Dubai', label: 'Dubai (GST)', offset: 'UTC+4' },
    { id: 'Asia/Kolkata', label: 'India (IST)', offset: 'UTC+5:30' },
    { id: 'Asia/Singapore', label: 'Singapore (SGT)', offset: 'UTC+8' },
    { id: 'Asia/Tokyo', label: 'Tokyo (JST)', offset: 'UTC+9' },
    { id: 'Asia/Shanghai', label: 'Shanghai (CST)', offset: 'UTC+8' },
    { id: 'Australia/Sydney', label: 'Sydney (AEDT)', offset: 'UTC+11' },
    { id: 'Pacific/Auckland', label: 'Auckland (NZDT)', offset: 'UTC+13' },
];

export default function DateConverterPage() {
    const [inputValue, setInputValue] = useState('');
    const [inputType, setInputType] = useState<TimeUnit>('milliseconds');
    const [copied, setCopied] = useState<string | null>(null);
    const [selectedTimezones, setSelectedTimezones] = useState<string[]>(['UTC', 'America/New_York', 'Asia/Kolkata', 'Europe/London']);
    const [showTzPicker, setShowTzPicker] = useState(false);

    const result = useMemo((): ConversionResult | null => {
        if (!inputValue.trim()) return null;

        try {
            let timestampMs: number;

            if (inputType === 'datetime') {
                const date = new Date(inputValue);
                if (isNaN(date.getTime())) return null;
                timestampMs = date.getTime();
            } else if (inputType === 'nanoseconds') {
                const ns = BigInt(inputValue);
                timestampMs = Number(ns / BigInt(1000000));
            } else if (inputType === 'seconds') {
                timestampMs = parseFloat(inputValue) * 1000;
            } else {
                timestampMs = parseFloat(inputValue);
            }

            if (isNaN(timestampMs)) return null;

            const date = new Date(timestampMs);
            const now = Date.now();
            const diff = now - timestampMs;

            let relative = '';
            const absDiff = Math.abs(diff);
            if (absDiff < 60000) {
                relative = diff > 0 ? 'just now' : 'in a moment';
            } else if (absDiff < 3600000) {
                const mins = Math.floor(absDiff / 60000);
                relative = diff > 0 ? `${mins} minute${mins > 1 ? 's' : ''} ago` : `in ${mins} minute${mins > 1 ? 's' : ''}`;
            } else if (absDiff < 86400000) {
                const hours = Math.floor(absDiff / 3600000);
                relative = diff > 0 ? `${hours} hour${hours > 1 ? 's' : ''} ago` : `in ${hours} hour${hours > 1 ? 's' : ''}`;
            } else {
                const days = Math.floor(absDiff / 86400000);
                relative = diff > 0 ? `${days} day${days > 1 ? 's' : ''} ago` : `in ${days} day${days > 1 ? 's' : ''}`;
            }

            return {
                nanoseconds: (BigInt(Math.floor(timestampMs)) * BigInt(1000000)).toString(),
                milliseconds: Math.floor(timestampMs).toString(),
                seconds: (timestampMs / 1000).toFixed(3),
                datetime: date.toLocaleString(),
                iso: date.toISOString(),
                relative
            };
        } catch {
            return null;
        }
    }, [inputValue, inputType]);

    // Get timezone conversions
    const timezoneResults = useMemo(() => {
        if (!result) return [];

        const timestampMs = parseInt(result.milliseconds);
        const date = new Date(timestampMs);

        return selectedTimezones.map(tz => {
            try {
                const formatted = date.toLocaleString('en-US', {
                    timeZone: tz,
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                });

                const tzInfo = COMMON_TIMEZONES.find(t => t.id === tz);

                return {
                    id: tz,
                    label: tzInfo?.label || tz,
                    offset: tzInfo?.offset || '',
                    formatted
                };
            } catch {
                return {
                    id: tz,
                    label: tz,
                    offset: '',
                    formatted: 'Invalid timezone'
                };
            }
        });
    }, [result, selectedTimezones]);

    const copyToClipboard = (value: string, label: string) => {
        navigator.clipboard.writeText(value);
        setCopied(label);
        setTimeout(() => setCopied(null), 2000);
    };

    const setNow = () => {
        if (inputType === 'datetime') {
            setInputValue(new Date().toISOString());
        } else if (inputType === 'nanoseconds') {
            setInputValue((BigInt(Date.now()) * BigInt(1000000)).toString());
        } else if (inputType === 'seconds') {
            setInputValue((Date.now() / 1000).toFixed(3));
        } else {
            setInputValue(Date.now().toString());
        }
    };

    const addTimezone = (tz: string) => {
        if (!selectedTimezones.includes(tz)) {
            setSelectedTimezones([...selectedTimezones, tz]);
        }
        setShowTzPicker(false);
    };

    const removeTimezone = (tz: string) => {
        setSelectedTimezones(selectedTimezones.filter(t => t !== tz));
    };

    const ResultRow = ({ label, value, unit }: { label: string; value: string; unit?: string }) => (
        <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
            <div className="flex-1">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{label}</div>
                <div className="font-mono text-sm text-slate-800 break-all">{value}</div>
                {unit && <div className="text-xs text-slate-400 mt-1">{unit}</div>}
            </div>
            <button
                onClick={() => copyToClipboard(value, label)}
                className="ml-3 p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors flex-shrink-0"
            >
                {copied === label ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
        </div>
    );

    const TimezoneRow = ({ tz }: { tz: { id: string; label: string; offset: string; formatted: string } }) => (
        <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors group">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{tz.label}</span>
                    <span className="text-xs text-slate-400">{tz.offset}</span>
                </div>
                <div className="font-mono text-sm text-slate-800 truncate">{tz.formatted}</div>
            </div>
            <div className="flex items-center gap-1 ml-2">
                <button
                    onClick={() => copyToClipboard(tz.formatted, tz.id)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                    {copied === tz.id ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
                <button
                    onClick={() => removeTimezone(tz.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );

    const inputTypes: { id: TimeUnit; label: string; placeholder: string }[] = [
        { id: 'milliseconds', label: 'Milliseconds', placeholder: '1702393200000' },
        { id: 'seconds', label: 'Seconds', placeholder: '1702393200.000' },
        { id: 'nanoseconds', label: 'Nanoseconds', placeholder: '1702393200000000000' },
        { id: 'datetime', label: 'Date/Time', placeholder: '2024-12-12T12:00:00Z' }
    ];

    const availableTimezones = COMMON_TIMEZONES.filter(tz => !selectedTimezones.includes(tz.id));

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {/* Toolbar */}
            <div className="flex-shrink-0 border-b border-slate-200 px-4 md:px-6 py-3 flex items-center gap-3 md:gap-4 bg-slate-50">
                <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-slate-500" />
                    <span className="font-medium text-slate-700 text-sm md:text-base">Date & Time Helper</span>
                </div>
                <div className="flex-1" />
                <button
                    onClick={setNow}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs md:text-sm font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                    <Clock size={14} /> Now
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto p-4 md:p-6">
                <div className="max-w-2xl mx-auto space-y-6">
                    {/* Input Section */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <ArrowUpDown size={18} className="text-slate-400" />
                            <span className="font-medium text-slate-700">Input</span>
                        </div>

                        {/* Input Type Selector */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {inputTypes.map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => setInputType(type.id)}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${inputType === type.id
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>

                        {/* Input Field */}
                        <div className="relative">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={inputTypes.find(t => t.id === inputType)?.placeholder}
                                className="w-full px-4 py-3 font-mono text-base md:text-lg bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                            {inputValue && (
                                <button
                                    onClick={() => setInputValue('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                                >
                                    <RefreshCw size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Timezone Conversions Section */}
                    {result && (
                        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <Globe size={18} className="text-blue-500" />
                                <span className="font-medium text-slate-700">Timezone Conversions</span>
                                <span className="ml-auto text-xs text-slate-400">{selectedTimezones.length} zones</span>
                            </div>

                            <div className="space-y-2 mb-4">
                                {timezoneResults.map(tz => (
                                    <TimezoneRow key={tz.id} tz={tz} />
                                ))}
                            </div>

                            {/* Add Timezone Button */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowTzPicker(!showTzPicker)}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors w-full justify-center border-2 border-dashed border-blue-200 hover:border-blue-400"
                                >
                                    <Plus size={16} /> Add Timezone
                                </button>

                                {/* Timezone Picker Dropdown */}
                                {showTzPicker && availableTimezones.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-64 overflow-auto">
                                        {availableTimezones.map(tz => (
                                            <button
                                                key={tz.id}
                                                onClick={() => addTimezone(tz.id)}
                                                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center justify-between"
                                            >
                                                <span className="text-slate-700">{tz.label}</span>
                                                <span className="text-xs text-slate-400">{tz.offset}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Timestamp Results Section */}
                    {result && (
                        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
                            <div className="flex items-center gap-2 mb-4">
                                <Clock size={18} className="text-slate-400" />
                                <span className="font-medium text-slate-700">Timestamp Conversions</span>
                                <span className="ml-auto text-sm text-slate-500">{result.relative}</span>
                            </div>

                            <ResultRow label="Nanoseconds" value={result.nanoseconds} unit="ns" />
                            <ResultRow label="Milliseconds" value={result.milliseconds} unit="ms (Unix timestamp)" />
                            <ResultRow label="Seconds" value={result.seconds} unit="s (Unix timestamp)" />
                            <ResultRow label="Local Date/Time" value={result.datetime} />
                            <ResultRow label="ISO 8601" value={result.iso} />
                        </div>
                    )}

                    {/* Empty State */}
                    {!inputValue && (
                        <div className="text-center py-12 text-slate-400">
                            <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                            <p>Enter a timestamp or date to see conversions</p>
                        </div>
                    )}

                    {/* Error State */}
                    {inputValue && !result && (
                        <div className="text-center py-12 text-red-500">
                            <p className="font-medium">Invalid input</p>
                            <p className="text-sm text-slate-500 mt-1">Please enter a valid {inputType}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
