/**
 * Vue composable for common formatting utilities
 *
 * Provides consistent formatting functions for dates, phone numbers,
 * and currency values across the application.
 */

/**
 * Return type for useFormatters composable
 */
export interface UseFormattersReturn {
  /** Format a date to [date, time] strings */
  formatDateTime: (date: Date) => [string, string]
  /** Format a phone number for display */
  formatPhone: (phone: string) => string
  /** Format a number as currency */
  formatCurrency: (amount: number) => string
  /** Get today's date as a formatted string */
  getTodayFormatted: () => string
}

/**
 * Vue composable for common formatting utilities
 *
 * @example
 * ```typescript
 * const { formatDateTime, formatPhone, formatCurrency } = useFormatters()
 *
 * const [date, time] = formatDateTime(new Date())
 * const phone = formatPhone('1234567890') // (123) 456-7890
 * const price = formatCurrency(12.5) // $12.50
 * ```
 */
export function useFormatters(): UseFormattersReturn {
  /**
   * Format a date to separate date and time strings
   */
  function formatDateTime(date: Date): [string, string] {
    const d = new Date(date)
    const dateStr = d.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
    })
    const timeStr = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
    return [dateStr, timeStr]
  }

  /**
   * Format a phone number for display
   * Converts 10-digit numbers to (XXX) XXX-XXXX format
   */
  function formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    // Handle 11-digit numbers starting with 1
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
    }
    return phone
  }

  /**
   * Format a number as USD currency
   */
  function formatCurrency(amount: number): string {
    return `$${amount.toFixed(2)}`
  }

  /**
   * Get today's date as a formatted string
   */
  function getTodayFormatted(): string {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    })
  }

  return {
    formatDateTime,
    formatPhone,
    formatCurrency,
    getTodayFormatted,
  }
}

export default useFormatters
