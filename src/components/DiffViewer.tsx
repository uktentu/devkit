import { useRef, useCallback, useState, useEffect } from 'react';
import type { DiffNode } from '../types/diff';
import { DiffLine } from './DiffLine';

interface DiffViewerProps {
    leftNodes: DiffNode[];
    rightNodes: DiffNode[];
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ leftNodes, rightNodes }) => {
    const leftPanelRef = useRef<HTMLDivElement>(null);
    const rightPanelRef = useRef<HTMLDivElement>(null);
    const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set());
    const isSyncingRef = useRef(false);
    const scrollTimeoutRef = useRef<number | null>(null);

    // Synchronized scrolling - improved implementation
    const handleScroll = useCallback((source: 'left' | 'right') => {
        if (isSyncingRef.current) return;

        const sourceRef = source === 'left' ? leftPanelRef : rightPanelRef;
        const targetRef = source === 'left' ? rightPanelRef : leftPanelRef;

        if (sourceRef.current && targetRef.current) {
            isSyncingRef.current = true;

            targetRef.current.scrollTop = sourceRef.current.scrollTop;
            targetRef.current.scrollLeft = sourceRef.current.scrollLeft;

            // Clear any existing timeout
            if (scrollTimeoutRef.current) {
                window.clearTimeout(scrollTimeoutRef.current);
            }

            // Reset syncing flag after scroll settles
            scrollTimeoutRef.current = window.setTimeout(() => {
                isSyncingRef.current = false;
            }, 50);
        }
    }, []);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) {
                window.clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    // Toggle collapse for a path
    const handleToggleCollapse = useCallback((path: string) => {
        setCollapsedPaths(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    }, []);

    // Filter nodes based on collapsed state
    const filterNodes = useCallback((nodes: DiffNode[]): DiffNode[] => {
        const result: DiffNode[] = [];

        for (const node of nodes) {
            let shouldSkip = false;
            for (const collapsedPath of collapsedPaths) {
                if (node.path.startsWith(collapsedPath + '.') || node.path.startsWith(collapsedPath + '[')) {
                    shouldSkip = true;
                    break;
                }
            }

            if (shouldSkip) continue;
            if (node.isClosingBracket && collapsedPaths.has(node.path)) continue;

            result.push(node);
        }

        return result;
    }, [collapsedPaths]);

    const filteredLeftNodes = filterNodes(leftNodes);
    const filteredRightNodes = filterNodes(rightNodes);

    return (
        <div className="flex h-full bg-slate-950">
            {/* Left Panel */}
            <div className="flex-1 flex flex-col border-r border-slate-800/30 min-w-0">
                <div className="flex-shrink-0 px-3 py-1 border-b border-slate-800/20 bg-slate-900/30">
                    <span className="text-[9px] font-medium text-slate-600 uppercase tracking-wider">Original</span>
                </div>
                <div
                    ref={leftPanelRef}
                    onScroll={() => handleScroll('left')}
                    className="flex-1 overflow-auto diff-panel"
                    style={{ scrollBehavior: 'auto' }}
                >
                    <div className="min-w-max py-0.5">
                        {filteredLeftNodes.map((node, idx) => (
                            <DiffLine
                                key={`l-${idx}-${node.path}`}
                                node={node}
                                side="left"
                                isCollapsed={collapsedPaths.has(node.path)}
                                onToggleCollapse={handleToggleCollapse}
                                lineNumber={idx + 1}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Panel */}
            <div className="flex-1 flex flex-col min-w-0">
                <div className="flex-shrink-0 px-3 py-1 border-b border-slate-800/20 bg-slate-900/30">
                    <span className="text-[9px] font-medium text-slate-600 uppercase tracking-wider">Modified</span>
                </div>
                <div
                    ref={rightPanelRef}
                    onScroll={() => handleScroll('right')}
                    className="flex-1 overflow-auto diff-panel"
                    style={{ scrollBehavior: 'auto' }}
                >
                    <div className="min-w-max py-0.5">
                        {filteredRightNodes.map((node, idx) => (
                            <DiffLine
                                key={`r-${idx}-${node.path}`}
                                node={node}
                                side="right"
                                isCollapsed={collapsedPaths.has(node.path)}
                                onToggleCollapse={handleToggleCollapse}
                                lineNumber={idx + 1}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
