import { useState, useMemo } from 'react';
import {
    ArrowLeftRight,
    Copy,
    Check,
    Trash2,
    AlertCircle,
    FileText,
    Settings
} from 'lucide-react';

type ConversionMode = 'yaml-to-props' | 'props-to-yaml';

// Simple YAML parser (handles common Spring Boot YAML patterns)
function parseYaml(yaml: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = yaml.split('\n');
    const stack: { indent: number; key: string }[] = [];

    for (const line of lines) {
        // Skip empty lines and comments
        if (!line.trim() || line.trim().startsWith('#')) continue;

        const indent = line.search(/\S/);
        const content = line.trim();

        // Handle array items (- value)
        if (content.startsWith('- ')) {
            const arrayValue = content.substring(2).trim();
            if (stack.length > 0) {
                const parentKey = stack.map(s => s.key).join('.');
                // Find existing array index
                let index = 0;
                while (result[`${parentKey}[${index}]`] !== undefined) {
                    index++;
                }

                if (arrayValue.includes(':')) {
                    // Nested object in array
                    const [key, value] = arrayValue.split(':').map(s => s.trim());
                    result[`${parentKey}[${index}].${key}`] = value.replace(/^["']|["']$/g, '');
                } else {
                    result[`${parentKey}[${index}]`] = arrayValue.replace(/^["']|["']$/g, '');
                }
            }
            continue;
        }

        // Pop stack to current indent level
        while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
            stack.pop();
        }

        // Parse key: value
        const colonIndex = content.indexOf(':');
        if (colonIndex === -1) continue;

        const key = content.substring(0, colonIndex).trim();
        const value = content.substring(colonIndex + 1).trim();

        if (value === '' || value === '|' || value === '>') {
            // This is a parent key
            stack.push({ indent, key });
        } else {
            // This is a leaf value
            const fullKey = [...stack.map(s => s.key), key].join('.');
            result[fullKey] = value.replace(/^["']|["']$/g, '');
        }
    }

    return result;
}

// Convert flat properties to YAML
function propsToYaml(props: string): string {
    const lines = props.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
    const tree: Record<string, unknown> = {};

    for (const line of lines) {
        const eqIndex = line.indexOf('=');
        if (eqIndex === -1) continue;

        const key = line.substring(0, eqIndex).trim();
        const value = line.substring(eqIndex + 1).trim();

        // Handle array notation like server.ports[0]=8080
        const parts = key.split(/\.|\[/).map(p => p.replace(/\]$/, ''));

        let current: Record<string, unknown> = tree;
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!current[part]) {
                // Check if next part is a number (array)
                const nextPart = parts[i + 1];
                current[part] = /^\d+$/.test(nextPart) ? [] : {};
            }
            current = current[part] as Record<string, unknown>;
        }

        const lastPart = parts[parts.length - 1];
        // Try to parse as number or boolean
        if (value === 'true') {
            current[lastPart] = true;
        } else if (value === 'false') {
            current[lastPart] = false;
        } else if (/^-?\d+$/.test(value)) {
            current[lastPart] = parseInt(value, 10);
        } else if (/^-?\d+\.\d+$/.test(value)) {
            current[lastPart] = parseFloat(value);
        } else {
            current[lastPart] = value;
        }
    }

    // Convert tree to YAML
    function toYaml(obj: unknown, indent = 0): string {
        const spaces = '  '.repeat(indent);

        if (Array.isArray(obj)) {
            return obj.map(item => {
                if (typeof item === 'object' && item !== null) {
                    const firstLine = toYaml(item, indent + 1).split('\n')[0];
                    const rest = toYaml(item, indent + 1).split('\n').slice(1).join('\n');
                    return `${spaces}- ${firstLine.trim()}${rest ? '\n' + rest : ''}`;
                }
                return `${spaces}- ${item}`;
            }).join('\n');
        }

        if (typeof obj === 'object' && obj !== null) {
            return Object.entries(obj).map(([key, value]) => {
                if (typeof value === 'object' && value !== null) {
                    return `${spaces}${key}:\n${toYaml(value, indent + 1)}`;
                }
                return `${spaces}${key}: ${value}`;
            }).join('\n');
        }

        return String(obj);
    }

    return toYaml(tree);
}

// Convert YAML to properties format
function yamlToProps(yaml: string): string {
    const parsed = parseYaml(yaml);
    return Object.entries(parsed)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
}

export default function YamlPropsPage() {
    const [input, setInput] = useState(`# Spring Boot Application Configuration
server:
  port: 8080
  servlet:
    context-path: /api

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/mydb
    username: root
    password: secret
    driver-class-name: com.mysql.cj.jdbc.Driver
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
    
logging:
  level:
    root: INFO
    org.springframework: DEBUG
    
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics`);
    const [mode, setMode] = useState<ConversionMode>('yaml-to-props');
    const [copied, setCopied] = useState(false);

    const result = useMemo(() => {
        if (!input.trim()) return { success: true, value: '', error: null };

        try {
            if (mode === 'yaml-to-props') {
                const props = yamlToProps(input);
                return { success: true, value: props, error: null };
            } else {
                const yaml = propsToYaml(input);
                return { success: true, value: yaml, error: null };
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
            setMode(mode === 'yaml-to-props' ? 'props-to-yaml' : 'yaml-to-props');
        }
    };

    const clear = () => {
        setInput('');
    };

    const loadSampleYaml = () => {
        setInput(`# Spring Boot Application Configuration
server:
  port: 8080
  servlet:
    context-path: /api

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/mydb
    username: root
    password: secret
    driver-class-name: com.mysql.cj.jdbc.Driver
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
    
logging:
  level:
    root: INFO
    org.springframework: DEBUG`);
        setMode('yaml-to-props');
    };

    const loadSampleProps = () => {
        setInput(`# Spring Boot Application Properties
server.port=8080
server.servlet.context-path=/api

spring.datasource.url=jdbc:mysql://localhost:3306/mydb
spring.datasource.username=root
spring.datasource.password=secret
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true

logging.level.root=INFO
logging.level.org.springframework=DEBUG`);
        setMode('props-to-yaml');
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {/* Toolbar */}
            <div className="flex-shrink-0 border-b border-slate-200 px-6 py-3 flex items-center gap-4 bg-slate-50">
                <div className="flex items-center gap-2">
                    <Settings size={18} className="text-slate-500" />
                    <span className="font-medium text-slate-700">YAML ↔ Properties</span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Spring Boot</span>
                </div>

                <div className="flex-1" />

                {/* Mode Toggle */}
                <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-1">
                    <button
                        onClick={() => setMode('yaml-to-props')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors ${mode === 'yaml-to-props'
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        YAML → .properties
                    </button>
                    <button
                        onClick={() => setMode('props-to-yaml')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors ${mode === 'props-to-yaml'
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        .properties → YAML
                    </button>
                </div>

                <button
                    onClick={swapValues}
                    disabled={!result.success || !result.value}
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
                <button onClick={loadSampleYaml} className="text-blue-600 hover:underline">application.yml</button>
                <span className="text-slate-300">|</span>
                <button onClick={loadSampleProps} className="text-blue-600 hover:underline">application.properties</button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Input Panel */}
                <div className="w-1/2 flex flex-col border-r border-slate-200">
                    <div className="flex-shrink-0 px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText size={14} className="text-slate-400" />
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                {mode === 'yaml-to-props' ? 'application.yml' : 'application.properties'}
                            </span>
                        </div>
                        <span className="text-xs text-slate-400">
                            {input.split('\n').length} lines
                        </span>
                    </div>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="flex-1 w-full p-4 font-mono text-sm bg-white border-0 resize-none text-slate-700 focus:outline-none"
                        spellCheck={false}
                        placeholder={mode === 'yaml-to-props' ? 'Enter YAML...' : 'Enter properties...'}
                    />
                </div>

                {/* Output Panel */}
                <div className="w-1/2 flex flex-col">
                    <div className="flex-shrink-0 px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText size={14} className="text-slate-400" />
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                {mode === 'yaml-to-props' ? 'application.properties' : 'application.yml'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {result.success && (
                                <span className="text-xs text-slate-400">
                                    {result.value.split('\n').filter(l => l.trim()).length} lines
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

            {/* Info Footer */}
            <div className="flex-shrink-0 border-t border-slate-200 px-6 py-2 bg-slate-50 text-xs text-slate-500">
                <span className="font-medium">Tip:</span> Supports nested properties, arrays, and common Spring Boot configuration patterns.
            </div>
        </div>
    );
}
