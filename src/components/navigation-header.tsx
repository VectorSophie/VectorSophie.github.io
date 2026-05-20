"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/",        code: "S-00", label: "HOME" },
  { href: "/blogs",   code: "S-01", label: "LOG" },
  { href: "/projects",code: "S-02", label: "COMPUTE" },
];

export default function NavigationHeader() {
  const pathname = usePathname();
  const [time, setTime] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const tick = () => setTime(new Date().toTimeString().slice(0, 8));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const isHome = pathname === "/";

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b transition-colors duration-300 backdrop-blur-sm",
      isHome
        ? "border-[#2A5868]/50 bg-[#0E1820]/75"
        : "border-lab-border bg-lab-ivory/95"
    )}>
      <div className="container mx-auto flex h-11 items-center justify-between px-4 md:px-8">

        {/* Left: system indicators + identifier */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5" aria-hidden>
            <span className={cn("w-2 h-2 rounded-full opacity-80", isHome ? "bg-[#D9B36A]" : "bg-lab-amber")} />
            <span className={cn("w-2 h-2 rounded-full opacity-80", isHome ? "bg-[#7FB7C9]" : "bg-lab-blue")} />
            <span className={cn("w-2 h-2 rounded-full opacity-80", isHome ? "bg-[#7BBF8E]" : "bg-lab-green")} />
          </div>

          <Link href="/" className={cn(
            "lab-mono transition-colors",
            isHome ? "text-[#7ABAC8] hover:text-[#DEF0F5]" : "text-lab-graphite hover:text-lab-blue"
          )}>
            JB·LAB
          </Link>

          <span className="hidden sm:block w-px h-4 bg-lab-border opacity-40" aria-hidden />
          <span className={cn("hidden sm:block lab-label", isHome ? "text-[#4A7888]" : "")}>EXPERIMENTAL·001</span>
        </div>

        {/* Center: nav links */}
        <nav className="flex items-center gap-1" aria-label="Main navigation">
          {NAV_LINKS.map(({ href, code, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative px-3 py-1 lab-mono transition-colors duration-200",
                  isHome
                    ? active ? "text-[#DEF0F5]" : "text-[#4A7888] hover:text-[#7ABAC8]"
                    : active ? "text-lab-graphite" : "text-lab-steel hover:text-lab-graphite"
                )}
              >
                {active && (
                  <span className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3",
                    isHome ? "bg-[#7FB7C9]" : "bg-lab-blue"
                  )} />
                )}
                <span className="hidden md:inline text-[7px] lab-label mr-1 opacity-50">{code}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right: system status + clock */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-lab-green pulse-dot" />
            <span className={cn("lab-label", isHome ? "text-[#7BBF8E]" : "text-lab-green")}>SYS:OK</span>
          </span>
          <span className="w-px h-4 bg-lab-border opacity-40 hidden sm:block" aria-hidden />
          <span className={cn("lab-mono tabular-nums", isHome ? "text-[#4A7888]" : "text-lab-steel")}>
            {mounted ? time : "──:──:──"}
          </span>
        </div>
      </div>
    </header>
  );
}
