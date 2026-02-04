/**
 * Season utility functions.
 */

/**
 * Get the current NBA season in YYYY-YY format.
 */
export function getCurrentSeason(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // getMonth() returns 0-11

  // NBA season starts in October
  if (month >= 10) {
    return `${year}-${(year + 1) % 100}`;
  } else {
    return `${year - 1}-${year % 100}`;
  }
}

/**
 * Validate season format (YYYY-YY).
 */
export function isValidSeason(season: string): boolean {
  const seasonRegex = /^\d{4}-\d{2}$/;
  return seasonRegex.test(season);
}

/**
 * Get all seasons from a start year to current.
 */
export function getSeasonsFrom(startYear: number): string[] {
  const currentSeason = getCurrentSeason();
  const endYear = parseInt(currentSeason.split('-')[0]);
  const seasons: string[] = [];

  for (let year = startYear; year <= endYear; year++) {
    seasons.push(`${year}-${(year + 1) % 100}`);
  }

  return seasons;
}