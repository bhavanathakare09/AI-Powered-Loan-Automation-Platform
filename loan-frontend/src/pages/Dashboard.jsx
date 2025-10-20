// // src/pages/Dashboard.jsx
// import { useEffect, useMemo, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import Sidebar from "../components/Sidebar";
// import Header from "../components/Header";
// import { motion } from "framer-motion";
// import { Users, Banknote, Landmark, Receipt, ArrowRight } from "lucide-react";
// import { CustomersAPI, LoansAPI, PaymentsAPI } from "../services/api";

// import {
//   ResponsiveContainer,
//   LineChart,
//   Line,
//   BarChart,
//   Bar,
//   PieChart,
//   Pie,
//   Cell,
//   XAxis,
//   YAxis,
//   Tooltip,
//   CartesianGrid,
//   Legend,
// } from "recharts";

// /* ---------- helpers ---------- */
// function formatUSD(n) {
//   const num = Number(n || 0);
//   return num.toLocaleString("en-US", {
//     style: "currency",
//     currency: "USD",
//     maximumFractionDigits: 2,
//   });
// }

// function emiUSD(principal, annualRatePct, termMonths) {
//   const P = Number(principal || 0);
//   const n = Math.max(1, Number(termMonths || 1));
//   const r = Number(annualRatePct || 0) / 100 / 12;
//   if (r === 0) return P / n;
//   const top = P * r * Math.pow(1 + r, n);
//   const bottom = Math.pow(1 + r, n) - 1;
//   return top / bottom;
// }

// function ym(d) {
//   if (!d) return "Unknown";
//   const date = new Date(d);
//   if (isNaN(date.getTime())) return "Unknown";
//   const y = date.getFullYear();
//   const m = String(date.getMonth() + 1).padStart(2, "0");
//   return `${y}-${m}`;
// }

// /* ---------- page ---------- */
// export default function Dashboard() {
//   const navigate = useNavigate();

//   const [isLoading, setIsLoading] = useState(false);
//   const [loans, setLoans] = useState([]);
//   const [payments, setPayments] = useState([]);
//   const [customers, setCustomers] = useState([]);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     let mounted = true;
//     (async () => {
//       try {
//         setIsLoading(true);
//         setError("");

//         const [loansList, payList, custList] = await Promise.all([
//           LoansAPI.list(),
//           PaymentsAPI.list(),
//           CustomersAPI.list(),
//         ]);

//         if (!mounted) return;
//         setLoans(Array.isArray(loansList) ? loansList : loansList?.results || []);
//         setPayments(Array.isArray(payList) ? payList : payList?.results || []);
//         setCustomers(Array.isArray(custList) ? custList : custList?.results || []);
//       } catch (e) {
//         console.error(e);
//         setError("Could not load dashboard data. Check your login/token and API.");
//       } finally {
//         if (mounted) setIsLoading(false);
//       }
//     })();
//     return () => {
//       mounted = false;
//     };
//   }, []);

//   /* ---------- derived metrics ---------- */
//   const kpis = useMemo(() => {
//     const totalOutstanding = loans.reduce(
//       (acc, l) => acc + Number(l.outstanding_principal ?? l.principal_amount ?? 0),
//       0
//     );
//     const activeLoans = loans.filter(
//       (l) => String(l.status || "").toUpperCase() === "ACTIVE"
//     ).length;

//     const monthlyEmiTotal = loans.reduce((acc, l) => {
//       const principal = Number(l.outstanding_principal ?? l.principal_amount ?? 0);
//       const emi = emiUSD(principal, l.annual_interest_rate, l.term_months);
//       return acc + emi;
//     }, 0);

//     const recentPayments = payments
//       .slice()
//       .sort(
//         (a, b) =>
//           new Date(b.payment_date || 0).getTime() - new Date(a.payment_date || 0).getTime()
//       )
//       .slice(0, 5);

//     return {
//       totalOutstanding,
//       activeLoans,
//       monthlyEmiTotal,
//       totalCustomers: customers.length,
//       recentPayments,
//     };
//   }, [loans, customers, payments]);

//   /* ---------- chart data ---------- */
//   // A) Outstanding trend by month (sum)
//   const outstandingTrend = useMemo(() => {
//     const bucket = {};
//     loans.forEach((l) => {
//       const key =
//         ym(l.created_at) !== "Unknown"
//           ? ym(l.created_at)
//           : ym(l.start_date) !== "Unknown"
//           ? ym(l.start_date)
//           : "Unknown";
//       bucket[key] =
//         (bucket[key] || 0) +
//         Number(l.outstanding_principal ?? l.principal_amount ?? 0);
//     });
//     const rows = Object.entries(bucket)
//       .filter(([k]) => k !== "Unknown")
//       .sort(([a], [b]) => (a < b ? -1 : 1))
//       .map(([month, total]) => ({ month, total }));
//     return rows.length ? rows : [{ month: "No Data", total: 0 }];
//   }, [loans]);

//   // B) Payments by month
//   const paymentsByMonth = useMemo(() => {
//     const bucket = {};
//     payments.forEach((p) => {
//       const key = ym(p.payment_date);
//       bucket[key] = (bucket[key] || 0) + Number(p.amount || 0);
//     });
//     const rows = Object.entries(bucket)
//       .filter(([k]) => k !== "Unknown")
//       .sort(([a], [b]) => (a < b ? -1 : 1))
//       .map(([month, amount]) => ({ month, amount }));
//     return rows.length ? rows : [{ month: "No Data", amount: 0 }];
//   }, [payments]);

//   // C) Loan status mix
//   const statusPie = useMemo(() => {
//     const counts = { ACTIVE: 0, PAID_OFF: 0, DEFAULTED: 0, OTHER: 0 };
//     loans.forEach((l) => {
//       const s = String(l.status || "").toUpperCase();
//       if (counts[s] !== undefined) counts[s] += 1;
//       else counts.OTHER += 1;
//     });
//     const rows = Object.entries(counts)
//       .filter(([, v]) => v > 0)
//       .map(([name, value]) => ({ name, value }));
//     return rows.length ? rows : [{ name: "No Loans", value: 1 }];
//   }, [loans]);

//   const PIE_COLORS = ["#38bdf8", "#34d399", "#fb7185", "#a78bfa"];

//   return (
//     <div className="flex min-h-screen bg-neutral-950 text-neutral-100">
//       <Sidebar />
//       <div className="flex-1 flex flex-col">
//         <Header />

//         <main className="px-4 sm:px-6 lg:px-8 py-6">
//           <div className="mb-6">
//             <h1 className="text-2xl font-semibold tracking-tight">Analytics Overview</h1>
//             <p className="text-neutral-400 text-sm">
//               Key metrics and visual insights powered by LoanX Capital.
//             </p>
//           </div>

//           {error && (
//             <div className="mb-6 rounded-lg border border-rose-900 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
//               {error}
//             </div>
//           )}

//           {/* KPI row */}
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
//             <KPICard
//               icon={Landmark}
//               label="Total Outstanding"
//               value={isLoading ? "—" : formatUSD(kpis.totalOutstanding)}
//               hint="Sum of outstanding principal"
//               delay={0.0}
//             />
//             <KPICard
//               icon={Banknote}
//               label="Monthly EMI (Projected)"
//               value={isLoading ? "—" : formatUSD(kpis.monthlyEmiTotal)}
//               hint="Sum of scheduled EMIs"
//               delay={0.05}
//             />
//             <KPICard
//               icon={Users}
//               label="Customers"
//               value={isLoading ? "—" : kpis.totalCustomers}
//               hint="Total customers"
//               delay={0.1}
//             />
//             <KPICard
//               icon={Receipt}
//               label="Active Loans"
//               value={isLoading ? "—" : kpis.activeLoans}
//               hint="Loans with ACTIVE status"
//               delay={0.15}
//             />
//           </div>

//           {/* Charts grid */}
//           <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
//             <ChartCard title="Outstanding Balance Trend" subtitle="Total outstanding by month">
//               <ResponsiveContainer width="100%" height={260}>
//                 <LineChart data={outstandingTrend} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
//                   <CartesianGrid stroke="#2a2a2a" strokeDasharray="4 4" />
//                   <XAxis dataKey="month" stroke="#a3a3a3" />
//                   <YAxis stroke="#a3a3a3" />
//                   <Tooltip
//                     contentStyle={{ background: "#0b0b0f", border: "1px solid #2a2a2a", color: "#e5e5e5" }}
//                     formatter={(v) => formatUSD(v)}
//                   />
//                   <Legend />
//                   <Line
//                     type="monotone"
//                     dataKey="total"
//                     name="Outstanding"
//                     stroke="#38bdf8"
//                     strokeWidth={2}
//                     dot={false}
//                     activeDot={{ r: 5 }}
//                   />
//                 </LineChart>
//               </ResponsiveContainer>
//             </ChartCard>

//             <ChartCard title="Payments by Month" subtitle="Sum of payments per month">
//               <ResponsiveContainer width="100%" height={260}>
//                 <BarChart data={paymentsByMonth} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
//                   <CartesianGrid stroke="#2a2a2a" strokeDasharray="4 4" />
//                   <XAxis dataKey="month" stroke="#a3a3a3" />
//                   <YAxis stroke="#a3a3a3" />
//                   <Tooltip
//                     contentStyle={{ background: "#0b0b0f", border: "1px solid #2a2a2a", color: "#e5e5e5" }}
//                     formatter={(v) => formatUSD(v)}
//                   />
//                   <Legend />
//                   <Bar dataKey="amount" name="Payments" fill="#34d399" radius={[6, 6, 0, 0]} />
//                 </BarChart>
//               </ResponsiveContainer>
//             </ChartCard>

//             <ChartCard title="Loan Status Mix" subtitle="Distribution of loan statuses">
//               <ResponsiveContainer width="100%" height={260}>
//                 <PieChart>
//                   <Tooltip
//                     contentStyle={{ background: "#0b0b0f", border: "1px solid #2a2a2a", color: "#e5e5e5" }}
//                   />
//                   <Legend />
//                   <Pie
//                     data={statusPie}
//                     dataKey="value"
//                     nameKey="name"
//                     innerRadius={50}
//                     outerRadius={90}
//                     paddingAngle={3}
//                   >
//                     {statusPie.map((_, idx) => (
//                       <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
//                     ))}
//                   </Pie>
//                 </PieChart>
//               </ResponsiveContainer>
//             </ChartCard>
//           </div>

//           {/* Quick links */}
//           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
//             <DashCard
//               title="Customers"
//               subtitle="Manage customer profiles and history."
//               onClick={() => navigate("/customers")}
//               cta="Go to Customers"
//             />
//             <DashCard
//               title="Loans"
//               subtitle="View balances, EMIs, and statuses."
//               onClick={() => navigate("/loans")}
//               cta="Go to Loans"
//             />
//             <DashCard
//               title="Payments"
//               subtitle="Record or review payments."
//               onClick={() => navigate("/payments")}
//               cta="Go to Payments"
//             />
//           </div>

//           {/* Recent payments */}
//           <section className="mt-8">
//             <h2 className="text-lg font-semibold mb-3">Recent Payments</h2>
//             <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 overflow-hidden">
//               <div className="overflow-x-auto">
//                 <table className="min-w-full text-sm">
//                   <thead>
//                     <tr className="bg-neutral-900/80">
//                       <Th>ID</Th>
//                       <Th>Loan</Th>
//                       <Th>Note</Th>
//                       <Th align="right">Amount</Th>
//                       <Th align="right">Date</Th>
//                     </tr>
//                   </thead>
//                   <tbody className="divide-y divide-neutral-800">
//                     {isLoading ? (
//                       <tr>
//                         <td colSpan={5} className="p-6 text-center text-neutral-400">
//                           Loading…
//                         </td>
//                       </tr>
//                     ) : kpis.recentPayments.length === 0 ? (
//                       <tr>
//                         <td colSpan={5} className="p-6 text-center text-neutral-400">
//                           No payments yet.
//                         </td>
//                       </tr>
//                     ) : (
//                       kpis.recentPayments.map((p) => (
//                         <tr key={p.id} className="hover:bg-neutral-800/50 transition-colors">
//                           <Td>#{p.id}</Td>
//                           <Td>Loan #{p.loan}</Td>
//                           <Td className="truncate max-w-[380px]">{p.note || "—"}</Td>
//                           <Td align="right">{formatUSD(p.amount)}</Td>
//                           <Td align="right">{p.payment_date || "—"}</Td>
//                         </tr>
//                       ))
//                     )}
//                   </tbody>
//                 </table>
//               </div>
//             </div>
//           </section>
//         </main>
//       </div>
//     </div>
//   );
// }

// /* ---------- local UI bits ---------- */
// function KPICard({ icon: Icon, label, value, hint, delay = 0 }) {
//   return (
//     <motion.div
//       className="rounded-xl border border-neutral-800/70 bg-neutral-900/70 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.18)]"
//       initial={{ opacity: 0, y: 8 }}
//       animate={{ opacity: 1, y: 0 }}
//       transition={{ delay, type: "spring", stiffness: 260, damping: 20 }}
//     >
//       <div className="flex items-center gap-3">
//         <div className="h-10 w-10 rounded-lg bg-neutral-800/70 flex items-center justify-center">
//           <Icon className="h-5 w-5 text-sky-300" />
//         </div>
//         <div className="flex-1">
//           <div className="text-xs uppercase tracking-wider text-neutral-400">{label}</div>
//           <div className="text-xl font-semibold mt-0.5">{value}</div>
//           {hint ? <div className="text-[11px] text-neutral-400 mt-1">{hint}</div> : null}
//         </div>
//       </div>
//     </motion.div>
//   );
// }

// function Th({ children, align = "left" }) {
//   return (
//     <th
//       className={[
//         "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-400",
//         align === "right" ? "text-right" : "text-left",
//       ].join(" ")}
//     >
//       {children}
//     </th>
//   );
// }
// function Td({ children, align = "left", className = "" }) {
//   return (
//     <td
//       className={[
//         "px-4 py-3 text-sm",
//         align === "right" ? "text-right" : "text-left",
//         className,
//       ].join(" ")}
//     >
//       {children}
//     </td>
//   );
// }

// function ChartCard({ title, subtitle, children }) {
//   return (
//     <motion.div
//       className="rounded-xl border border-neutral-800/70 bg-neutral-900/70 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.18)]"
//       whileHover={{ y: -2 }}
//       transition={{ type: "spring", stiffness: 260, damping: 20 }}
//     >
//       <div className="mb-4">
//         <div className="text-base font-semibold">{title}</div>
//         <p className="text-neutral-400 text-sm mt-1">{subtitle}</p>
//       </div>
//       <div className="h-[260px]">{children}</div>
//     </motion.div>
//   );
// }

// function DashCard({ title, subtitle, onClick, cta }) {
//   return (
//     <motion.button
//       onClick={onClick}
//       whileHover={{ y: -2 }}
//       className="text-left w-full rounded-xl border border-neutral-800/70 bg-neutral-900/70 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.18)] hover:border-neutral-700 transition-colors"
//     >
//       <div className="flex items-start justify-between gap-3">
//         <div>
//           <div className="text-base font-semibold">{title}</div>
//           <p className="text-neutral-400 text-sm mt-1">{subtitle}</p>
//         </div>
//         <ArrowRight className="h-5 w-5 text-neutral-400" />
//       </div>
//       <div className="mt-4 inline-flex items-center gap-2 text-sm text-sky-300/90">
//         <span>{cta}</span>
//       </div>
//     </motion.button>
//   );
// }


// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { motion } from "framer-motion";
import { Users, Banknote, Landmark, Receipt, ArrowRight } from "lucide-react";
import { CustomersAPI, LoansAPI, PaymentsAPI } from "../services/api";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

/* ---------- helpers ---------- */
function formatUSD(n) {
  const num = Number(n || 0);
  return num.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function emiUSD(principal, annualRatePct, termMonths) {
  const P = Number(principal || 0);
  const n = Math.max(1, Number(termMonths || 1));
  const r = Number(annualRatePct || 0) / 100 / 12;
  if (r === 0) return P / n;
  const top = P * r * Math.pow(1 + r, n);
  const bottom = Math.pow(1 + r, n) - 1;
  return top / bottom;
}

function ym(d) {
  if (!d) return "Unknown";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "Unknown";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/* ---------- page ---------- */
export default function Dashboard() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setIsLoading(true);
        setError("");

        const [loansList, payList, custList] = await Promise.all([
          LoansAPI.list(),
          PaymentsAPI.list(),
          CustomersAPI.list(),
        ]);

        if (!mounted) return;

        // Accept both array and paginated {results: []}
        setLoans(Array.isArray(loansList) ? loansList : loansList?.results || []);
        setPayments(Array.isArray(payList) ? payList : payList?.results || []);
        setCustomers(Array.isArray(custList) ? custList : custList?.results || []);
      } catch (e) {
        console.error(e);
        setError("Could not load dashboard data. Check your login/token and API.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  /* ---------- derived metrics ---------- */
  const kpis = useMemo(() => {
    const totalOutstanding = loans.reduce(
      (acc, l) => acc + Number(l.outstanding_principal ?? l.principal_amount ?? 0),
      0
    );

    const activeLoans = loans.filter(
      (l) => String(l.status || "").toUpperCase() === "ACTIVE"
    ).length;

    const monthlyEmiTotal = loans.reduce((acc, l) => {
      const principal = Number(l.outstanding_principal ?? l.principal_amount ?? 0);
      const emi = emiUSD(principal, l.annual_interest_rate, l.term_months);
      return acc + emi;
    }, 0);

    const recentPayments = payments
      .slice()
      .sort(
        (a, b) =>
          new Date(b.payment_date || 0).getTime() - new Date(a.payment_date || 0).getTime()
      )
      .slice(0, 5);

    return {
      totalOutstanding,
      activeLoans,
      monthlyEmiTotal,
      totalCustomers: customers.length,
      recentPayments,
    };
  }, [loans, customers, payments]);

  /* ---------- chart data ---------- */
  // A) Outstanding trend by month (sum)
  const outstandingTrend = useMemo(() => {
    const bucket = {};
    loans.forEach((l) => {
      const key =
        ym(l.created_at) !== "Unknown"
          ? ym(l.created_at)
          : ym(l.start_date) !== "Unknown"
          ? ym(l.start_date)
          : "Unknown";
      bucket[key] =
        (bucket[key] || 0) +
        Number(l.outstanding_principal ?? l.principal_amount ?? 0);
    });
    const rows = Object.entries(bucket)
      .filter(([k]) => k !== "Unknown")
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([month, total]) => ({ month, total }));
    return rows.length ? rows : [{ month: "No Data", total: 0 }];
  }, [loans]);

  // B) Payments by month
  const paymentsByMonth = useMemo(() => {
    const bucket = {};
    payments.forEach((p) => {
      const key = ym(p.payment_date);
      const amt = Number(p.amount ?? p.amount_paid ?? 0);
      bucket[key] = (bucket[key] || 0) + amt;
    });
    const rows = Object.entries(bucket)
      .filter(([k]) => k !== "Unknown")
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([month, amount]) => ({ month, amount }));
    return rows.length ? rows : [{ month: "No Data", amount: 0 }];
  }, [payments]);

  // C) Loan status mix
  const statusPie = useMemo(() => {
    const counts = { ACTIVE: 0, PAID_OFF: 0, DEFAULTED: 0, OTHER: 0 };
    loans.forEach((l) => {
      const s = String(l.status || "").toUpperCase();
      if (counts[s] !== undefined) counts[s] += 1;
      else counts.OTHER += 1;
    });
    const rows = Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
    return rows.length ? rows : [{ name: "No Loans", value: 1 }];
  }, [loans]);

  const PIE_COLORS = ["#38bdf8", "#34d399", "#fb7185", "#a78bfa"];

  return (
    <div className="flex min-h-screen bg-neutral-950 text-neutral-100">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />

        <main className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">Analytics Overview</h1>
            <p className="text-neutral-400 text-sm">
              Key metrics and visual insights powered by LoanX Capital.
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-rose-900 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}
          

          {/* KPI row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KPICard
              icon={Landmark}
              label="Total Outstanding"
              value={isLoading ? "—" : formatUSD(kpis.totalOutstanding)}
              hint="Sum of outstanding principal"
              delay={0.0}
            />
            <KPICard
              icon={Banknote}
              label="Monthly EMI (Projected)"
              value={isLoading ? "—" : formatUSD(kpis.monthlyEmiTotal)}
              hint="Sum of scheduled EMIs"
              delay={0.05}
            />
            <KPICard
              icon={Users}
              label="Customers"
              value={isLoading ? "—" : kpis.totalCustomers}
              hint="Total customers"
              delay={0.1}
            />
            <KPICard
              icon={Receipt}
              label="Active Loans"
              value={isLoading ? "—" : kpis.activeLoans}
              hint="Loans with ACTIVE status"
              delay={0.15}
            />
          </div>

          {/* Charts grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <ChartCard title="Outstanding Balance Trend" subtitle="Total outstanding by month">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={outstandingTrend} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#2a2a2a" strokeDasharray="4 4" />
                  <XAxis dataKey="month" stroke="#a3a3a3" />
                  <YAxis stroke="#a3a3a3" />
                  <Tooltip
                    contentStyle={{ background: "#0b0b0f", border: "1px solid #2a2a2a", color: "#e5e5e5" }}
                    formatter={(v) => formatUSD(v)}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Outstanding"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Payments by Month" subtitle="Sum of payments per month">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={paymentsByMonth} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#2a2a2a" strokeDasharray="4 4" />
                  <XAxis dataKey="month" stroke="#a3a3a3" />
                  <YAxis stroke="#a3a3a3" />
                  <Tooltip
                    contentStyle={{ background: "#0b0b0f", border: "1px solid #2a2a2a", color: "#e5e5e5" }}
                    formatter={(v) => formatUSD(v)}
                  />
                  <Legend />
                  <Bar dataKey="amount" name="Payments" fill="#34d399" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Loan Status Mix" subtitle="Distribution of loan statuses">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Tooltip
                    contentStyle={{ background: "#0b0b0f", border: "1px solid #2a2a2a", color: "#e5e5e5" }}
                  />
                  <Legend />
                  <Pie
                    data={statusPie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {statusPie.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          Quick links
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            <DashCard
              title="Customers"
              subtitle="Manage customer profiles and history."
              onClick={() => navigate("/customers")}
              cta="Go to Customers"
            />
            <DashCard
              title="Loans"
              subtitle="View balances, EMIs, and statuses."
              onClick={() => navigate("/loans")}
              cta="Go to Loans"
            />
            <DashCard
              title="Payments"
              subtitle="Record or review payments."
              onClick={() => navigate("/payments")}
              cta="Go to Payments"
            />
          </div>

          {/* Recent payments */}
          <section className="mt-8">
            <h2 className="text-lg font-semibold mb-3">Recent Payments</h2>
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-neutral-900/80">
                      <Th>ID</Th>
                      <Th>Loan</Th>
                      <Th>Note</Th>
                      <Th align="right">Amount</Th>
                      <Th align="right">Date</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-neutral-400">
                          Loading…
                        </td>
                      </tr>
                    ) : kpis.recentPayments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-neutral-400">
                          No payments yet.
                        </td>
                      </tr>
                    ) : (
                      kpis.recentPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-neutral-800/50 transition-colors">
                          <Td>#{p.id}</Td>
                          <Td>Loan #{p.loan}</Td>
                          <Td className="truncate max-w-[380px]">{p.note || "—"}</Td>
                          <Td align="right">{formatUSD(p.amount ?? p.amount_paid)}</Td>
                          <Td align="right">{p.payment_date || "—"}</Td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

/* ---------- local UI bits ---------- */
function KPICard({ icon: Icon, label, value, hint, delay = 0 }) {
  return (
    <motion.div
      className="rounded-xl border border-neutral-800/70 bg-neutral-900/70 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.18)]"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 260, damping: 20 }}
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-neutral-800/70 flex items-center justify-center">
          <Icon className="h-5 w-5 text-sky-300" />
        </div>
        <div className="flex-1">
          <div className="text-xs uppercase tracking-wider text-neutral-400">{label}</div>
          <div className="text-xl font-semibold mt-0.5">{value}</div>
          {hint ? <div className="text-[11px] text-neutral-400 mt-1">{hint}</div> : null}
        </div>
      </div>
    </motion.div>
  );
}

function Th({ children, align = "left" }) {
  return (
    <th
      className={[
        "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-400",
        align === "right" ? "text-right" : "text-left",
      ].join(" ")}
    >
      {children}
    </th>
  );
}
function Td({ children, align = "left", className = "" }) {
  return (
    <td
      className={[
        "px-4 py-3 text-sm",
        align === "right" ? "text-right" : "text-left",
        className,
      ].join(" ")}
    >
      {children}
    </td>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <motion.div
      className="rounded-xl border border-neutral-800/70 bg-neutral-900/70 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.18)]"
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      <div className="mb-4">
        <div className="text-base font-semibold">{title}</div>
        <p className="text-neutral-400 text-sm mt-1">{subtitle}</p>
      </div>
      <div className="h-[260px]">{children}</div>
    </motion.div>
  );
}

function DashCard({ title, subtitle, onClick, cta }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2 }}
      className="text-left w-full rounded-xl border border-neutral-800/70 bg-neutral-900/70 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.18)] hover:border-neutral-700 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold">{title}</div>
          <p className="text-neutral-400 text-sm mt-1">{subtitle}</p>
        </div>
        <ArrowRight className="h-5 w-5 text-neutral-400" />
      </div>
      <div className="mt-4 inline-flex items-center gap-2 text-sm text-sky-300/90">
        <span>{cta}</span>
      </div>
    </motion.button>
  );
}