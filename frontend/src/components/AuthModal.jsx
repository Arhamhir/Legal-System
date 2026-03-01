import { useState } from "react";
import { supabase } from "../lib/supabase";

const missingSupabaseMessage =
  "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env, then restart Vite.";

const invalidCredentialsMessage =
  "Enter a valid email and a password with at least 6 characters.";

export default function AuthModal({ open, onClose }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (!open) {
    return null;
  }

  const handleSignUp = async () => {
    if (!supabase) return setMessage(missingSupabaseMessage);
    if (!email.includes("@") || password.length < 6) {
      setMessage(invalidCredentialsMessage);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Signup successful. Check your email to confirm.");
    onClose?.();
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

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Signed in successfully.");
    onClose?.();
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
      return;
    }

    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Close sign in dialog"
      />

      <div className="relative w-full max-w-md glass-card p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Account Access</h3>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg border border-white/15 bg-white/5 text-mist hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <p className="text-sm text-mist mt-2">
          Sign in or create an account to save upload history, risk reports, and safer recommendations.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
              mode === "signin" ? "bg-neon text-white" : "text-mist hover:bg-white/5"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
              mode === "signup" ? "bg-neon text-white" : "text-mist hover:bg-white/5"
            }`}
          >
            Sign Up
          </button>
        </div>

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
          {mode === "signin" ? (
            <button className="cta-btn bg-neon text-white" onClick={handleSignIn} disabled={loading}>
              Sign In
            </button>
          ) : (
            <button className="cta-btn bg-neon text-white" onClick={handleSignUp} disabled={loading}>
              Create Account
            </button>
          )}
          <button className="cta-btn bg-ember text-white" onClick={handleGoogleAuth} disabled={loading}>
            Continue with Google
          </button>
        </div>

        {message ? <p className="text-sm text-mist mt-3">{message}</p> : null}
      </div>
    </div>
  );
}
