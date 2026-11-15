export const CLUB_INTRODUCTION_MAX_CHARACTERS = 100;
export const CLUB_INTRODUCTION_LIMIT_ERROR =
  `Introduction must be no more than ${CLUB_INTRODUCTION_MAX_CHARACTERS} characters.`;

// Count Unicode code points, including spaces, consistently in every language.
export function countClubIntroductionCharacters(value: string): number {
  return Array.from(value).length;
}
