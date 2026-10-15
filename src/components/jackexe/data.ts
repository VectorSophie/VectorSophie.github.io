/**
 * Content for the jack.exe landing page.
 * Each project is one "expert" in the router. Stats and stars are self-assessed, 0–10 and 1–5.
 * Keep team / organisation names out of this file: links point at personal forks or are left empty.
 */

export type Role = "solo" | "team" | "contributor";

export interface Stats {
  depth: number;
  scope: number;
  polish: number;
  utility: number;
  chaos: number;
}

export interface Expert {
  name: string;
  role: Role;
  status: string;
  lang: string;
  stars: number;
  stack: string;
  line: string;
  body: string;
  /** Empty string = repository not public; the card shows "Repo private". */
  url: string;
  stats: Stats;
  traits: string[];
  /** Words that bias the placeholder router toward this expert. */
  keywords: string[];
}

export const EXPERTS: Expert[] = [
  {
    name: "upstage-cli", role: "solo", status: "released", lang: "TypeScript", stars: 4,
    stack: "TypeScript · Bun · OpenTUI · MCP",
    line: "An agentic coding assistant that lives in the terminal, powered by Upstage Solar Pro4.",
    body: "Full-screen TUI rendered natively on Bun, 36 built-in tools, MCP client and server support, and an evaluation harness for benchmarking agents on real tasks. Ships as a standalone binary.",
    url: "https://github.com/VectorSophie/upstage-cli",
    stats: { depth: 7, scope: 6, polish: 8, utility: 8, chaos: 3 },
    traits: ["Agentic", "TUI", "MCP", "Eval harness", "Ships binaries"],
    keywords: ["end", "-to", "agent", "cli", "code", "tool", "term"],
  },
  {
    name: "TorchOS", role: "solo", status: "pre-release", lang: "Rust", stars: 4,
    stack: "Rust · Arch · Hyprland · Btrfs",
    line: "A personal Linux desktop where experimenting is safe, because every change is checkpointed.",
    body: "Arch base, Hyprland session, Btrfs + Snapper snapshots and a graphical installer. The torch CLI explains the machine in plain language; torchd brokers every root action and writes it to an audit log.",
    url: "https://github.com/VectorSophie/TorchOS",
    stats: { depth: 9, scope: 8, polish: 6, utility: 7, chaos: 5 },
    traits: ["Low-level", "Linux distro", "Snapshots", "Audited root", "Installer"],
    keywords: ["every", "os", "linux", "until", "torch", "is"],
  },
  {
    name: "pommit", role: "team", status: "archived mvp", lang: "Python", stars: 3,
    stack: "Python · multi-agent",
    line: "A multi-agent portfolio generator that maps what a company asks for to what a developer has shown.",
    body: "Company-side agents read job posts, tech blogs and repos to structure required skills; user-side agents turn repositories and commits into capability signals; a portfolio agent joins both.",
    url: "",
    stats: { depth: 6, scope: 7, polish: 4, utility: 6, chaos: 4 },
    traits: ["Multi-agent", "Orchestration", "AST analysis", "Career tooling"],
    keywords: ["flow", "until", "portfolio", "to"],
  },
  {
    name: "envoy-ai", role: "solo", status: "proof of concept", lang: "Python · YAML", stars: 3,
    stack: "Envoy AI Gateway · ExtProc · Kubernetes",
    line: "Memory and multi-tenant token control for an Envoy AI Gateway.",
    body: "A proof of concept on Envoy AI Gateway v0.5: an ExtProc memory service, request body mutation and per-tenant token limits, running on a Kind cluster.",
    url: "https://github.com/VectorSophie/envoy-ai-gateway-memory-poc",
    stats: { depth: 7, scope: 5, polish: 4, utility: 6, chaos: 3 },
    traits: ["Infra", "Kubernetes", "AI gateway", "Multi-tenant"],
    keywords: ["-to", "to", "flow", "gateway", "public", ","],
  },
  {
    name: "A3V", role: "solo", status: "v2.4 released", lang: "closed source", stars: 5,
    stack: "Security · CLI · Windows / macOS / Linux",
    line: "Agent Attack & Abuse Adversarial Vaccine.",
    body: "Security benchmarking and runtime protection for AI coding agents, shipped as checksummed installers for every major desktop OS.",
    url: "https://github.com/VectorSophie/A3V-releases",
    stats: { depth: 8, scope: 7, polish: 7, utility: 8, chaos: 4 },
    traits: ["Security", "Agent safety", "Benchmark", "Runtime guard", "Cross-platform"],
    keywords: ["end", "-end", "until", "agent", "attack", "&"],
  },
  {
    name: "libertix", role: "team", status: "active", lang: "C#", stars: 4,
    stack: "C# · WPF · Debian live image",
    line: "Installs Debian or Ubuntu alongside Windows, without gambling with the disk.",
    body: "A Windows wizard runs a compatibility preflight, writes a typed installation plan and a persisted state machine with rollback, then boots a purpose-built live system for BIOS or UEFI machines.",
    url: "https://github.com/VectorSophie/libertix",
    stats: { depth: 9, scope: 7, polish: 7, utility: 9, chaos: 2 },
    traits: ["Installer", "Dual boot", "State machine", "BIOS + UEFI", "Rollback"],
    keywords: ["open", "every", "install", "windows", "."],
  },
  {
    name: "OpenFrontIO", role: "contributor", status: "live oss", lang: "TypeScript", stars: 3,
    stack: "TypeScript · browser RTS",
    line: "Contributions to an open-source real-time strategy game that runs in the browser.",
    body: "Territorial control and alliance building across real-world maps; an AGPL fork of WarFront.io.",
    url: "https://github.com/VectorSophie/OpenFrontIO",
    stats: { depth: 5, scope: 8, polish: 7, utility: 5, chaos: 6 },
    traits: ["Game", "Multiplayer", "Open source", "Browser"],
    keywords: ["open", "public", "&", "game"],
  },
  {
    name: "ideal.net", role: "solo", status: "experimental", lang: "Firefox fork", stars: 3,
    stack: "Firefox fork · Tor",
    line: "A privacy-first browser with Tor routing and an AI agent layer.",
    body: "Built on Firefox, with traffic routed over Tor and an agent layer kept inside privacy guardrails.",
    url: "https://github.com/VectorSophie/ideal.net",
    stats: { depth: 7, scope: 6, polish: 4, utility: 6, chaos: 7 },
    traits: ["Privacy", "Tor", "Browser", "Agent layer"],
    keywords: ["open", "is", "public", "privacy", "."],
  },
];

/** The tagline, pre-split into display tokens. */
export const TOKENS = [
  "End", "-to", "-end", ",", "open", "&", "open", ".",
  "Until", "every", "end", "-to", "-end", "flow", "is", "open", "to", "public", ".",
];

/** Token shown on first load. */
export const START_TOKEN = 4;

export const CONTACT = {
  email: "jackochesstern0@naver.com",
  github: "https://github.com/VectorSophie",
  availability: "Part-time · remote / online",
};
