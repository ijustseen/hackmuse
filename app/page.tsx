import { ScrollProgress } from "@/components/effects/scroll-progress";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { MarqueeBands } from "@/components/landing/marquee-bands";
import { Panel } from "@/components/landing/panel";
import { RubricSection } from "@/components/landing/rubric-section";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";

export default function Home() {
  return (
    <>
      <ScrollProgress />
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <MarqueeBands />
        <Panel />
        <HowItWorks />
        <RubricSection />
      </main>
      <SiteFooter />
    </>
  );
}
