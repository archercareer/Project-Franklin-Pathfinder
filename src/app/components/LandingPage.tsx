import React, { useState } from "react";
import { motion } from "motion/react";
import { Loader2, UserRound } from "lucide-react";
import logo from "../../imports/image.png";
import { useAuth } from "@/lib/AuthProvider";

export function LandingPage() {
  const { signIn, signUp, signInAsGuest } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) setError(error.message);
      } else {
        const { error, needsConfirmation } = await signUp(email, password, fullName);
        if (error) {
          setError(error.message);
        } else if (needsConfirmation) {
          setMessage("Check your email to confirm your account, then sign in.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const { error } = await signInAsGuest();
      if (error) setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-white relative flex flex-col items-center justify-center font-sans">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(23, 60, 122, 0.056) 1px, transparent 2px)",
          backgroundSize: "36px 36px",
        }}
      />

      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#306FB8]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-[#173C7A]/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="z-10 flex flex-col items-center max-w-lg text-center px-6"
      >
        <motion.img
          src={logo}
          alt="Franklin Logo"
          className="h-20 mb-8"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        />

        <motion.p
          className="text-lg text-gray-500 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          Navigate your professional journey with AI-driven insights and actionable advice.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="w-full max-w-sm flex flex-col gap-4"
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {!isLogin && (
              <input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#306FB8]/20 focus:border-[#306FB8] transition-all"
                required
                disabled={loading}
              />
            )}
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#306FB8]/20 focus:border-[#306FB8] transition-all"
              required
              disabled={loading}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#306FB8]/20 focus:border-[#306FB8] transition-all"
              required
              minLength={6}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#173C7A] hover:bg-[#112a57] disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3.5 rounded-xl shadow-sm hover:shadow transition-all active:scale-[0.98] mt-1 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {isLogin ? "Login" : "Sign Up"}
            </button>
          </form>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-left">
              {error}
            </p>
          )}
          {message && (
            <p className="text-sm text-[#173C7A] bg-[#306FB8]/10 border border-[#306FB8]/20 rounded-lg px-3 py-2 text-left">
              {message}
            </p>
          )}

          <p className="text-sm text-gray-500 mt-1">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setMessage(null);
              }}
              className="text-[#306FB8] hover:text-[#173C7A] font-medium transition-colors"
              disabled={loading}
            >
              {isLogin ? "Sign Up" : "Login"}
            </button>
          </p>

          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-sm text-gray-400 font-medium">OR</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <button
            type="button"
            onClick={handleGuest}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed px-6 py-3.5 rounded-xl text-gray-700 font-medium transition-all active:scale-[0.98]"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <UserRound size={20} />}
            <span>Continue as Guest</span>
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
