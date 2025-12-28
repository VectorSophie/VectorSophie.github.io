export const dynamic = "force-dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getLatestBlogPost } from "@/ai/flows/get-naver-post";
import { getVelogPosts } from "@/ai/flows/get-velog-posts";
import { summarizeBlogPost } from "@/ai/flows/summarize-blog-post";
import type { BlogPost } from "@/lib/data";

type BlogPostWithSource = BlogPost & { source: 'Naver' | 'Velog' };

async function getAllBlogPosts(): Promise<BlogPostWithSource[]> {
  const posts: BlogPostWithSource[] = [];

  try {
    const naverPost = await getLatestBlogPost({ blogId: "paranormalian" });
    posts.push({ ...naverPost, source: 'Naver' });
  } catch (error) {
    console.error("Failed to fetch Naver post:", error);
  }

  try {
    const velogData = await getVelogPosts({ username: "vectorsophie", limit: 2 });
    const velogPosts = velogData.posts.map(post => ({ ...post, source: 'Velog' as const }));
    posts.push(...velogPosts);
  } catch (error) {
    console.error("Failed to fetch Velog posts:", error);
  }

  // Sort by date (newest first) and limit to 3
  const sortedPosts = posts
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 3);

  return sortedPosts;
}

async function getSummary(content: string): Promise<string> {
  if (!content || content.trim().length === 0) {
    return 'No summary available.';
  }

  try {
    const result = await summarizeBlogPost({ blogContent: content });
    return result.summary;
  } catch (error) {
    console.error("Failed to summarize blog post:", error);
    return content.slice(0, 200) + '...';
  }
}

async function BlogPostCard({ post }: { post: BlogPostWithSource }) {
  const summary = await getSummary(post.content);

  return (
    <a href={post.url} target="_blank" rel="noopener noreferrer" className="block group">
      <Card className="bg-card/80 hover:bg-card/95 border-border hover:border-primary/50 transition-all duration-300 transform hover:-translate-y-1 shadow-lg shadow-background">
        <CardHeader>
          <div className="flex justify-between items-start gap-4">
            <CardTitle className="text-primary group-hover:underline text-2xl">{post.title}</CardTitle>
            <Badge variant="outline" className="border-accent text-accent shrink-0">
              {post.source}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
            <CalendarDays className="w-4 h-4" />
            <span>{post.publishedAt}</span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-card-foreground/80 leading-relaxed">{summary}</p>
        </CardContent>
      </Card>
    </a>
  );
}

export default async function BlogsPage() {
  const posts = await getAllBlogPosts();

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex-1 container mx-auto p-4 md:p-8 lg:p-12">
        <div className="mb-8">
          <h1 className="text-5xl font-headline font-bold text-primary mb-4">Blog Posts</h1>
          <p className="text-lg text-muted-foreground">
            Latest posts from Naver Blog and Velog
          </p>
        </div>

        <section className="space-y-6">
          {posts.length > 0 ? (
            posts.map((post, index) => (
              <BlogPostCard key={`${post.source}-${index}`} post={post} />
            ))
          ) : (
            <Card className="bg-card/80 border-border shadow-lg shadow-background">
              <CardHeader>
                <CardTitle className="text-primary text-2xl">No posts available</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-card-foreground/80 leading-relaxed">
                  Unable to fetch blog posts at this time.
                </p>
              </CardContent>
            </Card>
          )}
        </section>
      </main>

      <footer className="py-8 text-center text-muted-foreground border-t mt-12">
        <p>&copy; {new Date().getFullYear()} VectorSophie. All rights reserved.</p>
        <p>Made with next.js, vercel and love.</p>
      </footer>
    </div>
  );
}
