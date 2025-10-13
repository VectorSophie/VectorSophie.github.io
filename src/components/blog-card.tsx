import { summarizeBlogPost } from "@/ai/flows/summarize-blog-post";
import { getLatestBlogPost } from "@/ai/flows/get-latest-blog-post";
import type { BlogPost } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";

async function getPost(): Promise<BlogPost | null> {
    try {
        return await getLatestBlogPost({ blogId: "paranormalian" });
    } catch (error) {
        console.error("Failed to fetch blog post:", error);
        return null;
    }
}

async function getSummary(content: string): Promise<string> {
    try {
        const result = await summarizeBlogPost({ blogContent: content });
        return result.summary;
    } catch (error) {
        console.error("Failed to summarize blog post:", error);
        return 'Could not generate summary.';
    }
}

export default async function BlogCard() {
  const post = await getPost();

  if (!post) {
    return (
        <Card className="bg-card/80 border-border shadow-lg shadow-background">
            <CardHeader>
                <CardTitle className="text-primary text-2xl">Could not load post</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-card-foreground/80 leading-relaxed">There was an error fetching the latest blog post.</p>
            </CardContent>
        </Card>
    );
  }

  const summary = await getSummary(post.content);

  return (
    <a href={post.url} target="_blank" rel="noopener noreferrer" className="block group">
      <Card className="bg-card/80 hover:bg-card/95 border-border hover:border-primary/50 transition-all duration-300 transform hover:-translate-y-1 shadow-lg shadow-background">
        <CardHeader>
          <div className="flex justify-between items-start gap-4">
            <CardTitle className="text-primary group-hover:underline text-2xl">{post.title}</CardTitle>
            <Badge variant="outline" className="border-accent text-accent shrink-0">AI Summary</Badge>
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
