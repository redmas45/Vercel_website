import { useEffect, useState } from 'react';

const DAY_MS = 24 * 60 * 60 * 1000;

export function CountdownTimer() {
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = DAY_MS - (now % DAY_MS);
  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  return (
    <span className="font-[500]">
      {pad(hours)}:{pad(minutes)}:{pad(seconds)}
    </span>
  );
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}
