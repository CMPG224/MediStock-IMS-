import type { Metadata } from "next";
import Site from "@/components/landing/Site";

export const metadata: Metadata = {
  title: "MediStock (IMS) — Pharmaceutical Inventory Management",
  description:
    "MediStock is pharmaceutical inventory infrastructure — batch traceability, serialisation, cold-chain monitoring and audit-ready reconciliation, from goods-in to dispatch.",
};

export default function HomePage() {
  return <Site />;
}
