/** Her country from the phone's language settings, e.g. "US", "GB" (D-09 markets). */
export function deviceRegion(): string | undefined {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const region = new Intl.Locale(locale).region;
    if (region) return region;
    return /[-_]([A-Z]{2})\b/.exec(locale)?.[1];
  } catch {
    return undefined;
  }
}
