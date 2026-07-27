import type { ReactNode } from "react";
import { connection } from "next/server";

interface SettingsLayoutProps {
  children: ReactNode;
}

export default async function SettingsLayout({
  children,
}: SettingsLayoutProps) {
  await connection();

  return children;
}