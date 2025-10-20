import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function AddCustomer() {
  const [full_name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");
  const nav = useNavigate();

  async function save(e) {
    e.preventDefault();
    try {
      setErr("");
      await API.post("customers/", { full_name, email, phone });
      nav("/customers");
    } catch {
      setErr("Failed to save customer");
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg rounded-2xl border border-white/10 bg-neutral-900/60 p-6">
      <h1 className="text-xl font-semibold mb-4">Add Customer</h1>
      {err && <div className="mb-3 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{err}</div>}
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="text-sm text-neutral-300">Full Name</label>
          <input
            className="mt-1 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
            value={full_name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-sm text-neutral-300">Email</label>
          <input
            type="email"
            className="mt-1 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
          />
        </div>
        <div>
          <label className="text-sm text-neutral-300">Phone</label>
          <input
            className="mt-1 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1-XXXX"
          />
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => nav("/customers")}
            className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-medium text-black hover:bg-brand-600"
          >
            Save Customer
          </button>
        </div>
      </form>
    </div>
  );
}