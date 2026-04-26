import Link from 'next/link';
import styles from './LandingHero.module.css';

export default function LandingHero() {
  return (
    <section className={styles.hero}>
      <div className="hp-container">
        <div className={styles.grid}>
          <div className="reveal d1">
            <div className={styles.eyebrow}>For physicians, by physicians</div>
            <h1 className={styles.title}>
              The knowledge your peers already <em>shared</em>
            </h1>
            <p className={styles.sub}>
              Gia turns doctor-to-doctor consultations into a searchable knowledge base.
              Ask a clinical question, get instant answers sourced from real specialist discussions.
            </p>
            <div className={styles.actions}>
              <Link href="/questions/new" className="hp-btn hp-btn-fill">
                Ask your first question
              </Link>
              <Link href="#how" className="hp-btn hp-btn-outline">
                See how it works
              </Link>
            </div>

            <div className={styles.proof}>
              <div className={styles.avatarStack} aria-hidden="true">
                <span className={styles.av} style={{ background: 'var(--sage)' }}>MT</span>
                <span className={styles.av} style={{ background: 'var(--copper)' }}>JR</span>
                <span className={styles.av} style={{ background: 'var(--teal)' }}>AP</span>
                <span className={styles.av} style={{ background: 'var(--ink3)' }}>SN</span>
              </div>
              <div className={styles.proofText}>
                <strong>2,400+</strong> physicians in the network
              </div>
            </div>
          </div>

          <div className={`${styles.visual} reveal d3`}>
            <div className={`${styles.float} ${styles.float1}`} aria-hidden="true" />
            <div className={`${styles.float} ${styles.float2}`} aria-hidden="true" />
            <div className={`${styles.float} ${styles.float3}`} aria-hidden="true" />

            <div className={styles.mockup} aria-hidden="true">
              <div className={styles.mockupHeader}>
                <div className={styles.mockupDots}>
                  <span className={styles.mockupDot} />
                  <span className={styles.mockupDot} />
                  <span className={styles.mockupDot} />
                </div>
                <div className={styles.mockupBar} />
              </div>
              <div className={styles.mockupBody}>
                <div className={styles.mockupQ}>
                  &ldquo;How do you manage anticoagulation for AFib in a hemodialysis patient?&rdquo;
                </div>
                <div className={styles.mockupReply}>
                  <div className={styles.mockupReplyHead}>
                    <span className={styles.mockupReplyDot} />
                    <span className={styles.mockupReplyLabel}>Gia says</span>
                  </div>
                  <div className={styles.mockupReplyText}>
                    Expert discussions indicate DOACs like apixaban are generally preferred per
                    ACC/AHA 2023 guidelines. However, hemodialysis presents distinct
                    considerations not covered in current conversations…
                  </div>
                  <div className={styles.mockupSource}>
                    <span className={styles.mockupSourceAv}>MT</span>
                    <span className={styles.mockupSourceText}>
                      Based on Dr. Michelle Taylor, Pulmonology
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
