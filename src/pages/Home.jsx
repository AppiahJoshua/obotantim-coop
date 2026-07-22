import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import About from '../components/About';
import Products from '../components/Products';
import Impact from '../components/Impact';
import DirectorMessage from '../components/DirectorMessage';
import LoanCalculator from '../components/LoanCalculator';
import Gallery from '../components/Gallery';
import Testimonials from '../components/Testimonials';
import FAQ from '../components/FAQ';
import RegisterForm from '../components/RegisterForm';
import Contact from '../components/Contact';
import Footer from '../components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <About />
      <Products />
      <Impact />
      <DirectorMessage />
      <LoanCalculator />
      <Gallery />
      <Testimonials />
      <FAQ />
      <RegisterForm />
      <Contact />
      <Footer />
    </div>
  );
}
