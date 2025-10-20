// src/components/AnimatedCard.jsx
import { motion } from "framer-motion";

export default function AnimatedCard({ className = "", children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut", delay }}
      whileHover={{ y: -3 }}
      className={`rounded-xl border border-neutral-800/70 bg-neutral-900/70 backdrop-blur-sm shadow-[0_8px_30px_rgba(0,0,0,0.20)] ${className}`}
    >
      {children}
    </motion.div>
  );
}