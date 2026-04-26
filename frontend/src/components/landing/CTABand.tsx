import Link from 'next/link';
import styles from './CTABand.module.css';

export default function CTABand() {
  return (
    <div className={`${styles.band} reveal d2`}>
      <div className={styles.title}>
        Stop re-asking the same experts.
        <br />
        Start finding what they already said.
      </div>
      <div className={styles.sub}>
        Join the physician network that remembers every consultation — so you don&rsquo;t have to.
      </div>
      <Link href="/signup" className={styles.btn}>
        Get started free
      </Link>
    </div>
  );
}
