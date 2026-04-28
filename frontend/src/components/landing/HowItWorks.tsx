import styles from './HowItWorks.module.css';

const STEPS = [
  {
    number: '1',
    title: 'Ask anything clinical',
    desc: "Type your question naturally — no forms, no dropdowns. Just describe what you need to know the way you'd text a colleague.",
  },
  {
    number: '2',
    title: 'Get an instant match',
    desc: 'Gia searches prior specialist conversations and surfaces an attributed answer in seconds — no hallucination, only real peer knowledge.',
  },
  {
    number: '3',
    title: 'A specialist follows up',
    desc: 'Every question is routed to the most relevant expert in the network. They respond directly, adding to the knowledge base for the next physician.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className={styles.section}>
      <div className="hp-container">
        <div className={`${styles.header} reveal d1`}>
          <div className={styles.eyebrow}>How it works</div>
          <h2 className={styles.title}>Three steps to peer-sourced answers</h2>
        </div>
        <div className={styles.steps}>
          {STEPS.map((s, i) => (
            <div key={s.number} className={`${styles.step} reveal d${i + 2}`}>
              <div className={styles.number}>{s.number}</div>
              <div className={styles.stepTitle}>{s.title}</div>
              <div className={styles.stepDesc}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
