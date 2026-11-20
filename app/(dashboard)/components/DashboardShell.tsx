"use client";

import { useState, type ReactNode } from "react";
import DashboardSidebar from "./DashboardSidebar";

export default function DashboardShell({
  children,
}: {
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#101112]">
      <DashboardSidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      <main
        className={`min-h-screen min-w-0 pt-16 transition-[padding] duration-300 lg:pt-0 ${
          collapsed ? "lg:pl-[68px]" : "lg:pl-[250px]"
        }`}
      >
        {children}
      </main>
    </div>
  );
}