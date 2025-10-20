import Layout from "../components/Layout";
import { useMemo } from "react";

export default function Settings() {
  const apiBase = useMemo(() => import.meta.env.VITE_API_BASE || "-", []);
  return (
    <Layout>
      <div className="max-w-2xl p-6">
        <h1 className="text-2xl font-semibold mb-2 text-white">Settings</h1>
        <p className="text-sm text-neutral-400 mb-6">Environment & Configuration</p>

        <div className="rounded-xl border border-white/10 bg-neutral-900/60 p-4">
          <div className="text-sm text-neutral-400">API Base URL</div>
          <div className="mt-1 font-mono text-sm text-white">{apiBase}</div>
          <p className="mt-2 text-xs text-neutral-500">
            Change by editing <code>.env</code> → <code>VITE_API_BASE</code> (must end with <code>/api/</code>)
          </p>
        </div>
      </div>
    </Layout>
  );
}