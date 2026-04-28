import styles from './Footer.module.css';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className={styles.footer}>
      <div className="hp-container">
        &copy; {year} Gia. Built for physicians. All peer knowledge is de-identified and HIPAA-compliant.
      </div>
    </footer>
  );
}
