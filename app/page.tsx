import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import ProgramUnggulan from "@/components/ProgramUnggulan";
import SebaranGampong from "@/components/SebaranGampong";
import QrScannerSection from "@/components/QrScannerSection";
import TimelineSection from "@/components/TimelineSection";
import NewsSection from "@/components/NewsSection";
import DownloadSection from "@/components/DownloadSection";
import FaqSection from "@/components/FaqSection";
import ContactFooter from "@/components/ContactFooter";

export default function Home() {
  return (
    <main className="campus-shell min-h-screen text-[#1A202C] flex flex-col font-sans selection:bg-[#0F5132] selection:text-white">
      {/* Navigation */}
      <Navbar />

      {/* Main Homepage Sections */}
      <HeroSection />
      <AboutSection />
      <ProgramUnggulan />
      <SebaranGampong />
      <QrScannerSection />
      <TimelineSection />
      <NewsSection />
      <DownloadSection />
      <FaqSection />

      {/* Footer */}
      <ContactFooter />
    </main>
  );
}
