// src/pages/Payments.jsx
import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { PaymentsAPI, LoansAPI, CustomersAPI } from "../services/api";

function formatUSD(n) {
  const num = Number(n || 0);
  return num.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function Payments() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [payments, setPayments] = useState([]);
  const [loans, setLoans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setErr("");
      try {
        const [p, l, c] = await Promise.all([
          PaymentsAPI.list(),   // /api/payments/
          LoansAPI.list(),      // /api/loans/
          CustomersAPI.list(),  // /api/customers/
        ]);

        if (!mounted) return;
        setPayments(Array.isArray(p) ? p : p.results || []);
        setLoans(Array.isArray(l) ? l : l.results || []);
        setCustomers(Array.isArray(c) ? c : c.results || []);
      } catch (e) {
        console.error("Failed to load payments:", e);
        setErr("Failed to load payments. Please ensure you are logged in and the API is running.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => (mounted = false);
  }, []);

  // Build helper maps
  const loanById = useMemo(() => {
    const map = new Map();
    for (const l of loans) map.set(l.id, l);
    return map;
  }, [loans]);

  const customerById = useMemo(() => {
    const map = new Map();
    for (const c of customers) map.set(c.id, c);
    return map;
  }, [customers]);

  const rows = useMemo(() => {
    return payments.map((p) => {
      const loan = loanById.get(p.loan) || {};
      const customer =
        customerById.get(loan.customer) ||
        customerById.get(loan.customer_id) || {}; // cover different serializer keys

      const customerName = [customer.first_name, customer.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();

      return {
        id: p.id,
        loanId: p.loan,
        amount: p.amount,
        date: p.payment_date,
        note: p.note || "",
        customerName: customerName || "—",
      };
    });
  }, [payments, loanById, customerById]);

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter(
      (r) =>
        String(r.id).includes(q) ||
        String(r.loanId).includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        (r.note || "").toLowerCase().includes(q)
    );
  }, [rows, query]);

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Payments</h1>
            <p className="text-sm text-neutral-400">
              All recorded payments with loan & customer mapping.
            </p>
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by customer, loan, note…"
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-500 outline-none focus:border-blue-500"
          />
        </div>

        {loading && (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 text-neutral-300">
            Loading payments…
          </div>
        )}

        {!loading && err && (
          <div className="rounded-lg border border-red-700/40 bg-red-950/40 p-4 text-red-200">
            {err}
          </div>
        )}

        {!loading && !err && (
          <div className="overflow-x-auto rounded-lg border border-neutral-800">
            <table className="min-w-full divide-y divide-neutral-800">
              <thead className="bg-neutral-950">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">
                    Loan
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">
                    Payment Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">
                    Note
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 bg-neutral-900/60">
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-neutral-400"
                    >
                      No payments found.
                    </td>
                  </tr>
                )}

                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-900/80">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-200">
                      #{r.id}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-200">
                      Loan #{r.loanId}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-200">
                      {r.customerName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-emerald-300">
                      {formatUSD(r.amount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-300">
                      {r.date || "—"}
                    </td>
                    <td className="max-w-[24rem] truncate px-4 py-3 text-sm text-neutral-400">
                      {r.note || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}