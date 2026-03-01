function cleanEnvValue(value) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

export function getEnvValue(...keys) {
  for (const key of keys) {
    const raw = import.meta.env?.[key];
    const value = cleanEnvValue(raw);
    if (value) {
      return value;
    }
  }

  return "";
}
