export const dynamic = "force-dynamic";

import { getLatestBlogPost } from "@/ai/flows/get-naver-post";
import { getVelogPosts } from "@/ai/flows/get-velog-posts";
import LabScene, { type BlogMeta, type RepoMeta } from "@/components/lab/lab-scene";

const REPO_NAMES = [
  "doom-on-github",
  "limbus-terminal-stream",
  "OpenFrontIO",
  "Storytime",
  "Arknights-ClassPredictor",
  "StructGen",
];

async function fetchBlogPosts(): Promise<BlogMeta[]> {
  const posts: BlogMeta[] = [];
  try {
    const naver = await getLatestBlogPost({ blogId: "paranormalian" });
    posts.push({ title: naver.title, url: naver.url, publishedAt: naver.publishedAt, source: "Naver" });
  } catch {}
  try {
    const velog = await getVelogPosts({ username: "vectorsophie", limit: 4 });
    posts.push(
      ...velog.posts.map(p => ({
        title: p.title,
        url: p.url,
        publishedAt: p.publishedAt,
        source: "Velog" as const,
      }))
    );
  } catch {}
  return posts
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 3);
}

async function fetchRepos(): Promise<RepoMeta[]> {
  const results = await Promise.all(
    REPO_NAMES.map(async (name) => {
      try {
        const res = await fetch(`https://api.github.com/repos/VectorSophie/${name}`, {
          cache: "no-store",
        });
        if (!res.ok) return null;
        const d = await res.json();
        return {
          name: d.name as string,
          url: d.html_url as string,
          language: (d.language ?? "—") as string,
          stars: (d.stargazers_count ?? 0) as number,
        };
      } catch {
        return null;
      }
    })
  );
  return results.filter((r): r is RepoMeta => r !== null);
}

export default async function Home() {
  const [blogPosts, repos] = await Promise.all([fetchBlogPosts(), fetchRepos()]);
  return <LabScene blogPosts={blogPosts} repos={repos} />;
}
