import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";

const missingSupabaseMessage =
  "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env, then restart Vite.";

const invalidCredentialsMessage =
  "Enter a valid email and a password with at least 6 characters.";

export default function AuthPanel({ user, onSignedOut }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSignUp = async () => {
    if (!supabase) return setMessage(missingSupabaseMessage);
    if (!email.includes("@") || password.length < 6) {
      setMessage(invalidCredentialsMessage);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    setMessage(error ? error.message : "Signup successful. Check your email to confirm.");
  };

  const handleSignIn = async () => {
    if (!supabase) return setMessage(missingSupabaseMessage);
    if (!email.includes("@") || password.length < 6) {
      setMessage(invalidCredentialsMessage);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    setMessage(error ? error.message : "Signed in successfully.");
  };

  const handleGoogleAuth = async () => {
    if (!supabase) return setMessage(missingSupabaseMessage);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
    if (error) {
      if (error.message?.toLowerCase().includes("unsupported provider")) {
        setMessage(
          "Google OAuth is disabled in Supabase. Enable Google provider in Authentication > Providers, then add your site URL to Redirect URLs."
        );
        return;
      }
      setMessage(error.message);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    onSignedOut?.();
  };

  if (user) {
    return (
      <section className="glass-card p-5 self-start h-fit">
        <h3 className="text-lg font-semibold">Session</h3>
        <p className="text-sm text-mist mt-2">Signed in as {user.email}</p>
        <button className="cta-btn mt-4 bg-white/10 border border-white/15" onClick={handleSignOut}>
          Sign Out
        </button>
      </section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-card p-6"
    >
      <h3 className="text-lg font-semibold">Authentication</h3>
      <p className="text-sm text-mist mt-2">Email/password and Google OAuth</p>

      <div className="mt-4 grid gap-3">
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-neon"
        />
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          type="password"
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-neon"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button className="cta-btn bg-neon text-white" onClick={handleSignIn} disabled={loading}>
          Sign In
        </button>
        <button className="cta-btn bg-white/10 border border-white/15" onClick={handleSignUp} disabled={loading}>
          Sign Up
        </button>
        <button className="cta-btn bg-ember text-white" onClick={handleGoogleAuth} disabled={loading}>
          Continue with Google
        </button>
      </div>

      {message ? <p className="text-sm text-mist mt-3">{message}</p> : null}
    </motion.section>
  );
}
