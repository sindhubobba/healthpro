import LandingHero from './LandingHero';
import HowItWorks from './HowItWorks';
import CTABand from './CTABand';
import Footer from '@/components/layout/Footer';

export default function LandingPage() {
  return (
    <>
      <LandingHero />
      <hr style={{ border: 'none', borderTop: '1px solid rgba(30, 37, 30, 0.06)', margin: 0 }} />
      <HowItWorks />
      <CTABand />
      <Footer />
    </>
  );
}
