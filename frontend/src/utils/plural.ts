/**
 * Russian noun pluralization after a count: 1 гость, 2 гостя, 5 гостей.
 * `forms` is [one, few, many] — the three grammatical plural forms.
 */
export function pluralRu(count: number, forms: readonly [string, string, string]): string {
  const abs = Math.abs(count) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (last === 1) return forms[0];
  if (last > 1 && last < 5) return forms[1];
  return forms[2];
}
