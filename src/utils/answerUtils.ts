/**
 * Utility functions for robust answer normalization and matching across all exercise types.
 * Safely handles:
 * - Special characters: . , ! ? ; : " ' ` “ ” ‘ ’ ( ) { } [ ] - – — / \ ~ _ # *
 * - Typographic / smart punctuation from mobile keyboards (smart quotes, smart apostrophes)
 * - Trailing/leading punctuation (e.g. "apple." vs "apple")
 * - Parentheses with optional text (e.g. "(to) go" matches both "to go" and "go")
 * - Slashes and pipes for alternative answers (e.g. "color / colour")
 * - Whitespace and case insensitivity
 */

export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B\u2032']/g, "'") // Normalize smart apostrophes to '
    .replace(/[\u201C\u201D\u201E\u201F"]/g, '"') // Normalize smart quotes to "
    .replace(/[\u2013\u2014\u2212]/g, '-')         // Normalize en/em dashes to -
    .replace(/\u2026/g, '...')                     // Normalize ellipsis … to ...
    .replace(/\u00A0/g, ' ')                       // Non-breaking space to regular space
    .trim();
}

/**
 * Strips punctuation and symbols for pure semantic / token comparison.
 * Keeps letters and digits, but removes punctuation marks that may or may not be typed by students.
 */
export function cleanPunctuation(text: string): string {
  return normalizeText(text)
    .replace(/[.,!?;:()[\]{}'"`“”—–~_#*^&/\\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips all punctuation and spaces down to raw alphanumeric and accented characters.
 * Useful for matching hyphenated words ("ice-cream" vs "icecream"), contractions ("don't" vs "dont"),
 * abbreviations ("U.S.A." vs "USA", "Dr." vs "Dr"), or spelling tiles without punctuation.
 */
export function stripToAlphanumeric(text: string): string {
  return normalizeText(text)
    .replace(/[^a-z0-9à-ỹ]/gi, '');
}

/**
 * Checks if a user's answer matches any acceptable target answer:
 * - Supports alternatives separated by '/' or '|'.
 * - Supports optional parts in parentheses like "(to) go" or "live (lives)" or "(have) lived".
 * - Tolerates punctuation differences (e.g. "don't" vs "don't.", "apple" vs "apple.", "(happy)" vs "happy").
 * - Tolerates typographic apostrophes and quotes (e.g. "don’t" matches "don't").
 * - Tolerates hyphenation and contraction differences (e.g. "ice-cream" matches "icecream", "don't" matches "dont").
 */
export function isAnswerMatch(userAnswer: string, targetAnswer: string): boolean {
  if (!userAnswer && !targetAnswer) return true;
  if (!userAnswer || !targetAnswer) return false;

  const rawUser = normalizeText(userAnswer);
  const cleanUser = cleanPunctuation(rawUser);
  const strippedUser = stripToAlphanumeric(rawUser);

  // Split target by / or | for multiple options
  const alternatives = targetAnswer.split(/\s*[/|]\s*/).filter(Boolean);

  return alternatives.some(alt => {
    const rawAlt = normalizeText(alt);
    const cleanAlt = cleanPunctuation(rawAlt);
    const strippedAlt = stripToAlphanumeric(rawAlt);

    // 1. Direct match with standard normalization
    if (rawUser === rawAlt) return true;

    // 2. Cleaned punctuation match
    if (cleanUser && cleanAlt && cleanUser === cleanAlt) return true;

    // 3. Stripped alphanumeric match (handles hyphens, apostrophes, dots, symbols)
    if (strippedUser && strippedAlt && strippedUser === strippedAlt) return true;

    // 4. Handle optional parenthetical text in target: e.g. "(to) go" -> "to go" or "go"
    if (rawAlt.includes('(') && rawAlt.includes(')')) {
      // Version with parenthesis text removed: e.g. "(to) go" -> "go"
      const withoutParens = cleanPunctuation(rawAlt.replace(/\(.*?\)/g, ' '));
      // Version with parentheses stripped but content kept: e.g. "(to) go" -> "to go"
      const withParensContent = cleanPunctuation(rawAlt.replace(/[()]/g, ' '));

      if (withoutParens && cleanUser === withoutParens) return true;
      if (withParensContent && cleanUser === withParensContent) return true;

      const strippedWithout = stripToAlphanumeric(withoutParens);
      const strippedWith = stripToAlphanumeric(withParensContent);
      if (strippedWithout && strippedUser === strippedWithout) return true;
      if (strippedWith && strippedUser === strippedWith) return true;
    }

    // 5. Handle curly braces or square brackets: e.g. "{go}" or "[go]"
    if ((rawAlt.includes('{') && rawAlt.includes('}')) || (rawAlt.includes('[') && rawAlt.includes(']'))) {
      const strippedBrackets = cleanPunctuation(rawAlt.replace(/[{}[\]]/g, ' '));
      if (strippedBrackets && cleanUser === strippedBrackets) return true;
      const strippedBracketsAlpha = stripToAlphanumeric(strippedBrackets);
      if (strippedBracketsAlpha && strippedUser === strippedBracketsAlpha) return true;
    }

    return false;
  });
}
