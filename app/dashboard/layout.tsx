import { Header } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";

import "./figma-dashboard.css";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="nookly-figma-root">
      <Sidebar shell />

      <div className="nookly-figma-workspace">
        <Header shell />

        <section className="nookly-figma-page">
          {children}
        </section>
      </div>
    </div>
  );
}
