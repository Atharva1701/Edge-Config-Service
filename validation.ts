/**
 * Validation rules and helpers for config key/value input.
 */

const KEY_PATTERN = /^[a-zA-Z0-9_.\-:/]+$/;
const KEY_MAX_LENGTH = 128;
const VALUE_MAX_LENGTH = 10_240; // 10 KB

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a config key.
 * Keys must be alphanumeric with allowed special chars: _ . - : /
 */
export function validateKey(key: unknown): ValidationResult {
  if (typeof key !== "string" || key.trim() === "") {
    return { valid: false, error: "Key must be a non-empty string" };
  }
  if (key.length > KEY_MAX_LENGTH) {
    return {
      valid: false,
      error: `Key must be ${KEY_MAX_LENGTH} characters or fewer`,
    };
  }
  if (!KEY_PATTERN.test(key)) {
    return {
      valid: false,
      error:
        "Key may only contain letters, numbers, and the characters: _ . - : /",
    };
  }
  return { valid: true };
}

/**
 * Validates a config value.
 */
export function validateValue(value: unknown): ValidationResult {
  if (value === undefined || value === null) {
    return { valid: false, error: "Value is required" };
  }

  // Accept any JSON-serialisable primitive or object; stringify it
  const serialised =
    typeof value === "string" ? value : JSON.stringify(value);

  if (serialised.length > VALUE_MAX_LENGTH) {
    return {
      valid: false,
      error: `Value must be ${VALUE_MAX_LENGTH} bytes or fewer`,
    };
  }
  return { valid: true };
}

/**
 * Validates the POST /config request body.
 */
export function validateConfigBody(
  body: unknown
): ValidationResult & { key?: string; value?: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const { key, value } = body as Record<string, unknown>;

  const keyResult = validateKey(key);
  if (!keyResult.valid) return keyResult;

  const valueResult = validateValue(value);
  if (!valueResult.valid) return valueResult;

  const serialisedValue =
    typeof value === "string" ? value : JSON.stringify(value);

  return { valid: true, key: key as string, value: serialisedValue };
}
