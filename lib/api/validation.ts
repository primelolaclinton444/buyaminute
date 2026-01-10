type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string> };

export async function parseBody<T>(
  req: Request,
  validator: (payload: unknown) => ValidationResult<T>
) {
  const json = await req.json().catch(() => null);
  return validator(json);
}

export function requireString(value: unknown, field: string, minLength = 1) {
  if (typeof value !== "string") {
    return `${field} is required.`;
  }
  if (value.trim().length < minLength) {
    return `${field} must be at least ${minLength} characters.`;
  }
  return null;
}

export function requireEmail(value: unknown, field: string) {
  if (typeof value !== "string") {
    return `${field} is required.`;
  }
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!pattern.test(value)) {
    return `${field} must be a valid email.`;
  }
  return null;
}

export function hasErrors(errors: Record<string, string>) {
  return Object.keys(errors).length > 0;
}
