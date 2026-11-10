const KEY_PATTERN = /^[a-zA-Z0-9_.\-:/]+$/;
const MAX_KEY_LENGTH = 128;
const MAX_VALUE_LENGTH = 10_240;

export function validateConfigInput(key: string, value: string): string[] {
  const errors: string[] = [];
  if (!key || key.trim() === "") errors.push("Key must not be empty.");
  if (key.length > MAX_KEY_LENGTH) errors.push(`Key must be ${MAX_KEY_LENGTH} characters or fewer.`);
  if (key && !KEY_PATTERN.test(key)) {
    errors.push("Key may contain only letters, numbers, underscore, period, hyphen, colon, and slash.");
  }
  if (typeof value !== "string") errors.push("Value must be a string.");
  if (value.length > MAX_VALUE_LENGTH) errors.push(`Value must be ${MAX_VALUE_LENGTH} characters or fewer.`);
  return errors;
}
