import { useState, useMemo } from 'react';
import {
    ArrowLeftRight,
    Copy,
    Check,
    Trash2,
    AlertCircle,
    Database
} from 'lucide-react';

type ConversionMode = 'mongo-to-sql' | 'sql-to-mongo';

// Helper to safely parse MongoDB-style JSON
function parseMongoJson(str: string): Record<string, unknown> {
    try {
        // Clean up MongoDB query syntax for JSON parsing
        let cleaned = str
            .replace(/'/g, '"')
            .replace(/(\$?\w+)\s*:/g, '"$1":')
            .replace(/ObjectId\s*\(\s*["']([^"']+)["']\s*\)/g, '"$1"')
            .replace(/ISODate\s*\(\s*["']([^"']+)["']\s*\)/g, '"$1"')
            .replace(/NumberLong\s*\(\s*(\d+)\s*\)/g, '$1')
            .replace(/NumberInt\s*\(\s*(\d+)\s*\)/g, '$1');

        // Fix double-quoted keys
        cleaned = cleaned.replace(/""\$(\w+)":/g, '"$$$1":');

        return JSON.parse(cleaned);
    } catch {
        return {};
    }
}

// Format value for SQL
function formatSqlValue(val: unknown): string {
    if (typeof val === 'string') return `'${val}'`;
    if (val === null) return 'NULL';
    if (typeof val === 'boolean') return val ? '1' : '0';
    return String(val);
}

// Parse MongoDB conditions to SQL WHERE clauses
function parseConditionsToSql(obj: Record<string, unknown>, prefix = ''): string[] {
    const conditions: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
        // Skip MongoDB special keys at top level
        if (key.startsWith('$')) {
            if (key === '$and') {
                const andConds = (value as unknown[]).map(item =>
                    parseConditionsToSql(item as Record<string, unknown>).join(' AND ')
                );
                if (andConds.length > 0) {
                    conditions.push(`(${andConds.join(' AND ')})`);
                }
            } else if (key === '$or') {
                const orConds = (value as unknown[]).map(item =>
                    parseConditionsToSql(item as Record<string, unknown>).join(' AND ')
                );
                if (orConds.length > 0) {
                    conditions.push(`(${orConds.join(' OR ')})`);
                }
            } else if (key === '$nor') {
                const norConds = (value as unknown[]).map(item =>
                    parseConditionsToSql(item as Record<string, unknown>).join(' AND ')
                );
                if (norConds.length > 0) {
                    conditions.push(`NOT (${norConds.join(' OR ')})`);
                }
            }
            continue;
        }

        const column = prefix ? `${prefix}.${key}` : key;

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            const operators = value as Record<string, unknown>;
            for (const [op, val] of Object.entries(operators)) {
                switch (op) {
                    case '$eq':
                        conditions.push(`${column} = ${formatSqlValue(val)}`);
                        break;
                    case '$ne':
                        conditions.push(`${column} <> ${formatSqlValue(val)}`);
                        break;
                    case '$gt':
                        conditions.push(`${column} > ${formatSqlValue(val)}`);
                        break;
                    case '$gte':
                        conditions.push(`${column} >= ${formatSqlValue(val)}`);
                        break;
                    case '$lt':
                        conditions.push(`${column} < ${formatSqlValue(val)}`);
                        break;
                    case '$lte':
                        conditions.push(`${column} <= ${formatSqlValue(val)}`);
                        break;
                    case '$in':
                        conditions.push(`${column} IN (${(val as unknown[]).map(formatSqlValue).join(', ')})`);
                        break;
                    case '$nin':
                        conditions.push(`${column} NOT IN (${(val as unknown[]).map(formatSqlValue).join(', ')})`);
                        break;
                    case '$regex': {
                        const pattern = String(val).replace(/%/g, '\\%');
                        conditions.push(`${column} LIKE '%${pattern}%'`);
                        break;
                    }
                    case '$exists':
                        conditions.push(val ? `${column} IS NOT NULL` : `${column} IS NULL`);
                        break;
                    case '$type':
                        // Skip type checks for SQL
                        break;
                    case '$not': {
                        const notConds = parseConditionsToSql({ [column]: val });
                        if (notConds.length > 0) {
                            conditions.push(`NOT (${notConds.join(' AND ')})`);
                        }
                        break;
                    }
                    case '$elemMatch': {
                        // Simplified - just check if array contains value
                        const elemConds = parseConditionsToSql(val as Record<string, unknown>, column);
                        conditions.push(...elemConds);
                        break;
                    }
                }
            }
        } else if (value === null) {
            conditions.push(`${column} IS NULL`);
        } else {
            conditions.push(`${column} = ${formatSqlValue(value)}`);
        }
    }

    return conditions;
}

interface PipelineStage {
    $match?: Record<string, unknown>;
    $group?: Record<string, unknown>;
    $sort?: Record<string, unknown>;
    $limit?: number;
    [key: string]: unknown;
}

// MongoDB to SQL conversion
function mongoToSql(mongoQuery: string): string {
    try {
        // Extract collection name and operation
        const dbMatch = mongoQuery.match(/db\.(\w+)\.(\w+)\s*\(/);
        if (!dbMatch) {
            throw new Error('Cannot parse collection and operation. Use format: db.collection.find(...)');
        }

        const collection = dbMatch[1];
        const operation = dbMatch[2];

        // Extract all chained method calls
        const sortMatch = mongoQuery.match(/\.sort\s*\(\s*({[^}]+})\s*\)/);
        const limitMatch = mongoQuery.match(/\.limit\s*\(\s*(\d+)\s*\)/);
        const skipMatch = mongoQuery.match(/\.skip\s*\(\s*(\d+)\s*\)/);

        // Extract the main query arguments - improved regex
        const argsMatch = mongoQuery.match(/\.\w+\s*\(([\s\S]*?)\)(?:\s*\.|$)/);
        let queryPart = '{}';
        let projectionPart = '';

        if (argsMatch) {
            const argsStr = argsMatch[1].trim();
            // Split by comma at the top level (not inside braces)
            let braceCount = 0;
            let splitIndex = -1;
            for (let i = 0; i < argsStr.length; i++) {
                if (argsStr[i] === '{') braceCount++;
                else if (argsStr[i] === '}') braceCount--;
                else if (argsStr[i] === ',' && braceCount === 0) {
                    splitIndex = i;
                    break;
                }
            }

            if (splitIndex > 0) {
                queryPart = argsStr.substring(0, splitIndex).trim();
                projectionPart = argsStr.substring(splitIndex + 1).trim();
            } else {
                queryPart = argsStr;
            }
        }

        const queryObj = parseMongoJson(queryPart);
        const conditions = parseConditionsToSql(queryObj);

        // Build SQL based on operation
        switch (operation) {
            case 'find':
            case 'findOne': {
                // Parse projection
                let columns = '*';
                if (projectionPart) {
                    const projObj = parseMongoJson(projectionPart);
                    const includedCols = Object.entries(projObj)
                        .filter(([, v]) => v === 1)
                        .map(([k]) => k);
                    const excludedCols = Object.entries(projObj)
                        .filter(([, v]) => v === 0)
                        .map(([k]) => k);

                    if (includedCols.length > 0) {
                        columns = includedCols.join(', ');
                    } else if (excludedCols.length > 0) {
                        columns = `* -- excluding: ${excludedCols.join(', ')}`;
                    }
                }

                let sql = `SELECT ${columns}\nFROM ${collection}`;

                // WHERE clause
                if (conditions.length > 0) {
                    sql += `\nWHERE ${conditions.join('\n  AND ')}`;
                }

                // ORDER BY clause from .sort()
                if (sortMatch) {
                    const sortObj = parseMongoJson(sortMatch[1]);
                    const orderClauses = Object.entries(sortObj).map(([col, dir]) =>
                        `${col} ${dir === -1 ? 'DESC' : 'ASC'}`
                    );
                    if (orderClauses.length > 0) {
                        sql += `\nORDER BY ${orderClauses.join(', ')}`;
                    }
                }

                // LIMIT and OFFSET
                if (limitMatch || operation === 'findOne') {
                    const limit = limitMatch ? limitMatch[1] : '1';
                    sql += `\nLIMIT ${limit}`;
                }
                if (skipMatch) {
                    sql += `\nOFFSET ${skipMatch[1]}`;
                }

                return sql;
            }

            case 'aggregate': {
                // Parse aggregate pipeline
                const pipelineMatch = mongoQuery.match(/aggregate\s*\(\s*\[([\s\S]*)\]\s*\)/);
                if (!pipelineMatch) {
                    return `-- Cannot parse aggregate pipeline\nSELECT * FROM ${collection}`;
                }

                let sql = `SELECT `;
                let groupBy = '';
                const having = '';
                let orderBy = '';
                let limit = '';
                let whereClause = '';
                const selectCols: string[] = [];

                // Improved Pipeline Parsing: Parse entire array then iterate
                const pipelineContent = pipelineMatch[1];
                let pipeline: PipelineStage[] = [];
                try {
                    // Wrap in [] to parse as array
                    pipeline = (parseMongoJson(`[${pipelineContent}]`) as unknown) as PipelineStage[];
                } catch {
                    return `-- Failed to parse pipeline JSON\nSELECT * FROM ${collection}`;
                }

                for (const stage of pipeline) {
                    if (stage.$match) {
                        const matchConds = parseConditionsToSql(stage.$match);
                        if (matchConds.length > 0) {
                            whereClause = whereClause ? `${whereClause} AND ${matchConds.join(' AND ')}` : matchConds.join(' AND ');
                        }
                    } else if (stage.$group) {
                        const groupObj = stage.$group;
                        if (groupObj._id) {
                            if (typeof groupObj._id === 'string' && groupObj._id.startsWith('$')) {
                                groupBy = groupObj._id.substring(1);
                                selectCols.push(groupBy);
                            } else if (typeof groupObj._id === 'object') {
                                const idFields = Object.entries(groupObj._id as Record<string, string>)
                                    .map(([alias, field]) => `${field.replace('$', '')} AS ${alias}`);
                                selectCols.push(...idFields);
                                groupBy = idFields.map(f => f.split(' AS ')[0]).join(', ');
                            }
                        }

                        // Parse aggregation functions
                        for (const [alias, expr] of Object.entries(groupObj)) {
                            if (alias === '_id') continue;
                            if (typeof expr === 'object' && expr !== null) {
                                const aggExpr = expr as Record<string, unknown>;
                                if (aggExpr.$sum !== undefined) {
                                    const field = aggExpr.$sum === 1 ? '*' : String(aggExpr.$sum).replace('$', '');
                                    selectCols.push(`SUM(${field === '*' ? '1' : field}) AS ${alias}`);
                                } else if (aggExpr.$avg !== undefined) {
                                    selectCols.push(`AVG(${String(aggExpr.$avg).replace('$', '')}) AS ${alias}`);
                                } else if (aggExpr.$min !== undefined) {
                                    selectCols.push(`MIN(${String(aggExpr.$min).replace('$', '')}) AS ${alias}`);
                                } else if (aggExpr.$max !== undefined) {
                                    selectCols.push(`MAX(${String(aggExpr.$max).replace('$', '')}) AS ${alias}`);
                                } else if (aggExpr.$count !== undefined) {
                                    selectCols.push(`COUNT(*) AS ${alias}`);
                                }
                            } else if (typeof expr === 'string' && expr.startsWith('$')) {
                                // Direct field reference in group (uncommon but possible)
                                selectCols.push(`${expr.substring(1)} AS ${alias}`);
                            }
                        }
                    } else if (stage.$sort) {
                        orderBy = Object.entries(stage.$sort)
                            .map(([col, dir]) => `${col} ${dir === -1 ? 'DESC' : 'ASC'}`)
                            .join(', ');
                    } else if (stage.$limit) {
                        limit = String(stage.$limit);
                    }
                }

                sql += selectCols.length > 0 ? selectCols.join(',\n       ') : '*';
                sql += `\nFROM ${collection}`;
                if (whereClause) sql += `\nWHERE ${whereClause}`;
                if (groupBy) sql += `\nGROUP BY ${groupBy}`;
                if (having) sql += `\nHAVING ${having}`;
                if (orderBy) sql += `\nORDER BY ${orderBy}`;
                if (limit) sql += `\nLIMIT ${limit}`;

                return sql;
            }

            case 'count':
            case 'countDocuments': {
                let sql = `SELECT COUNT(*) AS count\nFROM ${collection}`;
                if (conditions.length > 0) {
                    sql += `\nWHERE ${conditions.join('\n  AND ')}`;
                }
                return sql;
            }

            case 'distinct': {
                const fieldMatch = mongoQuery.match(/distinct\s*\(\s*["'](\w+)["']/);
                const field = fieldMatch ? fieldMatch[1] : '*';
                let sql = `SELECT DISTINCT ${field}\nFROM ${collection}`;
                if (conditions.length > 0) {
                    sql += `\nWHERE ${conditions.join('\n  AND ')}`;
                }
                return sql;
            }

            case 'insertOne':
            case 'insertMany': {
                const insertObj = parseMongoJson(queryPart);
                const columns = Object.keys(insertObj);
                const values = Object.values(insertObj).map(formatSqlValue);
                return `INSERT INTO ${collection} (${columns.join(', ')})\nVALUES (${values.join(', ')})`;
            }

            case 'updateOne':
            case 'updateMany': {
                let sql = `UPDATE ${collection}`;

                // Parse $set from update object
                const setMatch = mongoQuery.match(/\$set\s*:\s*({[^}]+})/);
                if (setMatch) {
                    const setObj = parseMongoJson(setMatch[1]);
                    const setClauses = Object.entries(setObj)
                        .map(([k, v]) => `${k} = ${formatSqlValue(v)}`);
                    sql += `\nSET ${setClauses.join(',\n    ')}`;
                }

                if (conditions.length > 0) {
                    sql += `\nWHERE ${conditions.join('\n  AND ')}`;
                }

                return sql;
            }

            case 'deleteOne':
            case 'deleteMany': {
                let sql = `DELETE FROM ${collection}`;
                if (conditions.length > 0) {
                    sql += `\nWHERE ${conditions.join('\n  AND ')}`;
                }
                if (operation === 'deleteOne') {
                    sql += '\nLIMIT 1';
                }
                return sql;
            }

            default:
                return `-- Unsupported operation: ${operation}\nSELECT * FROM ${collection}`;
        }
    } catch (e) {
        throw new Error(`Conversion failed: ${(e as Error).message}`);
    }
}

// SQL to MongoDB conversion
function sqlToMongo(sql: string): string {
    try {
        const upperSql = sql.toUpperCase().trim();

        if (upperSql.startsWith('SELECT')) {
            return convertSelectToMongo(sql);
        } else if (upperSql.startsWith('INSERT')) {
            return convertInsertToMongo(sql);
        } else if (upperSql.startsWith('UPDATE')) {
            return convertUpdateToMongo(sql);
        } else if (upperSql.startsWith('DELETE')) {
            return convertDeleteToMongo(sql);
        }

        throw new Error('Unsupported SQL statement type');
    } catch (e) {
        throw new Error(`Failed to convert: ${(e as Error).message}`);
    }
}

function convertSelectToMongo(sql: string): string {
    // Extract parts using regex
    const fromMatch = sql.match(/FROM\s+(\w+)/i);
    const collection = fromMatch ? fromMatch[1] : 'collection';

    // Extract columns
    const selectMatch = sql.match(/SELECT\s+([\s\S]*?)\s+FROM/i);
    let projection = '';
    if (selectMatch && selectMatch[1].trim() !== '*') {
        const columns = selectMatch[1].split(',').map(c => c.trim().split(/\s+/)[0]);
        const projObj: Record<string, number> = {};
        columns.forEach(col => { projObj[col] = 1; });
        projection = `, ${JSON.stringify(projObj, null, 2)}`;
    }

    // Extract WHERE conditions
    const whereMatch = sql.match(/WHERE\s+([\s\S]*?)(?:ORDER|GROUP|LIMIT|$)/i);
    let filter = '{}';
    if (whereMatch) {
        filter = parseWhereClause(whereMatch[1].trim());
    }

    // Extract LIMIT
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    let limit = '';
    if (limitMatch) {
        limit = `.limit(${limitMatch[1]})`;
    }

    // Extract ORDER BY
    const orderMatch = sql.match(/ORDER\s+BY\s+([\w,\s]+?)(?:ASC|DESC|LIMIT|$)/i);
    let sort = '';
    if (orderMatch) {
        const orderCols = orderMatch[1].split(',').map(c => c.trim());
        const sortObj: Record<string, number> = {};
        orderCols.forEach(col => {
            const descMatch = sql.match(new RegExp(`${col}\\s+DESC`, 'i'));
            sortObj[col] = descMatch ? -1 : 1;
        });
        sort = `.sort(${JSON.stringify(sortObj)})`;
    }

    return `db.${collection}.find(${filter}${projection})${sort}${limit}`;
}

function parseWhereClause(whereClause: string): string {
    // 1. Split by OR first
    // Note: This is a simple split and won't handle nested parentheses well without a full parser.
    // For this level of complexity, we assume top-level ORs or parenthesized groups.
    const orParts = whereClause.split(/\s+OR\s+/i);

    if (orParts.length > 1) {
        const orConditions = orParts.map(part => {
            // 0. Remove surrounding parens if present
            let cleanPart = part.trim();
            if (cleanPart.startsWith('(') && cleanPart.endsWith(')')) {
                cleanPart = cleanPart.substring(1, cleanPart.length - 1);
            }
            return JSON.parse(parseAndClause(cleanPart));
        });
        return JSON.stringify({ $or: orConditions }, null, 2);
    }

    return parseAndClause(whereClause);
}

function parseAndClause(whereClause: string): string {
    const conditions: Record<string, unknown> = {};

    // Split by AND
    const parts = whereClause.split(/\s+AND\s+/i);

    for (const part of parts) {
        // Handle different operators - ORDER MATTERS: check >= and <= BEFORE > and <

        // Check for >= (greater than or equal)
        let match = part.match(/(\w+)\s*>=\s*'?([^']+)'?/i);
        if (match) {
            const val = match[2].trim().replace(/'/g, '');
            conditions[match[1]] = { $gte: isNaN(Number(val)) ? val : Number(val) };
            continue;
        }

        // Check for <= (less than or equal)
        match = part.match(/(\w+)\s*<=\s*'?([^']+)'?/i);
        if (match) {
            const val = match[2].trim().replace(/'/g, '');
            conditions[match[1]] = { $lte: isNaN(Number(val)) ? val : Number(val) };
            continue;
        }

        // Check for <> or != (not equal)
        match = part.match(/(\w+)\s*(?:<>|!=)\s*'?([^']+)'?/i);
        if (match) {
            const val = match[2].trim().replace(/'/g, '');
            conditions[match[1]] = { $ne: isNaN(Number(val)) ? val : Number(val) };
            continue;
        }

        // Check for > (greater than) - AFTER >=
        match = part.match(/(\w+)\s*>\s*'?([^']+)'?/i);
        if (match) {
            const val = match[2].trim().replace(/'/g, '');
            conditions[match[1]] = { $gt: isNaN(Number(val)) ? val : Number(val) };
            continue;
        }

        // Check for < (less than) - AFTER <=
        match = part.match(/(\w+)\s*<\s*'?([^']+)'?/i);
        if (match) {
            const val = match[2].trim().replace(/'/g, '');
            conditions[match[1]] = { $lt: isNaN(Number(val)) ? val : Number(val) };
            continue;
        }

        // Check for = (equal) - AFTER all comparison operators
        match = part.match(/(\w+)\s*=\s*'?([^']+)'?/i);
        if (match) {
            const val = match[2].trim().replace(/'/g, '');
            conditions[match[1]] = isNaN(Number(val)) ? val : Number(val);
            continue;
        }

        match = part.match(/(\w+)\s+IN\s*\(([^)]+)\)/i);
        if (match) {
            const values = match[2].split(',').map(v => {
                const cleaned = v.trim().replace(/'/g, '');
                return isNaN(Number(cleaned)) ? cleaned : Number(cleaned);
            });
            conditions[match[1]] = { $in: values };
            continue;
        }

        match = part.match(/(\w+)\s+NOT\s+IN\s*\(([^)]+)\)/i);
        if (match) {
            const values = match[2].split(',').map(v => {
                const cleaned = v.trim().replace(/'/g, '');
                return isNaN(Number(cleaned)) ? cleaned : Number(cleaned);
            });
            conditions[match[1]] = { $nin: values };
            continue;
        }

        match = part.match(/(\w+)\s+LIKE\s+'%?([^%']+)%?'/i);
        if (match) {
            conditions[match[1]] = { $regex: match[2], $options: 'i' };
            continue;
        }

        match = part.match(/(\w+)\s+IS\s+NOT\s+NULL/i);
        if (match) {
            conditions[match[1]] = { $exists: true, $ne: null };
            continue;
        }

        match = part.match(/(\w+)\s+IS\s+NULL/i);
        if (match) {
            conditions[match[1]] = null;
            continue;
        }
    }

    return JSON.stringify(conditions, null, 2);
}

function convertInsertToMongo(sql: string): string {
    const tableMatch = sql.match(/INTO\s+(\w+)/i);
    const collection = tableMatch ? tableMatch[1] : 'collection';

    const columnsMatch = sql.match(/\(([^)]+)\)\s*VALUES/i);
    const valuesMatch = sql.match(/VALUES\s*\(([^)]+)\)/i);

    if (columnsMatch && valuesMatch) {
        const columns = columnsMatch[1].split(',').map(c => c.trim());
        const values = valuesMatch[1].split(',').map(v => {
            const cleaned = v.trim().replace(/'/g, '');
            return isNaN(Number(cleaned)) ? cleaned : Number(cleaned);
        });

        const doc: Record<string, unknown> = {};
        columns.forEach((col, i) => {
            doc[col] = values[i];
        });

        return `db.${collection}.insertOne(${JSON.stringify(doc, null, 2)})`;
    }

    return `db.${collection}.insertOne({ /* document */ })`;
}

function convertUpdateToMongo(sql: string): string {
    const tableMatch = sql.match(/UPDATE\s+(\w+)/i);
    const collection = tableMatch ? tableMatch[1] : 'collection';

    // Extract SET clause
    const setMatch = sql.match(/SET\s+([\s\S]*?)(?:WHERE|$)/i);
    const updates: Record<string, unknown> = {};
    if (setMatch) {
        const setParts = setMatch[1].split(',');
        for (const part of setParts) {
            const match = part.match(/(\w+)\s*=\s*'?([^',]+)'?/);
            if (match) {
                const val = match[2].trim().replace(/'/g, '');
                updates[match[1]] = isNaN(Number(val)) ? val : Number(val);
            }
        }
    }

    // Extract WHERE clause
    const whereMatch = sql.match(/WHERE\s+([\s\S]+)/i);
    let filter = '{}';
    if (whereMatch) {
        filter = parseWhereClause(whereMatch[1].trim());
    }

    return `db.${collection}.updateMany(\n  ${filter},\n  { $set: ${JSON.stringify(updates, null, 2)} }\n)`;
}

function convertDeleteToMongo(sql: string): string {
    const tableMatch = sql.match(/FROM\s+(\w+)/i);
    const collection = tableMatch ? tableMatch[1] : 'collection';

    const whereMatch = sql.match(/WHERE\s+([\s\S]+)/i);
    let filter = '{}';
    if (whereMatch) {
        filter = parseWhereClause(whereMatch[1].trim());
    }

    return `db.${collection}.deleteMany(${filter})`;
}

export default function MongoSqlPage() {
    const [input, setInput] = useState(`db.users.find({
  status: "active",
  age: { $gte: 18 },
  country: { $in: ["USA", "Canada", "UK"] }
}, {
  name: 1,
  email: 1,
  age: 1
}).sort({ createdAt: -1 }).limit(10)`);
    const [mode, setMode] = useState<ConversionMode>('mongo-to-sql');
    const [copied, setCopied] = useState(false);

    const result = useMemo(() => {
        if (!input.trim()) return { success: true, value: '', error: null };

        try {
            if (mode === 'mongo-to-sql') {
                const sql = mongoToSql(input);
                return { success: true, value: sql, error: null };
            } else {
                const mongo = sqlToMongo(input);
                return { success: true, value: mongo, error: null };
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
            setMode(mode === 'mongo-to-sql' ? 'sql-to-mongo' : 'mongo-to-sql');
        }
    };

    const loadSampleMongo = () => {
        setInput(`db.users.find({
  status: "active",
  age: { $gte: 18 },
  country: { $in: ["USA", "Canada", "UK"] }
}, {
  name: 1,
  email: 1,
  age: 1
}).sort({ createdAt: -1 }).limit(10)`);
        setMode('mongo-to-sql');
    };

    const loadSampleSql = () => {
        setInput(`SELECT name, email, age
FROM users
WHERE status = 'active'
  AND age >= 18
  AND country IN ('USA', 'Canada', 'UK')
ORDER BY created_at DESC
LIMIT 10`);
        setMode('sql-to-mongo');
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {/* Toolbar */}
            <div className="flex-shrink-0 border-b border-slate-200 px-6 py-3 flex items-center gap-4 bg-slate-50">
                <div className="flex items-center gap-2">
                    <Database size={18} className="text-slate-500" />
                    <span className="font-medium text-slate-700">MongoDB ↔ SQL Converter</span>
                </div>

                <div className="flex-1" />

                {/* Mode Toggle */}
                <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-1">
                    <button
                        onClick={() => setMode('mongo-to-sql')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors ${mode === 'mongo-to-sql'
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        MongoDB → SQL
                    </button>
                    <button
                        onClick={() => setMode('sql-to-mongo')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors ${mode === 'sql-to-mongo'
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        SQL → MongoDB
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
                    onClick={() => setInput('')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                    <Trash2 size={14} /> Clear
                </button>
            </div>

            {/* Samples */}
            <div className="flex-shrink-0 border-b border-slate-100 px-6 py-2 bg-slate-50/50 flex items-center gap-2 text-xs">
                <span className="text-slate-500">Load sample:</span>
                <button onClick={loadSampleMongo} className="text-blue-600 hover:underline">MongoDB Query</button>
                <span className="text-slate-300">|</span>
                <button onClick={loadSampleSql} className="text-blue-600 hover:underline">SQL Query</button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Input Panel */}
                <div className="w-1/2 flex flex-col border-r border-slate-200">
                    <div className="flex-shrink-0 px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            {mode === 'mongo-to-sql' ? 'MongoDB Query' : 'SQL Query'}
                        </span>
                        <span className="text-xs text-slate-400">
                            {input.split('\n').length} lines
                        </span>
                    </div>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="flex-1 w-full p-4 font-mono text-sm bg-white border-0 resize-none text-slate-700 focus:outline-none"
                        spellCheck={false}
                        placeholder={mode === 'mongo-to-sql' ? 'Enter MongoDB query...' : 'Enter SQL query...'}
                    />
                </div>

                {/* Output Panel */}
                <div className="w-1/2 flex flex-col">
                    <div className="flex-shrink-0 px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            {mode === 'mongo-to-sql' ? 'SQL Query' : 'MongoDB Query'}
                        </span>
                        <button
                            onClick={copyToClipboard}
                            disabled={!result.value}
                            className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-40"
                        >
                            {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>

                    {/* Output Content */}
                    {result.success ? (
                        <div className="flex-1 overflow-auto p-4 bg-slate-900">
                            {result.value ? (
                                <pre className="font-mono text-sm text-slate-100 whitespace-pre">
                                    {result.value}
                                </pre>
                            ) : (
                                <div className="flex-1 flex items-center justify-center h-full text-slate-500 text-sm">
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
                <span className="font-medium">Note:</span> Supports SELECT, INSERT, UPDATE, DELETE operations with common operators ($eq, $gt, $lt, $in, $regex, etc.)
            </div>
        </div>
    );
}
