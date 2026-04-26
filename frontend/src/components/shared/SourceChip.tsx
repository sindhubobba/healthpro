import { Expert } from '@/types';
import Avatar from './Avatar';
import styles from './SourceChip.module.css';

interface SourceChipProps {
  expert: Expert;
  index?: number;
}

export default function SourceChip({ expert, index = 0 }: SourceChipProps) {
  const tone = index % 2 === 0 ? 'sage' : 'copper';
  return (
    <span className={styles.chip}>
      <Avatar name={expert.name} tone={tone} size={24} />
      <span>{expert.name}{expert.credentials ? `, ${expert.credentials}` : ''}</span>
    </span>
  );
}
