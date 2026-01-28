/**
 * Vue composable for audio notifications
 *
 * Provides a simple interface for playing notification sounds
 * using the Web Audio API with graceful fallback.
 */

interface WebkitWindow extends Window {
  webkitAudioContext?: typeof AudioContext
}

/**
 * Configuration options for useNotification
 */
export interface UseNotificationOptions {
  /** Oscillator frequency in Hz (default: 800) */
  frequency?: number
  /** Oscillator type (default: 'sine') */
  oscillatorType?: OscillatorType
  /** Initial gain/volume 0-1 (default: 0.3) */
  volume?: number
  /** Duration in seconds (default: 0.3) */
  duration?: number
}

/**
 * Return type for useNotification composable
 */
export interface UseNotificationReturn {
  /** Play the notification sound */
  playNotification: () => void
  /** Whether audio is supported in this browser */
  isAudioSupported: boolean
}

/**
 * Vue composable for playing notification sounds
 *
 * Uses the Web Audio API to generate simple notification beeps.
 * Gracefully handles browsers that don't support audio or block autoplay.
 *
 * @example
 * ```typescript
 * const { playNotification } = useNotification()
 *
 * // Play notification when new order arrives
 * playNotification()
 * ```
 */
export function useNotification(options: UseNotificationOptions = {}): UseNotificationReturn {
  const {
    frequency = 800,
    oscillatorType = 'sine',
    volume = 0.3,
    duration = 0.3,
  } = options

  // Check for audio support
  const windowWithWebkit = window as WebkitWindow
  const AudioContextClass = window.AudioContext || windowWithWebkit.webkitAudioContext
  const isAudioSupported = !!AudioContextClass

  // Reusable audio context (created on first use)
  let audioContext: AudioContext | null = null

  /**
   * Get or create the audio context
   * Created lazily to avoid issues with autoplay policies
   */
  function getAudioContext(): AudioContext | null {
    if (!isAudioSupported) {
      return null
    }

    if (!audioContext || audioContext.state === 'closed') {
      try {
        audioContext = new AudioContextClass()
      } catch {
        console.warn('[Notification] Failed to create AudioContext')
        return null
      }
    }

    // Resume if suspended (browser autoplay policy)
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {
        console.warn('[Notification] Failed to resume AudioContext')
      })
    }

    return audioContext
  }

  /**
   * Play the notification sound
   */
  function playNotification(): void {
    const ctx = getAudioContext()
    if (!ctx) {
      return
    }

    try {
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.frequency.value = frequency
      oscillator.type = oscillatorType

      // Smooth volume envelope to avoid clicks
      const now = ctx.currentTime
      gainNode.gain.setValueAtTime(volume, now)
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration)

      oscillator.start(now)
      oscillator.stop(now + duration)
    } catch {
      // Silently fail if audio playback fails
      // This can happen due to browser restrictions
    }
  }

  return {
    playNotification,
    isAudioSupported,
  }
}

export default useNotification
