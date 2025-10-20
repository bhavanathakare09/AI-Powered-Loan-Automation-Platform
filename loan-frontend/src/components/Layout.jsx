// import { Outlet } from "react-router-dom";
// import Sidebar from "./Sidebar.jsx";
// import Header from "./Header.jsx";
// import AiChat from "./AiChat.jsx";

// export default function Layout() {
//   return (
//     <div className="min-h-screen grid grid-cols-[16rem_1fr]">
//       <Sidebar />
//       <div className="flex min-h-screen flex-col">
//         <Header />
//         <main className="flex-1 p-6">
//           <Outlet />
//         </main>
//       </div>

//       {/* AI bubble on ALL pages */}
//       <AiChat />
//     </div>
//   );
// }


// src/components/Layout.jsx
import React from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import AiChat from "./AiChat";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200">
      <div className="flex">
        {/* Left Sidebar (persistent) */}
        <Sidebar />

        {/* Content area */}
        <div className="flex-1 min-w-0">
          <Header />
          <main className="p-6">{children}</main>
        </div>
      </div>

      {/* Floating AI chat bubble (bottom-right), shown on every page */}
      <AiChat />
    </div>
  );
}
