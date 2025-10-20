// // src/pages/Customers.jsx
// import Sidebar from "../components/Sidebar";
// import Header from "../components/Header";
// import { useEffect, useState } from "react";
// import { CustomersAPI } from "../services/api";
// import Layout from "../components/Layout";

// // Removed redundant export default function Customers

// export default function Customers() {
//   const [rows, setRows] = useState([]);
//   const [err, setErr] = useState("");

//   useEffect(() => {
//     (async () => {
//       try {
//         const response = await fetch("http://localhost:8000/api/customers/", {
//           method: "GET",
//           headers: {
//             "Content-Type": "application/json",
//           },
//           credentials: "include", // Include cookies for authentication if needed
//         });
//         if (!response.ok) {
//           throw new Error(`HTTP error! status: ${response.status}`);
//         }
//         const data = await response.json();
//         setRows(data);
//       } catch (e) {
//         setErr("Failed to load customers. Are you logged in?");
//       }
//     })();
//   }, []);

//   return (
//     <Layout>
//       <div className="p-6">
//         <h1 className="mb-4 text-xl font-semibold text-white">Customers</h1>
//         {err && <div className="mb-3 rounded bg-red-900/40 p-3 text-red-200">{err}</div>}

//         <div className="overflow-hidden rounded-lg border border-neutral-800">
//           <table className="min-w-full divide-y divide-neutral-800">
//             <thead className="bg-neutral-900">
//               <tr className="text-left text-sm text-neutral-300">
//                 <th className="px-4 py-2">ID</th>
//                 <th className="px-4 py-2">Name</th>
//                 <th className="px-4 py-2">Email</th>
//                 <th className="px-4 py-2">Created</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-neutral-800 bg-neutral-950 text-sm text-neutral-200">
//               {rows.map((c) => (
//                 <tr key={c.id}>
//                   <td className="px-4 py-2">{c.id}</td>
//                   <td className="px-4 py-2">{c.name || `${c.first_name || ""} ${c.last_name || ""}`}</td>
//                   <td className="px-4 py-2">{c.email || "-"}</td>
//                   <td className="px-4 py-2">{c.created_at || "-"}</td>
//                 </tr>
//               ))}
//               {rows.length === 0 && !err && (
//                 <tr>
//                   <td className="px-4 py-6 text-neutral-400" colSpan={4}>
//                     No customers found.
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     </Layout>
//   );
// }


// src/pages/Customers.jsx
import React, { useEffect, useState } from "react";
import API from "../services/api"; // ✅ Uses shared axios instance
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await API.get("/customers/");
        console.log("Fetched customers data:", res.data);
        setCustomers(res.data);
      } catch (error) {
        console.error("Error fetching customers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  return (
    <div className="flex min-h-screen bg-neutral-900 text-white">
      {/* Sidebar */}
      <Sidebar />

      <div className="flex-1">
        {/* Header (Logout etc.) */}
        <Header />

        {/* Page Content */}
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">Customers</h1>

          {loading ? (
            <p>Loading...</p>
          ) : customers.length === 0 ? (
            <p>No customers found.</p>
          ) : (
            <table className="w-full border border-neutral-700 rounded-lg overflow-hidden">
              <thead className="bg-neutral-800">
                <tr>
                  <th className="p-3 text-left">ID</th>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-left">Phone</th>
                  <th className="p-3 text-left">Created</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-t border-neutral-700 hover:bg-neutral-800">
                    <td className="p-3">{c.id}</td>
                    <td className="p-3">{c.full_name}</td>
                    <td className="p-3">{c.email || "—"}</td>
                    <td className="p-3">{c.phone || "—"}</td>
                    <td className="p-3">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}