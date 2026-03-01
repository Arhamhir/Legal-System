import { motion } from "framer-motion";
import Hero from "./components/Hero";
import FeatureCard from "./components/FeatureCard";
import UploadPanel from "./components/UploadPanel";
import DashboardPanel from "./components/DashboardPanel";
import AuthModal from "./components/AuthModal";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

const features = [
  {
    title: "Clause Simplification",
    text: "Rewrites legal clauses into plain English without losing legal intent.",
    tag: "AI Explain"
  },
  {
    title: "Risk Scoring",
    text: "Highlights high-risk terms with clause-level and overall contract scores.",
    tag: "0-100 Score"
  },
  {
    title: "Safer Alternatives",
    text: "Generates balanced alternatives and practical negotiation suggestions.",
    tag: "Negotiation Ready"
  }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [analysisRefreshSignal, setAnalysisRefreshSignal] = useState(0);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [latestAnalysis, setLatestAnalysis] = useState(null);

  const scrollToId = (id) => {
    const section = document.getElementById(id);
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAnalysis = (result) => {
    if (!result) {
      return;
    }
    setLatestAnalysis(result);
    setAnalysisRefreshSignal((current) => current + 1);
  };

  const handleSignOut = async () => {
    if (!supabase) {
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-obsidian text-slate-100 bg-aurora">
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      <Hero
        user={user}
        onStartAnalysis={() => {
          if (user) {
            scrollToId("upload-section");
            return;
          }
          setAuthModalOpen(true);
        }}
        onSignIn={() => setAuthModalOpen(true)}
        onSignOut={handleSignOut}
      />

      <main className="max-w-7xl mx-auto px-6 pb-20">
        <section className="grid md:grid-cols-3 gap-5 -mt-12 relative z-10">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </section>

        <section className="grid lg:grid-cols-2 gap-6 mt-8">
          <div id="upload-section">
            <UploadPanel userId={user?.id} userEmail={user?.email} onAnalysis={handleAnalysis} />
          </div>
          <div id="history-section">
            <DashboardPanel
              user={user}
              refreshSignal={analysisRefreshSignal}
              guestAnalysis={latestAnalysis}
              variant="primary"
            />
          </div>
        </section>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-mist mt-10 text-sm"
        >
          AI legal assistant for Pakistan • Not a replacement for a lawyer
        </motion.footer>
      </main>
    </div>
  );
}
