"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { InstrumentModule, type ModuleStatus } from "./instrument-module";
import LabCanvas from "./lab-canvas";

/* ── Idle orchestration ──────────────────────────────── */
const ACTIVE_STATUSES: ModuleStatus[] = [
  "scanning",
  "calibrating",
  "analyzing",
  "processing",
];

function useIdleSystem(moduleCount: number) {
  const [statuses, setStatuses] = useState<ModuleStatus[]>(
    Array(moduleCount).fill("standby")
  );
  const [sysStatus, setSysStatus] = useState("NOMINAL");
  const [time, setTime] = useState("");

  useEffect(() => {
    /* Live clock */
    const tick = () => setTime(new Date().toTimeString().slice(0, 8));
    tick();
    const clockId = setInterval(tick, 1000);

    /* Autonomous idle activations */
    let timerId: ReturnType<typeof setTimeout>;

    function scheduleActivation() {
      const delay = 5500 + Math.random() * 8000;
      timerId = setTimeout(() => {
        const idx = Math.floor(Math.random() * moduleCount);
        const status = ACTIVE_STATUSES[Math.floor(Math.random() * ACTIVE_STATUSES.length)];
        setSysStatus(status.toUpperCase());
        setStatuses(prev => {
          const next = [...prev];
          next[idx] = status;
          return next;
        });

        /* Revert to standby after display window */
        setTimeout(() => {
          setStatuses(prev => {
            const next = [...prev];
            next[idx] = "standby";
            return next;
          });
          setSysStatus("NOMINAL");
          scheduleActivation();
        }, 3200 + Math.random() * 1200);
      }, delay);
    }

    scheduleActivation();
    return () => {
      clearInterval(clockId);
      clearTimeout(timerId);
    };
  }, [moduleCount]);

  return { statuses, sysStatus, time };
}

/* ── Waveform bars (static CSS — pure sine values) ──── */
function WaveformDisplay() {
  const bars = Array.from({ length: 36 }, (_, i) => ({
    h: Math.abs(Math.sin(i * 0.55)) * 26 + 5,
    o: 0.28 + Math.abs(Math.sin(i * 0.28)) * 0.28,
  }));

  return (
    <div>
      <div className="lab-label text-lab-steel mb-2">SIGNAL OUTPUT</div>
      <div className="flex items-end gap-[2px]" style={{ height: "36px" }} aria-hidden>
        {bars.map(({ h, o }, i) => (
          <div
            key={i}
            style={{ flexGrow: 1, height: `${h}px`, background: "#7FB7C9", opacity: o }}
          />
        ))}
      </div>
      <div className="lab-label text-lab-green mt-2">CHANNEL CLEAR</div>
    </div>
  );
}

/* ── Tech stack rows ─────────────────────────────────── */
const TECH_ROWS = [
  { label: "LANG",  value: "TypeScript · Python · JavaScript" },
  { label: "FE",    value: "React · Next.js · Svelte" },
  { label: "BE",    value: "FastAPI · Supabase · Redis" },
  { label: "ML/AI", value: "PyTorch · TensorFlow · Genkit" },
  { label: "OPS",   value: "Docker · Vercel · GitHub Actions" },
];

/* ── Contact links ───────────────────────────────────── */
const CHANNELS = [
  { label: "EMAIL",  value: "jay7math@gmail.com",                   href: "mailto:jay7math@gmail.com" },
  { label: "GITHUB", value: "VectorSophie",                          href: "https://github.com/VectorSophie" },
  { label: "NAVER",  value: "paranormalian",                         href: "https://blog.naver.com/paranormalian" },
  { label: "VELOG",  value: "vectorsophie",                          href: "https://velog.io/@vectorsophie/posts" },
];

/* ── Props ───────────────────────────────────────────── */
interface LabHomeProps {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  profile: any;
}

/* ═══════════════════════════════════════════════════════
   LabHome — main interactive homepage client component
   ═══════════════════════════════════════════════════════ */
export function LabHome({ profile }: LabHomeProps) {
  const MODULE_COUNT = 5;
  const { statuses, sysStatus, time } = useIdleSystem(MODULE_COUNT);

  return (
    <div className="min-h-screen bg-lab-ivory">

      {/* ══ HERO SECTION ══════════════════════════════════ */}
      <section className="relative border-b border-lab-border overflow-hidden">
        {/* R3F ambient rings behind content */}
        <div className="absolute inset-0 pointer-events-none z-0" style={{ minHeight: "100%" }}>
          <LabCanvas />
        </div>

        <div className="relative z-10 container mx-auto px-6 py-16 md:py-24 lg:py-28">
          {/* Station identification band */}
          <motion.div
            className="flex flex-wrap items-center justify-between gap-4 mb-14"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <div className="flex items-center gap-3">
              <span
                className="w-2 h-2 rounded-full bg-lab-amber pulse-dot"
                aria-hidden
              />
              <span className="lab-label">STATION: JB·EXPERIMENTAL·001</span>
              <span className="hidden sm:block w-px h-3 bg-lab-border" aria-hidden />
              <span className="hidden sm:block lab-label">OPERATOR: JACK B.</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="lab-label text-lab-blue">{sysStatus}</span>
              <span className="w-px h-3 bg-lab-border" aria-hidden />
              <span className="lab-mono text-lab-steel tabular-nums">{time}</span>
            </div>
          </motion.div>

          {/* Primary identity display */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 40, damping: 18, delay: 0.2 }}
          >
            <h1 className="lab-display text-lab-graphite mb-3"
              style={{ fontSize: "clamp(3.5rem, 10vw, 8rem)" }}>
              Jack B.
            </h1>
            <div className="lab-label text-lab-steel mb-6 flex flex-wrap gap-x-4 gap-y-1">
              <span>DEVELOPER</span>
              <span aria-hidden>·</span>
              <span>WRITER</span>
              <span aria-hidden>·</span>
              <span>SYSTEMS RESEARCHER</span>
            </div>
            <p className="text-[15px] text-lab-graphite max-w-lg leading-relaxed opacity-80">
              Fullstack developer focused on AI-powered web systems, LLM infrastructure,
              and open-source tools. I build useful software and occasionally silly ideas
              that somehow work.
            </p>
          </motion.div>

          {/* Status readout line */}
          <motion.div
            className="mt-10 flex items-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.55 }}
          >
            <span className="lab-label text-lab-blue">{sysStatus}</span>
            <div className="flex-1 h-px bg-lab-border max-w-[180px]" aria-hidden />
            <span className="lab-label text-lab-steel">UTC+9 · SEOUL, KR</span>
          </motion.div>
        </div>
      </section>

      {/* ══ MODULE GRID ═══════════════════════════════════ */}
      <section className="container mx-auto px-6 py-10">

        {/* Row header */}
        <div className="flex items-center gap-3 mb-5">
          <span className="lab-label">WORKSTATION ARRAY</span>
          <div className="flex-1 h-px bg-lab-border" aria-hidden />
          <span className="lab-label opacity-40">5 STATIONS ONLINE</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

          {/* ST·01 — Observational Log → /blogs */}
          <InstrumentModule
            id="ST·01"
            label="OBSERVATIONAL LOG"
            status={statuses[0]}
            href="/blogs"
            index={0}
          >
            <div className="lab-label text-lab-steel mb-3">INCOMING TRANSMISSIONS</div>
            <p className="text-sm text-lab-graphite leading-relaxed mb-4">
              Active entries from Naver Blog and Velog, processed through AI analysis.
            </p>
            <div className="space-y-1.5 mb-5">
              <div className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-lab-blue" aria-hidden />
                <span className="lab-label">3 ACTIVE ENTRIES</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-lab-amber" aria-hidden />
                <span className="lab-label">AI ANALYSIS: ACTIVE</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-lab-steel opacity-40" aria-hidden />
                <span className="lab-label opacity-50">SOURCES: NAVER · VELOG</span>
              </div>
            </div>
            <div className="lab-mono text-lab-blue group-hover:text-lab-graphite transition-colors">
              VIEW LOG →
            </div>
          </InstrumentModule>

          {/* ST·02 — Computational Node → /projects */}
          <InstrumentModule
            id="ST·02"
            label="COMPUTATIONAL NODE"
            status={statuses[1]}
            href="/projects"
            index={1}
          >
            <div className="lab-label text-lab-steel mb-3">REPOSITORY INDEX</div>
            <div className="space-y-2 mb-5 font-mono text-xs text-lab-graphite">
              {["OpenFrontIO", "Storytime", "Arknights-ClassPredictor", "LCB-ID-TLs", "indicamp", "StructGen"].map((name, i) => (
                <div key={name} className="flex items-center gap-2">
                  <span className="text-lab-steel opacity-50">{i < 5 ? "├─" : "└─"}</span>
                  <span>{name}</span>
                </div>
              ))}
            </div>
            <div className="lab-mono text-lab-blue group-hover:text-lab-graphite transition-colors">
              INSPECT NODE →
            </div>
          </InstrumentModule>

          {/* ST·03 — Operator Profile */}
          <InstrumentModule
            id="ST·03"
            label="OPERATOR PROFILE"
            status={statuses[2]}
            index={2}
          >
            <div className="space-y-4">
              <div>
                <div className="lab-label text-lab-steel mb-1.5">LANGUAGES</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { code: "EN", note: "Primary" },
                    { code: "KO", note: "Native" },
                    { code: "ES", note: "Conversational" },
                    { code: "ZH", note: "Relearning" },
                  ].map(({ code, note }) => (
                    <div key={code} className="flex flex-col">
                      <span className="lab-mono text-lab-graphite">{code}</span>
                      <span className="lab-label opacity-40">{note}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="lab-label text-lab-steel mb-1.5">DOMAIN</div>
                <div className="text-sm text-lab-graphite">AI Systems · Web · Open Source</div>
              </div>
              <div>
                <div className="lab-label text-lab-steel mb-1.5">PHILOSOPHY</div>
                <p className="text-xs text-lab-graphite leading-relaxed opacity-80">
                  Open source turns private learning into public infrastructure.
                </p>
              </div>
            </div>
          </InstrumentModule>

          {/* ST·04 — Tech Stack Analyzer */}
          <InstrumentModule
            id="ST·04"
            label="TECH STACK ANALYZER"
            status={statuses[3]}
            index={3}
          >
            <div className="lab-label text-lab-steel mb-3">CAPABILITY MATRIX</div>
            <div className="space-y-2 mb-4">
              {TECH_ROWS.map(({ label, value }) => (
                <div key={label} className="flex items-baseline gap-3">
                  <span className="lab-label w-12 shrink-0 text-lab-steel">{label}</span>
                  <span className="text-xs text-lab-graphite leading-relaxed">{value}</span>
                </div>
              ))}
            </div>
            {/* Segmented progress bar */}
            <div className="flex gap-0.5 mt-4" aria-hidden>
              {Array.from({ length: 24 }, (_, i) => (
                <div
                  key={i}
                  style={{
                    flexGrow: 1,
                    height: "3px",
                    background: i < 17 ? "#7FB7C9" : "#CCC9C1",
                    opacity: i < 17 ? 0.75 : 0.25,
                  }}
                />
              ))}
            </div>
            <div className="lab-label opacity-40 mt-1.5 text-right">PROFICIENCY: 71%</div>
          </InstrumentModule>

          {/* ST·05 — Signal Processing (contact) — spans 2 cols on lg */}
          <InstrumentModule
            id="ST·05"
            label="SIGNAL PROCESSING"
            status={statuses[4]}
            index={4}
            className="sm:col-span-2 lg:col-span-2"
          >
            <div className="flex flex-col md:flex-row gap-8">
              {/* Channel list */}
              <div className="flex-1">
                <div className="lab-label text-lab-steel mb-3">OUTBOUND CHANNELS</div>
                <div className="space-y-3">
                  {CHANNELS.map(({ label, value, href }) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="lab-label w-14 shrink-0">{label}</span>
                      <span className="lab-label text-lab-border opacity-60" aria-hidden>──</span>
                      <a
                        href={href}
                        target={href.startsWith("mailto") ? undefined : "_blank"}
                        rel="noopener noreferrer"
                        className="text-xs text-lab-graphite hover:text-lab-blue transition-colors duration-150"
                      >
                        {value}
                      </a>
                    </div>
                  ))}
                </div>
                <div className="mt-5 pt-4 border-t border-lab-border">
                  <div className="lab-label text-lab-steel mb-1">NOT ACCEPTING</div>
                  <p className="text-xs text-lab-graphite opacity-60 leading-relaxed">
                    Crypto opportunities · "star my repos and back" · suspicious MP4 PRs
                  </p>
                </div>
              </div>

              {/* Waveform */}
              <div className="flex-1 flex flex-col justify-end">
                <WaveformDisplay />
              </div>
            </div>
          </InstrumentModule>
        </div>
      </section>

      {/* ══ SYSTEM FOOTER ══════════════════════════════════ */}
      <footer className="border-t border-lab-border mt-8 py-4">
        <div className="container mx-auto px-6 flex flex-wrap items-center justify-between gap-3">
          <span className="lab-label">SYS:JB·EXPERIMENTAL·001</span>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-lab-green pulse-dot" aria-hidden />
            <span className="lab-label text-lab-green">ALL SYSTEMS NOMINAL</span>
          </div>
          <span className="lab-label opacity-40">© {new Date().getFullYear()} JBLAB</span>
        </div>
      </footer>
    </div>
  );
}
