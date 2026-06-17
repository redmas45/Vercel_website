import type { OrbState } from '../../lib/types';

interface VoiceOrbProps {
  state: OrbState;
}

/**
 * The persistent fixed-position Voice Orb.
 *
 * CSS states: orb--idle, orb--listening, orb--speaking
 * (driven by useVoiceWidget via CustomEvent("shopbot:orb-state"))
 *
 * DOM ID: shopbot-voice-orb  ← the hub's shopbot.js attaches to this element.
 */
export function VoiceOrb({ state }: VoiceOrbProps) {
  return (
    <div
      id="shopbot-voice-orb"
      data-shopbot-trigger="true"
      data-orb-state={state}
      className={`orb--${state} fixed bottom-6 right-6 z-50`}
      aria-label="Voice shopping assistant"
      role="button"
      tabIndex={0}
      style={{ filter: 'drop-shadow(0 4px 16px rgba(42, 38, 34, 0.25))' }}
    >
      {/* Expanding ring (visible during listening) */}
      <span
        className="orb-ring absolute inset-0 rounded-full border-2 border-[var(--color-accent)] pointer-events-none"
        aria-hidden="true"
      />

      {/* Paper halo ring */}
      <span
        className="absolute inset-[-4px] rounded-full bg-[var(--color-paper)] z-[-1]"
        aria-hidden="true"
      />

      {/* Orb body */}
      <div className="orb-inner relative w-14 h-14 md:w-14 md:h-14 rounded-full bg-[var(--color-ink)] flex items-center justify-center cursor-pointer select-none">
        {/* Microphone icon */}
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-accent-light)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="9" y="2" width="6" height="11" rx="3" />
          <path d="M5 10a7 7 0 0 0 14 0" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="8" y1="22" x2="16" y2="22" />
        </svg>

        {/* State indicator dot */}
        {state === 'listening' && (
          <span className="absolute bottom-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--color-accent)]" />
        )}
        {state === 'speaking' && (
          <span className="absolute bottom-1.5 right-1.5 w-2 h-2 rounded-full bg-green-400" />
        )}
      </div>
    </div>
  );
}
