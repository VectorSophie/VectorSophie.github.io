export const dynamic = "force-dynamic";

import { getLatestBlogPost } from "@/ai/flows/get-naver-post";
import { getVelogPosts } from "@/ai/flows/get-velog-posts";
import { summarizeBlogPost } from "@/ai/flows/summarize-blog-post";
import type { BlogPost } from "@/lib/data";

type BlogPostWithSource = BlogPost & { source: "Naver" | "Velog" };

async function getAllBlogPosts(): Promise<BlogPostWithSource[]> {
  const posts: BlogPostWithSource[] = [];

  try {
    const naverPost = await getLatestBlogPost({ blogId: "paranormalian" });
    posts.push({ ...naverPost, source: "Naver" });
  } catch (e) {
    console.error("Naver fetch failed:", e);
  }

  try {
    const velog = await getVelogPosts({ username: "vectorsophie", limit: 6 });
    posts.push(...velog.posts.map(p => ({ ...p, source: "Velog" as const })));
  } catch (e) {
    console.error("Velog fetch failed:", e);
  }

  return posts
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 8);
}

async function getSummary(content: string): Promise<string> {
  if (!content?.trim()) return "No summary available.";
  try {
    const result = await summarizeBlogPost({ blogContent: content });
    return result.summary;
  } catch {
    return content.slice(0, 220) + "…";
  }
}

/* Each entry is an async server component (streaming-compatible) */
async function LogEntry({
  post,
  index,
}: {
  post: BlogPostWithSource;
  index: number;
}) {
  const summary = await getSummary(post.content);
  const entryId = String(index + 1).padStart(2, "0");

  return (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block group"
    >
      <article className="border border-lab-border hover:border-lab-border-active transition-colors duration-300 bg-[#E8E5DD] relative overflow-hidden">
        {/* Corner marks */}
        <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-lab-steel opacity-40 group-hover:border-lab-blue group-hover:opacity-70 transition-all duration-300" aria-hidden />
        <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-lab-steel opacity-40 group-hover:border-lab-blue group-hover:opacity-70 transition-all duration-300" aria-hidden />
        <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-lab-steel opacity-40 group-hover:border-lab-blue group-hover:opacity-70 transition-all duration-300" aria-hidden />
        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-lab-steel opacity-40 group-hover:border-lab-blue group-hover:opacity-70 transition-all duration-300" aria-hidden />

        {/* Entry header bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-lab-border bg-[#EDEAE2]">
          <div className="flex items-center gap-3">
            <span className="lab-label font-medium text-lab-graphite">
              ENTRY #{entryId}
            </span>
            <span className="w-px h-3 bg-lab-border" aria-hidden />
            <span
              className="lab-label px-1.5 py-0.5 border"
              style={{
                borderColor: post.source === "Naver" ? "#D9B36A" : "#7FB7C9",
                color:       post.source === "Naver" ? "#D9B36A" : "#7FB7C9",
              }}
            >
              {post.source.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="lab-label opacity-50">{post.publishedAt}</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-lab-green" aria-hidden />
              <span className="lab-label text-lab-green">ANALYZED</span>
            </div>
          </div>
        </div>

        {/* Entry body */}
        <div className="px-5 py-5">
          <h2 className="lab-title text-lab-graphite text-lg mb-3 group-hover:text-lab-blue transition-colors duration-200">
            {post.title}
          </h2>
          <p className="text-[13px] text-lab-graphite leading-relaxed opacity-75">
            {summary}
          </p>
        </div>

        {/* Entry footer */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-lab-border">
          <span className="lab-label opacity-40">JBLAB·ST·01·#{entryId}</span>
          <span className="lab-mono text-lab-blue group-hover:text-lab-graphite transition-colors">
            READ ENTRY →
          </span>
        </div>
      </article>
    </a>
  );
}

export default async function BlogsPage() {
  const posts = await getAllBlogPosts();

  return (
    <div className="min-h-screen bg-lab-ivory">
      <main className="container mx-auto px-6 py-10">

        {/* Section header */}
        <div className="border-b border-lab-border pb-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-lab-amber pulse-dot" aria-hidden />
            <span className="lab-label">STATION ST·01</span>
          </div>
          <h1 className="lab-display text-lab-graphite" style={{ fontSize: "clamp(2rem, 6vw, 4rem)" }}>
            Observational Log
          </h1>
          <p className="lab-label text-lab-steel mt-2">
            LATEST TRANSMISSIONS · NAVER BLOG · VELOG · AI-PROCESSED
          </p>
        </div>

        {/* Telemetry readout */}
        <div className="flex flex-wrap items-center gap-6 mb-8">
          <div className="flex items-center gap-2">
            <span className="lab-label text-lab-steel">ENTRIES LOADED</span>
            <span className="lab-mono text-lab-graphite">{posts.length}</span>
          </div>
          <div className="w-px h-4 bg-lab-border" aria-hidden />
          <div className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-lab-blue" aria-hidden />
            <span className="lab-label">AI SUMMARIZATION: ACTIVE</span>
          </div>
        </div>

        {/* Log entries */}
        <div className="space-y-4">
          {posts.length > 0 ? (
            posts.map((post, i) => (
              <LogEntry key={`${post.source}-${i}`} post={post} index={i} />
            ))
          ) : (
            <div className="border border-lab-border bg-[#E8E5DD] p-8">
              <div className="lab-label text-lab-steel mb-2">TRANSMISSION FAILED</div>
              <p className="text-sm text-lab-graphite opacity-70">
                Unable to retrieve entries at this time. Signal sources may be offline.
              </p>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-lab-border mt-12 py-4">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <span className="lab-label">SYS:JB·EXPERIMENTAL·001 · ST·01</span>
          <span className="lab-label opacity-40">© {new Date().getFullYear()} JBLAB</span>
        </div>
      </footer>
    </div>
  );
}
