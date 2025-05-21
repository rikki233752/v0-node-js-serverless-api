/**
 * Formats a phone number string into a readable format
 * @param phoneNumber - The phone number to format (e.g., "+19787836427")
 * @returns Formatted phone number (e.g., "+1 (978) 783-6427")
 */
export function formatPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return "Unknown Number"

  // Handle E.164 format (starting with +)
  if (phoneNumber.startsWith("+")) {
    // For US/Canada numbers (+1XXXXXXXXXX)
    if (phoneNumber.startsWith("+1") && phoneNumber.length === 12) {
      return `+1 (${phoneNumber.substring(2, 5)}) ${phoneNumber.substring(5, 8)}-${phoneNumber.substring(8)}`
    }

    // For other international numbers, just add spaces
    return phoneNumber.replace(/(\+\d{1,3})(\d{3})(\d{3})(\d{4})/, "$1 $2 $3 $4")
  }

  // Handle 10-digit US format without country code
  if (phoneNumber.length === 10 && /^\d+$/.test(phoneNumber)) {
    return `(${phoneNumber.substring(0, 3)}) ${phoneNumber.substring(3, 6)}-${phoneNumber.substring(6)}`
  }

  // If the number is already formatted or has an unknown format, return as is
  return phoneNumber
}

/**
 * Normalizes a phone number by removing all non-digit characters
 * @param phoneNumber - The phone number to normalize
 * @returns Normalized phone number containing only digits
 */
export function normalizePhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return ""
  return phoneNumber.replace(/\D/g, "")
}
