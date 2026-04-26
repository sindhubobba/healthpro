import styles from './SpecialtyTag.module.css';

type Tone = 'copper' | 'sage' | 'teal';

const TONE_BY_SPECIALTY: Record<string, Tone> = {
  cardiology: 'copper',
  endocrinology: 'sage',
  pulmonology: 'teal',
};

function toneFor(label: string): Tone {
  return TONE_BY_SPECIALTY[label.toLowerCase()] ?? 'sage';
}

export default function SpecialtyTag({ label }: { label: string }) {
  const tone = toneFor(label);
  return <span className={`${styles.tag} ${styles[tone]}`}>{label}</span>;
}
