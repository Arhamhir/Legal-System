import { motion } from "framer-motion";
import ThreeScene from "./ThreeScene";

export default function Hero({ user, onStartAnalysis, onSignIn, onSignOut }) {
  return (
    <header className="relative overflow-hidden">
      <div className="absolute inset-0 opacity-60 pointer-events-none">
        <ThreeScene />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-28">
        <div className="flex items-center justify-between gap-4">
          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="inline-flex items-center gap-2 text-xs tracking-[0.18em] uppercase text-mist border border-white/15 rounded-full px-4 py-2 bg-white/5"
          >
            AI Legal Shield • Pakistan Focused
          </motion.p>

          {user ? (
            <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 backdrop-blur-md">
              <span className="text-xs text-mist hidden md:inline max-w-[220px] truncate">{user.email}</span>
              <button
                type="button"
                onClick={onSignOut}
                className="px-3 py-1.5 rounded-lg border border-white/15 bg-white/10 text-sm font-semibold text-slate-100 hover:bg-white/20 transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="px-4 py-2 rounded-xl border border-white/15 bg-white/10 text-sm font-semibold text-slate-100 hover:bg-white/20 transition-colors"
            >
              Sign In / Sign Up
            </button>
          )}
        </div>

        <motion.h1
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mt-5 text-4xl md:text-6xl font-bold leading-tight max-w-4xl neon-text"
        >
          Understand every contract before you sign.
        </motion.h1>

        <motion.p
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-mist text-lg max-w-2xl"
        >
          Upload legal documents, get plain-language clause breakdowns, risk classification,
          and safer alternatives in one sleek AI report.
        </motion.p>

        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 flex flex-wrap gap-4"
        >
          <button className="cta-btn bg-neon text-white" onClick={onStartAnalysis}>
            Start Free Analysis
          </button>
        </motion.div>
      </div>
    </header>
  );
}
