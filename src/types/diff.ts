// Types for JSON diff functionality

export type JsonValue =
    | string
    | number
    | boolean
    | null
    | JsonObject
    | JsonArray;

export interface JsonObject {
    [key: string]: JsonValue;
}

export type JsonArray = JsonValue[];

// Using const object instead of enum for erasableSyntaxOnly compatibility
export const DiffType = {
    ADDED: 'added',
    REMOVED: 'removed',
    MODIFIED: 'modified',
    UNCHANGED: 'unchanged',
    SPACER: 'spacer',
} as const;

export type DiffType = typeof DiffType[keyof typeof DiffType];

export interface DiffNode {
    type: DiffType;
    key?: string;
    path: string;
    leftValue?: JsonValue;
    rightValue?: JsonValue;
    indent: number;
    isCollapsible: boolean;
    isArrayItem?: boolean;
    arrayIndex?: number;
    children?: DiffNode[];
    isClosingBracket?: boolean;
    bracketType?: 'object' | 'array';
}

export interface DiffResult {
    leftNodes: DiffNode[];
    rightNodes: DiffNode[];
}
