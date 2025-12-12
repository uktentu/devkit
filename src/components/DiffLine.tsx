import { ChevronRight, ChevronDown } from 'lucide-react';
import type { DiffNode } from '../types/diff';
import { DiffType } from '../types/diff';
import { formatValue, getValueClass } from '../utils/jsonDiff';

interface DiffLineProps {
    node: DiffNode;
    side: 'left' | 'right';
    isCollapsed: boolean;
    onToggleCollapse: (path: string) => void;
    lineNumber: number;
}

export const DiffLine: React.FC<DiffLineProps> = ({
    node,
    side,
    isCollapsed,
    onToggleCollapse,
    lineNumber,
}) => {
    const value = side === 'left' ? node.leftValue : node.rightValue;

    const getBgClass = () => {
        switch (node.type) {
            case DiffType.ADDED:
                return side === 'right' ? 'bg-emerald-950/40' : 'bg-transparent';
            case DiffType.REMOVED:
                return side === 'left' ? 'bg-rose-950/40' : 'bg-transparent';
            case DiffType.MODIFIED:
                return 'bg-amber-950/30';
            case DiffType.SPACER:
                return 'bg-slate-900/50';
            default:
                return 'bg-transparent hover:bg-slate-800/30';
        }
    };

    const getTextClass = () => {
        switch (node.type) {
            case DiffType.ADDED:
                return side === 'right' ? 'text-emerald-300' : 'text-slate-700';
            case DiffType.REMOVED:
                return side === 'left' ? 'text-rose-300' : 'text-slate-700';
            case DiffType.MODIFIED:
                return 'text-amber-300';
            case DiffType.SPACER:
                return 'text-transparent';
            default:
                return 'text-slate-400';
        }
    };

    const getIndicatorClass = () => {
        switch (node.type) {
            case DiffType.ADDED:
                return side === 'right' ? 'bg-emerald-500' : 'bg-transparent';
            case DiffType.REMOVED:
                return side === 'left' ? 'bg-rose-500' : 'bg-transparent';
            case DiffType.MODIFIED:
                return 'bg-amber-500';
            default:
                return 'bg-transparent';
        }
    };

    // Spacer
    if (node.type === DiffType.SPACER) {
        return (
            <div className={`flex items-center h-5 ${getBgClass()}`}>
                <div className="w-8 flex-shrink-0 text-right pr-2 text-[10px] text-slate-700 select-none">
                    {lineNumber}
                </div>
                <div className="w-0.5 h-full bg-transparent flex-shrink-0" />
                <div className="flex-1 px-2">&nbsp;</div>
            </div>
        );
    }

    // Closing bracket
    if (node.isClosingBracket) {
        const bracket = node.bracketType === 'array' ? ']' : '}';
        return (
            <div className={`flex items-center h-5 ${getBgClass()} diff-line`}>
                <div className="w-8 flex-shrink-0 text-right pr-2 text-[10px] text-slate-600 select-none">
                    {lineNumber}
                </div>
                <div className={`w-0.5 h-full ${getIndicatorClass()} flex-shrink-0`} />
                <div className={`flex-1 px-2 font-mono text-xs ${getTextClass()}`}>
                    <span style={{ paddingLeft: `${node.indent * 12}px` }}>{bracket}</span>
                </div>
            </div>
        );
    }

    const renderValue = () => {
        if (value === undefined) return null;

        if (value === '{' || value === '[') {
            return (
                <span className={getTextClass()}>
                    {node.key && (
                        <>
                            <span className="json-key">"{node.key}"</span>
                            <span className="text-slate-500">: </span>
                        </>
                    )}
                    {node.isArrayItem && node.arrayIndex !== undefined && (
                        <span className="text-slate-600 mr-1 text-[10px]">{node.arrayIndex}</span>
                    )}
                    {value}
                    {isCollapsed && <span className="text-slate-600 ml-1">...</span>}
                </span>
            );
        }

        const formattedValue = formatValue(value);
        const valueClass = getValueClass(value);
        const valueHighlight = node.type === DiffType.MODIFIED
            ? 'bg-amber-500/20 px-0.5 rounded-sm'
            : '';

        return (
            <span className={getTextClass()}>
                {node.key && (
                    <>
                        <span className={node.type === DiffType.ADDED || node.type === DiffType.REMOVED ? getTextClass() : 'json-key'}>
                            "{node.key}"
                        </span>
                        <span className="text-slate-500">: </span>
                    </>
                )}
                {node.isArrayItem && node.arrayIndex !== undefined && !node.key && (
                    <span className="text-slate-600 mr-1 text-[10px]">{node.arrayIndex}</span>
                )}
                <span className={`${valueClass} ${valueHighlight}`}>{formattedValue}</span>
            </span>
        );
    };

    const showCollapseToggle = node.isCollapsible && (value === '{' || value === '[');

    return (
        <div className={`flex items-center h-5 ${getBgClass()} diff-line group`}>
            <div className="w-8 flex-shrink-0 text-right pr-2 text-[10px] text-slate-600 select-none">
                {lineNumber}
            </div>
            <div className={`w-0.5 h-full ${getIndicatorClass()} flex-shrink-0`} />
            <div className="flex-1 px-2 font-mono text-xs overflow-hidden">
                <span
                    className="inline-flex items-center"
                    style={{ paddingLeft: `${node.indent * 12}px` }}
                >
                    {showCollapseToggle && (
                        <button
                            onClick={() => onToggleCollapse(node.path)}
                            className="w-3 h-3 flex items-center justify-center mr-0.5 text-slate-600 hover:text-slate-400 transition-colors"
                        >
                            {isCollapsed ? (
                                <ChevronRight className="w-2.5 h-2.5" />
                            ) : (
                                <ChevronDown className="w-2.5 h-2.5" />
                            )}
                        </button>
                    )}
                    {renderValue()}
                </span>
            </div>
        </div>
    );
};
