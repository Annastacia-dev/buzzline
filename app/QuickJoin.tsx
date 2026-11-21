'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from './landing.module.css';

/** Hero PIN box: hands off to /join with the PIN pre-filled. */
export default function QuickJoin() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    router.push(pin ? `/join?pin=${encodeURIComponent(pin)}` : '/join');
  };
  return (
    <form className={styles.quickJoin} onSubmit={submit}>
      <input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={6}
        placeholder="Game PIN" aria-label="Game PIN" />
      <button className="btn" type="submit">Join</button>
    </form>
  );
}
