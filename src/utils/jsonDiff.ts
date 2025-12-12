import { isEqual, isPlainObject, isArray } from 'lodash';
import type { DiffNode, JsonValue, JsonObject, JsonArray } from '../types/diff';
import { DiffType } from '../types/diff';

/**
 * Get the type of a JSON value for display
 */
function getValueType(value: JsonValue): 'object' | 'array' | 'primitive' {
    if (isPlainObject(value)) return 'object';
    if (isArray(value)) return 'array';
    return 'primitive';
}

/**
 * Generate all keys from both objects, maintaining order and alignment
 */
function getAlignedKeys(leftObj: JsonObject | null, rightObj: JsonObject | null): string[] {
    const leftKeys = leftObj ? Object.keys(leftObj) : [];
    const rightKeys = rightObj ? Object.keys(rightObj) : [];

    const allKeys: string[] = [];
    const leftKeySet = new Set(leftKeys);

    // Add all left keys first
    for (const key of leftKeys) {
        allKeys.push(key);
    }

    // Add any right keys that aren't in left (at their relative position)
    for (const key of rightKeys) {
        if (!leftKeySet.has(key)) {
            allKeys.push(key);
        }
    }

    return allKeys;
}

/**
 * Format a primitive value for display
 */
export function formatValue(value: JsonValue): string {
    if (value === null) return 'null';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return String(value);
    return String(value);
}

/**
 * Get CSS class for value type
 */
export function getValueClass(value: JsonValue): string {
    if (value === null) return 'json-null';
    if (typeof value === 'string') return 'json-string';
    if (typeof value === 'number') return 'json-number';
    if (typeof value === 'boolean') return 'json-boolean';
    return '';
}

/**
 * Main diff function - compares two JSON values and generates aligned diff nodes
 */
export function compareJson(
    leftValue: JsonValue | undefined,
    rightValue: JsonValue | undefined,
    path: string = '',
    indent: number = 0,
    key?: string,
    isArrayItem: boolean = false,
    arrayIndex?: number
): { leftNodes: DiffNode[]; rightNodes: DiffNode[] } {
    const leftNodes: DiffNode[] = [];
    const rightNodes: DiffNode[] = [];

    const leftType = leftValue !== undefined ? getValueType(leftValue) : null;
    const rightType = rightValue !== undefined ? getValueType(rightValue) : null;

    // Case 1: Value only exists in left (REMOVED)
    if (leftValue !== undefined && rightValue === undefined) {
        const nodes = createNodesForValue(leftValue, path, indent, key, DiffType.REMOVED, isArrayItem, arrayIndex);
        leftNodes.push(...nodes);
        // Add spacers on right side
        for (let i = 0; i < nodes.length; i++) {
            rightNodes.push(createSpacer(indent));
        }
        return { leftNodes, rightNodes };
    }

    // Case 2: Value only exists in right (ADDED)
    if (leftValue === undefined && rightValue !== undefined) {
        const nodes = createNodesForValue(rightValue, path, indent, key, DiffType.ADDED, isArrayItem, arrayIndex);
        rightNodes.push(...nodes);
        // Add spacers on left side
        for (let i = 0; i < nodes.length; i++) {
            leftNodes.push(createSpacer(indent));
        }
        return { leftNodes, rightNodes };
    }

    // Case 3: Both values exist
    if (leftValue !== undefined && rightValue !== undefined) {
        // If values are equal, mark as unchanged
        if (isEqual(leftValue, rightValue)) {
            const nodes = createNodesForValue(leftValue, path, indent, key, DiffType.UNCHANGED, isArrayItem, arrayIndex);
            leftNodes.push(...nodes);
            rightNodes.push(...nodes.map(n => ({ ...n })));
            return { leftNodes, rightNodes };
        }

        // If types are different, show as modified
        if (leftType !== rightType) {
            const leftNodesList = createNodesForValue(leftValue, path, indent, key, DiffType.MODIFIED, isArrayItem, arrayIndex);
            const rightNodesList = createNodesForValue(rightValue, path, indent, key, DiffType.MODIFIED, isArrayItem, arrayIndex);

            // Align the two sides
            const maxLen = Math.max(leftNodesList.length, rightNodesList.length);
            while (leftNodesList.length < maxLen) leftNodesList.push(createSpacer(indent));
            while (rightNodesList.length < maxLen) rightNodesList.push(createSpacer(indent));

            leftNodes.push(...leftNodesList);
            rightNodes.push(...rightNodesList);
            return { leftNodes, rightNodes };
        }

        // Both are objects - compare recursively
        if (leftType === 'object' && rightType === 'object') {
            const leftObj = leftValue as JsonObject;
            const rightObj = rightValue as JsonObject;

            // Opening brace
            const openNode: DiffNode = {
                type: DiffType.UNCHANGED,
                key,
                path,
                leftValue: '{',
                rightValue: '{',
                indent,
                isCollapsible: true,
                isArrayItem,
                arrayIndex,
            };
            leftNodes.push(openNode);
            rightNodes.push({ ...openNode });

            // Get aligned keys
            const alignedKeys = getAlignedKeys(leftObj, rightObj);

            for (const k of alignedKeys) {
                const childPath = path ? `${path}.${k}` : k;
                const childResult = compareJson(
                    leftObj[k],
                    rightObj[k],
                    childPath,
                    indent + 1,
                    k,
                    false
                );
                leftNodes.push(...childResult.leftNodes);
                rightNodes.push(...childResult.rightNodes);
            }

            // Closing brace
            const closeNode: DiffNode = {
                type: DiffType.UNCHANGED,
                path,
                leftValue: '}',
                rightValue: '}',
                indent,
                isCollapsible: false,
                isClosingBracket: true,
                bracketType: 'object',
            };
            leftNodes.push(closeNode);
            rightNodes.push({ ...closeNode });

            return { leftNodes, rightNodes };
        }

        // Both are arrays - compare recursively
        if (leftType === 'array' && rightType === 'array') {
            const leftArr = leftValue as JsonArray;
            const rightArr = rightValue as JsonArray;

            // Opening bracket
            const openNode: DiffNode = {
                type: DiffType.UNCHANGED,
                key,
                path,
                leftValue: '[',
                rightValue: '[',
                indent,
                isCollapsible: true,
                isArrayItem,
                arrayIndex,
            };
            leftNodes.push(openNode);
            rightNodes.push({ ...openNode });

            // Compare array items
            const maxLen = Math.max(leftArr.length, rightArr.length);
            for (let i = 0; i < maxLen; i++) {
                const childPath = `${path}[${i}]`;
                const childResult = compareJson(
                    leftArr[i],
                    rightArr[i],
                    childPath,
                    indent + 1,
                    undefined,
                    true,
                    i
                );
                leftNodes.push(...childResult.leftNodes);
                rightNodes.push(...childResult.rightNodes);
            }

            // Closing bracket
            const closeNode: DiffNode = {
                type: DiffType.UNCHANGED,
                path,
                leftValue: ']',
                rightValue: ']',
                indent,
                isCollapsible: false,
                isClosingBracket: true,
                bracketType: 'array',
            };
            leftNodes.push(closeNode);
            rightNodes.push({ ...closeNode });

            return { leftNodes, rightNodes };
        }

        // Both are primitives but different values - MODIFIED
        const leftNode: DiffNode = {
            type: DiffType.MODIFIED,
            key,
            path,
            leftValue,
            indent,
            isCollapsible: false,
            isArrayItem,
            arrayIndex,
        };
        const rightNode: DiffNode = {
            type: DiffType.MODIFIED,
            key,
            path,
            rightValue,
            indent,
            isCollapsible: false,
            isArrayItem,
            arrayIndex,
        };
        leftNodes.push(leftNode);
        rightNodes.push(rightNode);
    }

    return { leftNodes, rightNodes };
}

/**
 * Create nodes for a single value (handles nested objects/arrays)
 */
function createNodesForValue(
    value: JsonValue,
    path: string,
    indent: number,
    key: string | undefined,
    diffType: typeof DiffType[keyof typeof DiffType],
    isArrayItem: boolean,
    arrayIndex?: number
): DiffNode[] {
    const nodes: DiffNode[] = [];
    const valueType = getValueType(value);

    if (valueType === 'object') {
        const obj = value as JsonObject;
        const keys = Object.keys(obj);

        // Opening brace
        nodes.push({
            type: diffType,
            key,
            path,
            leftValue: diffType === DiffType.REMOVED ? '{' : undefined,
            rightValue: diffType === DiffType.ADDED ? '{' : undefined,
            indent,
            isCollapsible: true,
            isArrayItem,
            arrayIndex,
        });

        // Child values
        for (const k of keys) {
            const childPath = path ? `${path}.${k}` : k;
            const childNodes = createNodesForValue(obj[k], childPath, indent + 1, k, diffType, false);
            nodes.push(...childNodes);
        }

        // Closing brace
        nodes.push({
            type: diffType,
            path,
            leftValue: diffType === DiffType.REMOVED ? '}' : undefined,
            rightValue: diffType === DiffType.ADDED ? '}' : undefined,
            indent,
            isCollapsible: false,
            isClosingBracket: true,
            bracketType: 'object',
        });
    } else if (valueType === 'array') {
        const arr = value as JsonArray;

        // Opening bracket
        nodes.push({
            type: diffType,
            key,
            path,
            leftValue: diffType === DiffType.REMOVED ? '[' : undefined,
            rightValue: diffType === DiffType.ADDED ? '[' : undefined,
            indent,
            isCollapsible: true,
            isArrayItem,
            arrayIndex,
        });

        // Array items
        for (let i = 0; i < arr.length; i++) {
            const childPath = `${path}[${i}]`;
            const childNodes = createNodesForValue(arr[i], childPath, indent + 1, undefined, diffType, true, i);
            nodes.push(...childNodes);
        }

        // Closing bracket
        nodes.push({
            type: diffType,
            path,
            leftValue: diffType === DiffType.REMOVED ? ']' : undefined,
            rightValue: diffType === DiffType.ADDED ? ']' : undefined,
            indent,
            isCollapsible: false,
            isClosingBracket: true,
            bracketType: 'array',
        });
    } else {
        // Primitive value
        nodes.push({
            type: diffType,
            key,
            path,
            leftValue: diffType === DiffType.REMOVED || diffType === DiffType.MODIFIED || diffType === DiffType.UNCHANGED ? value : undefined,
            rightValue: diffType === DiffType.ADDED || diffType === DiffType.MODIFIED || diffType === DiffType.UNCHANGED ? value : undefined,
            indent,
            isCollapsible: false,
            isArrayItem,
            arrayIndex,
        });
    }

    return nodes;
}

/**
 * Create a spacer node for alignment
 */
function createSpacer(indent: number): DiffNode {
    return {
        type: DiffType.SPACER,
        path: '',
        indent,
        isCollapsible: false,
    };
}

/**
 * Parse JSON safely and return result or error
 */
export function parseJsonSafe(input: string): { success: true; data: JsonValue } | { success: false; error: string } {
    if (!input.trim()) {
        return { success: false, error: 'Empty input' };
    }

    try {
        const data = JSON.parse(input);
        return { success: true, data };
    } catch (e) {
        const error = e instanceof Error ? e.message : 'Invalid JSON';
        return { success: false, error };
    }
}

/**
 * Format JSON with proper indentation
 */
export function formatJson(input: string): { success: true; formatted: string } | { success: false; error: string } {
    const result = parseJsonSafe(input);
    if (!result.success) {
        return result;
    }
    return { success: true, formatted: JSON.stringify(result.data, null, 2) };
}
