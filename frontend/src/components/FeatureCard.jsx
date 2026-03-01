import { motion } from "framer-motion";

export default function FeatureCard({ title, text, tag }) {
  return (
    <motion.article
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
      className="glass-card p-5 shadow-ember"
    >
      <span className="text-xs text-neon uppercase tracking-wider">{tag}</span>
      <h3 className="text-lg font-semibold mt-2">{title}</h3>
      <p className="text-mist mt-2 text-sm leading-relaxed">{text}</p>
    </motion.article>
  );
}
