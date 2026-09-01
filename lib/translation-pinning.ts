/**
 * Glossary pinning for machine translation (D-019). Protected forms — concept
 * bridge terms and maths tokens — are swapped for placeholders before the
 * call and restored after it, so a term can never drift between screens. A
 * translation that loses a placeholder is rejected rather than repaired.
 */
const placeholder = (index: number) => `⟦${index}⟧`;
const PLACEHOLDER_PATTERN = /⟦\d+⟧/;

export function pinProtectedForms(text: string, protectedForms: readonly string[]) {
  const forms = [...new Set(protectedForms.filter(Boolean))].sort((a, b) => b.length - a.length);
  const pinned: string[] = [];
  let output = text;
  for (const form of forms) {
    if (!output.includes(form)) continue;
    const index = pinned.push(form) - 1;
    output = output.split(form).join(placeholder(index));
  }
  return { text: output, pinned };
}

export function restoreProtectedForms(text: string, pinned: readonly string[]) {
  let output = text;
  for (let index = 0; index < pinned.length; index += 1) {
    const marker = placeholder(index);
    if (!output.includes(marker)) return null;
    output = output.split(marker).join(pinned[index]);
  }
  return PLACEHOLDER_PATTERN.test(output) ? null : output;
}

export function mathsTokensIn(text: string) {
  return text.match(/\d+\/\d+|\d+(?:\.\d+)?|[=÷×+−]/g) ?? [];
}
