export const dynamic = "force-dynamic";

import type { Repository } from "@/lib/data";

async function getRepositories(repoNames: string[]): Promise<Repository[]> {
  const results = await Promise.all(
    repoNames.map(async (name) => {
      try {
        const res = await fetch(
          `https://api.github.com/repos/VectorSophie/${name}`,
          { cache: "no-store" }
        );
        if (!res.ok) return null;
        const d = await res.json();
        return {
          name: d.name,
          url: d.html_url,
          description: d.description ?? "",
          language: d.language ?? "—",
          stars: d.stargazers_count ?? 0,
        };
      } catch {
        return null;
      }
    })
  );
  return results.filter((r): r is Repository => r !== null);
}

const LANGUAGE_COLOR: Record<string, string> = {
  TypeScript:  "#7FB7C9",
  JavaScript:  "#D9B36A",
  Python:      "#A8D8E8",
  HTML:        "#D98A6A",
  Go:          "#7BBF8E",
};

function NodeCard({ repo, index }: { repo: Repository; index: number }) {
  const color = LANGUAGE_COLOR[repo.language] ?? "#CCC9C1";
  const nodeId = String(index + 1).padStart(2, "0");

  return (
    <a
      href={repo.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block group"
    >
      <article className="border border-lab-border hover:border-lab-border-active transition-colors duration-300 bg-[#E8E5DD] h-full flex flex-col relative overflow-hidden">
        {/* Corner marks */}
        <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-lab-steel opacity-40 group-hover:border-lab-blue group-hover:opacity-70 transition-all duration-300" aria-hidden />
        <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-lab-steel opacity-40 group-hover:border-lab-blue group-hover:opacity-70 transition-all duration-300" aria-hidden />
        <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-lab-steel opacity-40 group-hover:border-lab-blue group-hover:opacity-70 transition-all duration-300" aria-hidden />
        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-lab-steel opacity-40 group-hover:border-lab-blue group-hover:opacity-70 transition-all duration-300" aria-hidden />

        {/* Node header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-lab-border bg-[#EDEAE2]">
          <div className="flex items-center gap-2">
            <span className="lab-label font-medium text-lab-graphite">NODE·{nodeId}</span>
            <span className="w-px h-3 bg-lab-border" aria-hidden />
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: color }}
                aria-hidden
              />
              <span className="lab-label" style={{ color }}>{repo.language}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="lab-label opacity-50">★</span>
            <span className="lab-mono text-lab-graphite">{repo.stars}</span>
          </div>
        </div>

        {/* Node body */}
        <div className="flex-1 px-4 py-4">
          <h2 className="lab-title text-lab-graphite text-base mb-2 group-hover:text-lab-blue transition-colors duration-200">
            {repo.name}
          </h2>
          {repo.description ? (
            <p className="text-xs text-lab-graphite leading-relaxed opacity-70">
              {repo.description}
            </p>
          ) : (
            <p className="text-xs text-lab-steel opacity-40 italic">No description</p>
          )}
        </div>

        {/* Node footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-lab-border">
          <div className="flex gap-0.5" aria-hidden>
            {Array.from({ length: 10 }, (_, i) => (
              <div
                key={i}
                style={{
                  width: "3px",
                  height: "10px",
                  background: i < 6 ? color : "#CCC9C1",
                  opacity: i < 6 ? 0.5 : 0.2,
                }}
              />
            ))}
          </div>
          <span className="lab-mono text-lab-blue group-hover:text-lab-graphite transition-colors">
            INSPECT →
          </span>
        </div>
      </article>
    </a>
  );
}

export default async function ProjectsPage() {
  const repoNames = [
    "doom-on-github",
    "limbus-terminal-stream",
    "OpenFrontIO",
    "Storytime",
    "Arknights-ClassPredictor",
    "StructGen",
  ];
  const repositories = await getRepositories(repoNames);

  return (
    <div className="min-h-screen bg-lab-ivory">
      <main className="container mx-auto px-6 py-10">

        {/* Section header */}
        <div className="border-b border-lab-border pb-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-lab-blue pulse-dot" aria-hidden />
            <span className="lab-label">STATION ST·02</span>
          </div>
          <h1 className="lab-display text-lab-graphite" style={{ fontSize: "clamp(2rem, 6vw, 4rem)" }}>
            Computational Node
          </h1>
          <p className="lab-label text-lab-steel mt-2">
            OPEN-SOURCE REPOSITORY INDEX · GITHUB API · LIVE DATA
          </p>
        </div>

        {/* Telemetry readout */}
        <div className="flex flex-wrap items-center gap-6 mb-8">
          <div className="flex items-center gap-2">
            <span className="lab-label text-lab-steel">NODES ONLINE</span>
            <span className="lab-mono text-lab-graphite">{repositories.length}</span>
          </div>
          <div className="w-px h-4 bg-lab-border" aria-hidden />
          <div className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-lab-blue" aria-hidden />
            <span className="lab-label">SOURCE: GITHUB·API</span>
          </div>
          <div className="w-px h-4 bg-lab-border" aria-hidden />
          <div className="flex items-center gap-2">
            <span className="lab-label opacity-50">OPERATOR: VECTORSOPHIE</span>
          </div>
        </div>

        {/* Repository grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {repositories.map((repo, i) => (
            <NodeCard key={repo.name} repo={repo} index={i} />
          ))}
        </div>
      </main>

      <footer className="border-t border-lab-border mt-12 py-4">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <span className="lab-label">SYS:JB·EXPERIMENTAL·001 · ST·02</span>
          <span className="lab-label opacity-40">© {new Date().getFullYear()} JBLAB</span>
        </div>
      </footer>
    </div>
  );
}
