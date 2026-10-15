import type { Metadata } from "next";
import JackExe from "@/components/jackexe/jack-exe";

export const metadata: Metadata = {
  title: "jack.exe",
  description: "Jack (VectorSophie): developer and writer. AI agent tooling, terminal apps and low-level Linux software.",
};

export default function Home() {
  return <JackExe />;
}
