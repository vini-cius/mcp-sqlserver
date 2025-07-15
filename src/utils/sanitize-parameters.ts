export function sanitizeParameters(
  parameters: Record<string, unknown>
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(parameters)) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
      throw new Error(`Nome de parâmetro inválido: ${key}`)
    }

    if (typeof value === 'string' && value.length > 8000) {
      throw new Error(`Valor muito longo para parâmetro: ${key}`)
    }

    sanitized[key] = value
  }

  return sanitized
}
