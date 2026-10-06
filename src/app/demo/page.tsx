import type { Metadata } from "next";
import { DemoClient } from "./DemoClient";

export const metadata: Metadata = { title: "DCDS · mode solo (démo)" };

export default function DemoPage() {
  return <DemoClient />;
}
