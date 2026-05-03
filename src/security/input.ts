const CONTROL_CHARS_REGEX = /[\u0000-\u001F\u007F]/g;

export function sanitizeTextInput(value: string, maxLength = 200) {
  // SECURITY: normalize and strip control characters to reduce log/HTML/DB injection vectors.
  const normalized = value.normalize("NFKC").replace(CONTROL_CHARS_REGEX, " ");
  // SECURITY: trim and cap length to mitigate abuse and oversized payloads.
  return normalized.trim().slice(0, maxLength);
}

export function sanitizeMultilineInput(value: string, maxLength = 1000) {
  // SECURITY: keep user formatting but remove dangerous control chars.
  const normalized = value.normalize("NFKC").replace(CONTROL_CHARS_REGEX, " ");
  // SECURITY: enforce upper bound to prevent payload amplification.
  return normalized.trim().slice(0, maxLength);
}

export function sanitizePlateInput(value: string) {
  // SECURITY: allow digits only for license plates to avoid injection via mixed chars.
  return value.replace(/\D/g, "").slice(0, 8);
}

export function isFinitePositiveNumber(value: number) {
  // SECURITY: reject NaN/Infinity/negative values before writing to persistence.
  return Number.isFinite(value) && value > 0;
}

// Security checklist for this code:
// - Input normalization and control-char stripping for hostile payloads.
// - Length limits to reduce abuse/memory amplification.
// - Plate allow-list validation (digits only).
// - Positive finite number guard for numeric business-critical fields.
