export function validateQuery(query: string): boolean {
  const cleanQuery = query.trim().toLowerCase()

  const allowedCommands = /^(select|with|show|describe|explain|exec|execute)\s/i

  if (!allowedCommands.test(cleanQuery)) {
    return false
  }

  // If it is EXEC/EXECUTE, check if it is a safe function or procedure
  if (/^(exec|execute)\s/i.test(cleanQuery)) {
    // Only allows execution of functions and procedures (not dynamic SQL commands)
    const procedurePattern =
      /^(exec|execute)\s+([a-zA-Z_][a-zA-Z0-9_]*\.)?[a-zA-Z_][a-zA-Z0-9_]*\s*(\(.*\))?$/i

    if (!procedurePattern.test(cleanQuery)) {
      return false
    }
  }

  const blockedPatterns = [
    /drop\s+table/i,
    /delete\s+from/i,
    /truncate\s+table/i,
    /insert\s+into/i,
    /update\s+/i,
    /create\s+table/i,
    /alter\s+table/i,
    /rename\s+table/i,
    /sp_/i, // System stored procedures
    /xp_/i, // Extended stored procedures
    /;\s*drop/i, // SQL injection
    /;\s*delete/i,
    /union.*select/i, // UNION attacks
    /--/i, // SQL comments
    /\/\*/i, // multi-line comments
    /exec\s*\(/i, // Dynamic SQL execution
    /execute\s*\(/i, // Dynamic SQL execution
  ]

  return !blockedPatterns.some((pattern) => pattern.test(cleanQuery))
}
