/**
 * Generates search keywords array for Firestore queries.
 * Normalizes strings by lowercasing and splitting names/companies,
 * allowing case-insensitive field search.
 */
export function generateSearchKeywords(
  fullName: string,
  companyName: string,
  mobileNumber: string
): string[] {
  const keywords = new Set<string>();

  // Full name processing
  if (fullName) {
    const nameParts = fullName.toLowerCase().trim().split(/\s+/);
    nameParts.forEach(part => {
      if (part) keywords.add(part);
    });
  }

  // Company name processing
  if (companyName) {
    const companyParts = companyName.toLowerCase().trim().split(/\s+/);
    companyParts.forEach(part => {
      if (part) keywords.add(part);
    });
  }

  // Mobile number
  if (mobileNumber) {
    const cleanedMobile = mobileNumber.trim();
    if (cleanedMobile) keywords.add(cleanedMobile);
  }

  return Array.from(keywords);
}
