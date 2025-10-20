import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import API from "../services/api";

const currency = (n) =>
  (n ?? 0).toLocaleString(undefined, { style: "currency", currency: "USD" });

export default function Loans() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    API.get("/loans/")
      .then((res) => setRows(res.data))
      .catch(() => setRows([]));
  }, []);

  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="p-6">
          <div className="space-y-4">
            <h1 className="text-xl font-semibold">Loans</h1>
            <div className="overflow-hidden rounded-xl border border-neutral-800">
              <table className="w-full text-sm">
                <thead className="bg-neutral-900/60">
                  <tr>
                    <th className="px-3 py-2 text-left">ID</th>
                    <th className="px-3 py-2 text-left">Customer</th>
                    <th className="px-3 py-2 text-left">Principal</th>
                    <th className="px-3 py-2 text-left">Outstanding</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((l) => (
                    <tr key={l.id} className="border-t border-neutral-800">
                      <td className="px-3 py-2">#{l.id}</td>
                      <td className="px-3 py-2">#{l.customer}</td>
                      <td className="px-3 py-2">{currency(l.principal_amount)}</td>
                      <td className="px-3 py-2">{currency(l.outstanding_principal)}</td>
                      <td className="px-3 py-2">{l.status}</td>
                    </tr>
                  ))}
                  {!rows.length && (
                    <tr>
                      <td colSpan="5" className="px-3 py-6 text-center text-neutral-500">
                        No loans yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}