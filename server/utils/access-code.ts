export function normalizeAccessCode(input: string) {
  return input.trim().toUpperCase();
}

export function isValidAccessCodeInput(input: string) {
  return input.length >= 4 && input.length <= 80;
}
