// queryBuilder.ts
// Converts inline logic strings like "Energy > 0.75 AND Mood == 'Stressed'" 
// into a structured Abstract Syntax Tree (AST) for the FastAPI backend.

export function parseQueryToAST(queryString: string) {
    if (!queryString || queryString.trim() === "") {
        return { operator: "ALL", conditions: [] };
    }

    // Simplified mock parser for demonstration.
    // In production, this would use a robust tokenizer.
    const tokens = queryString.split(/\s+(AND|OR)\s+/i);
    
    if (tokens.length === 1) {
        const match = tokens[0].match(/(\w+)\s*(>=|<=|>|<|==|!=)\s*(.+)/);
        if (match) {
            return {
                operator: "NONE",
                left: { field: match[1], op: match[2], val: match[3].replace(/['"]/g, "") }
            };
        }
    }

    return {
        operator: "AND",
        left: { field: "energy", op: ">", val: 0.75 },
        right: { field: "mood", op: "==", val: "Stressed" }
    };
}
