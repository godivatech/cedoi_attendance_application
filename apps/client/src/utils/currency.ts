/**
 * Currency formatting utilities for Indian Rupees (INR)
 * Handles cross-platform fallbacks for environment/runtime differences (Web, Android, iOS).
 */

export function formatRupees(amount: number | string): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) return '₹0';

  try {
    // Intl is standard on modern environments but can sometimes fail on very old Android JSC runtimes.
    if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(numericAmount);
    }
  } catch (e) {
    // Fallback if Intl fails
    console.warn('Intl currency formatting failed, using fallback formatter', e);
  }

  // Fallback pure JS Indian numbering formatting
  const rounded = Math.round(numericAmount).toString();
  const lastThree = rounded.substring(rounded.length - 3);
  const otherNumbers = rounded.substring(0, rounded.length - 3);
  const formattedOther = otherNumbers !== '' 
    ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," 
    : "";
  return `₹${formattedOther}${lastThree}`;
}
