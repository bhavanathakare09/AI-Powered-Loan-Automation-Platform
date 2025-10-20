// src/components/KPI.jsx
import { motion } from "framer-motion";

/**
 * props:
 *  - label (string)
 *  - value (string | number)
 *  - hint  (string)
 *  - icon  (Lucide icon component)
 *  - delay (number)
 */
export default function KPI({ label, value, hint, icon: Icon, delay = 0 }) {
  return (
    <motion.div
      className="rounded-xl border border-neutral-800/70 bg-neutral-900/70 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.18)]"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 280, damping: 22 }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-neutral-400">{label}</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
        </div>
        {Icon ? (
          <div className="rounded-lg bg-neutral-800/70 border border-neutral-700 p-2">
            <Icon className="h-5 w-5 text-sky-300" />
          </div>
        ) : null}
      </div>
      {hint ? <div className="mt-3 text-xs text-neutral-400">{hint}</div> : null}
    </motion.div>
  );
}