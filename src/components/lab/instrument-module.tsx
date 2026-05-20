"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type ModuleStatus = "standby" | "scanning" | "calibrating" | "analyzing" | "processing";

interface InstrumentModuleProps {
  id: string;
  label: string;
  status?: ModuleStatus;
  children: React.ReactNode;
  href?: string;
  className?: string;
  index?: number;
}

/* Mechanical entrance spring — low bounce, deliberate settle */
const MOUNT_SPRING = { type: "spring" as const, stiffness: 40, damping: 18, mass: 1.1 };

const STATUS_DOT: Record<ModuleStatus, string> = {
  standby:    "bg-[#7A848E] opacity-30",
  scanning:   "bg-[#7FB7C9] shadow-[0_0_5px_#7FB7C9]",
  calibrating:"bg-[#D9B36A] shadow-[0_0_5px_#D9B36A]",
  analyzing:  "bg-[#A8D8E8] shadow-[0_0_5px_#A8D8E8]",
  processing: "bg-[#7BBF8E] shadow-[0_0_5px_#7BBF8E]",
};

/* Four corner marks as real DOM elements */
function CornerMarks() {
  return (
    <>
      <span className="lab-corner lab-corner-tl" aria-hidden />
      <span className="lab-corner lab-corner-tr" aria-hidden />
      <span className="lab-corner lab-corner-bl" aria-hidden />
      <span className="lab-corner lab-corner-br" aria-hidden />
    </>
  );
}

/* Re-triggerable scan line: remounts on each activation */
function ScanLine({ trigger }: { trigger: number }) {
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (trigger > 0) setKey(k => k + 1);
  }, [trigger]);

  if (key === 0) return null;

  return (
    <motion.div
      key={key}
      className="absolute left-0 right-0 h-px bg-[#7FB7C9] pointer-events-none z-20"
      style={{ top: 0 }}
      initial={{ top: "0%", opacity: 0 }}
      animate={{ top: "100%", opacity: [0, 0.5, 0.45, 0] }}
      transition={{ duration: 2.6, ease: "linear", times: [0, 0.05, 0.92, 1] }}
    />
  );
}

export function InstrumentModule({
  id,
  label,
  status = "standby",
  children,
  href,
  className,
  index = 0,
}: InstrumentModuleProps) {
  const scanTrigger = useRef(0);
  const [scanCount, setScanCount] = useState(0);
  const prevStatus = useRef<ModuleStatus>("standby");

  /* Fire scan line whenever module transitions into an active state */
  useEffect(() => {
    if (status !== "standby" && prevStatus.current === "standby") {
      scanTrigger.current += 1;
      setScanCount(scanTrigger.current);
    }
    prevStatus.current = status;
  }, [status]);

  const isActive = status !== "standby";

  const inner = (
    <div className={cn("h-full flex flex-col", href && "cursor-pointer")}>
      {/* ── Module header bar ── */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 border-b transition-colors duration-300",
          isActive ? "border-[#7FB7C9] bg-[#EDEAE2]" : "border-[#CCC9C1] bg-[#EDEAE2]"
        )}
      >
        <div className="flex items-center gap-2">
          <span className="lab-label font-medium" style={{ color: "#444B54" }}>{id}</span>
          <span className="lab-label opacity-30" aria-hidden>·</span>
          <span className="lab-label">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-all duration-300",
              STATUS_DOT[status],
              isActive && "pulse-dot-fast"
            )}
          />
          <span
            className={cn(
              "lab-status transition-colors duration-300",
              isActive ? "text-[#7FB7C9]" : "opacity-40"
            )}
            style={{ color: isActive ? undefined : "#7A848E" }}
          >
            {status}
          </span>
        </div>
      </div>

      {/* ── Content area ── */}
      <div className="flex-1 p-5 relative overflow-hidden">
        {children}
      </div>

      {/* ── Telemetry footer ── */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-1.5 border-t transition-colors duration-300",
          isActive ? "border-[#7FB7C9]" : "border-[#CCC9C1]"
        )}
      >
        <span className="lab-label opacity-35">JBLAB·{id}</span>
        {/* Mini bar sparkline */}
        <div className="flex items-end gap-[2px]" aria-hidden>
          {[4, 7, 5, 9, 6, 8, 3, 7].map((h, i) => (
            <div
              key={i}
              style={{
                height: `${h}px`,
                width: "2px",
                background: isActive ? "#7FB7C9" : "#CCC9C1",
                opacity: isActive ? 0.6 : 0.3,
                transition: "background 0.3s, opacity 0.3s",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      className={cn(
        "relative border overflow-hidden transition-colors duration-300 group",
        isActive
          ? "border-[#7FB7C9] lab-module-active module-active-glow"
          : "border-[#CCC9C1] hover:border-[#7FB7C9]",
        className
      )}
      style={{ background: "#E8E5DD" }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...MOUNT_SPRING, delay: index * 0.07 }}
    >
      <CornerMarks />
      <ScanLine trigger={scanCount} />

      {href ? (
        <Link href={href} className="block h-full">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </motion.div>
  );
}
