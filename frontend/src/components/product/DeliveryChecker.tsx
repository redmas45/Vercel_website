import { useState } from 'react';
import { checkPincode } from '../../lib/productApi';
import type { PincodeEstimate } from '../../lib/types';

export function DeliveryChecker() {
  const [pincode, setPincode] = useState('');
  const [estimate, setEstimate] = useState<PincodeEstimate | null>(null);
  const [error, setError] = useState('');

  async function check(): Promise<void> {
    setError('');
    const clean = pincode.trim();
    if (!clean) {
      setEstimate(null);
      setError('Enter a pincode to check delivery.');
      return;
    }
    try {
      setEstimate(await checkPincode(clean));
    } catch {
      setEstimate(null);
      setError('Delivery estimate is unavailable for this pincode.');
    }
  }

  return (
    <section className="grid gap-2 border-b border-[var(--color-border)] py-4">
      <p className="text-[12px] text-[var(--color-muted)]">Delivery</p>
      <div className="flex gap-2">
        <input
          className="h-9 min-w-0 flex-1 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[13px]"
          value={pincode}
          onChange={(event) => setPincode(event.target.value)}
          inputMode="numeric"
          placeholder="Enter pincode"
        />
        <button className="h-9 rounded-[8px] bg-[var(--color-ink)] px-4 text-[12px] text-[var(--color-paper)]" type="button" onClick={check}>
          Check
        </button>
      </div>
      {estimate ? (
        <p className="text-[12px] text-[var(--color-ink)]">Delivered by {estimate.estimate} to {estimate.city}. Free delivery.</p>
      ) : (
        <p className="text-[12px] text-[var(--color-muted)]">{error || 'Check availability, delivery date, and free shipping for your area.'}</p>
      )}
    </section>
  );
}
