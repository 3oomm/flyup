import { useEffect, useState } from 'react';

export function useCurrentTime() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = window.setInterval(update, 60_000);
    document.addEventListener('visibilitychange', update);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return now;
}
