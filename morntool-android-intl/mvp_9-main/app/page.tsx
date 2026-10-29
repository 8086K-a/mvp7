import { HeroSection } from "@/components/hero-section"
import { FeatureGrid } from "@/components/feature-grid"
import { SocialProof } from "@/components/social-proof"
import { ViralDemo } from "@/components/viral-demo"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <HeroSection />
      <ViralDemo />
      <FeatureGrid />
      <SocialProof />
    </div>
  )
}
