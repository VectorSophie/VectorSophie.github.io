export const dynamic = "force-dynamic";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Github, Rss } from "lucide-react";
import { type Repository } from "@/lib/data";
import RepositoryCard from "@/components/repository-card";
import BlogCard from "@/components/blog-card";
import { Suspense } from "react";

async function getRepositories(repoNames: string[]): Promise<Repository[]> {
  const repoPromises = repoNames.map(async (name) => {
    try {
      const response = await fetch(`https://api.github.com/repos/VectorSophie/${name}`, {
        // Optional: Add a personal access token for higher rate limits
        // headers: {
        //   Authorization: `token ${process.env.GITHUB_TOKEN}`,
        // },
        next: { revalidate: 3600 } // Revalidate every hour
      });
      if (!response.ok) {
        console.error(`Failed to fetch repo ${name}: ${response.statusText}`);
        return null;
      }
      const data = await response.json();
      return {
        name: data.name,
        url: data.html_url,
        description: data.description,
        language: data.language,
        stars: data.stargazers_count,
      };
    } catch (error) {
      console.error(`Error fetching repo ${name}:`, error);
      return null;
    }
  });

  const results = await Promise.all(repoPromises);
  return results.filter((repo): repo is Repository => repo !== null);
}

async function getGithubProfile(username: string) {
  try {
    const response = await fetch(`https://api.github.com/users/${username}`, {
      next: { revalidate: 3600 } // Revalidate every hour
    });
    if (!response.ok) {
      console.error(`Failed to fetch GitHub profile for ${username}: ${response.statusText}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching GitHub profile for ${username}:`, error);
    return null;
  }
}


function BlogCardSkeleton() {
    return (
        <div className="bg-card/80 border-border shadow-lg shadow-background rounded-lg p-6 animate-pulse">
            <div className="h-6 bg-muted rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-muted rounded w-1/4 mb-6"></div>
            <div className="h-4 bg-muted rounded w-full mb-2"></div>
            <div className="h-4 bg-muted rounded w-full mb-2"></div>
            <div className="h-4 bg-muted rounded w-5/6"></div>
        </div>
    );
}

export default async function Home() {
  const repoNames = [
    'OpenFrontIO',
    'Storytime',
    'Arknights-ClassPredictor',
    'LCB-ID-TLs',
    'indicamp',
    'StructGen'
  ];
  const repositories = await getRepositories(repoNames);
  const profile = await getGithubProfile('VectorSophie');

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex-1 container mx-auto p-4 md:p-8 lg:p-12">
        <section className="flex flex-col md:flex-row items-center gap-8 mb-16 text-center md:text-left">
          <Avatar className="w-28 h-28 border-2 border-primary shadow-lg shadow-primary/20">
            {profile && (
              <AvatarImage 
                src={profile.avatar_url} 
                alt="VectorSophie's GitHub avatar"
              />
            )}
            <AvatarFallback>SV</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-5xl font-headline font-bold text-primary">Jack B.</h1>
            <p className="mt-2 text-lg text-muted-foreground">ML Engineer & Creative Developer</p>
            <div className="mt-6 flex justify-center md:justify-start gap-4">
              <Button asChild>
                <a href="https://github.com/VectorSophie" target="_blank" rel="noopener noreferrer">
                  <Github /> GitHub
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href="https://blog.naver.com/paranormalian" target="_blank" rel="noopener noreferrer">
                  <Rss /> Naver Blog
                </a>
              </Button>
            </div>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-3xl font-headline font-bold mb-6">Latest Post</h2>
          <Suspense fallback={<BlogCardSkeleton />}>
            <BlogCard />
          </Suspense>
        </section>

        <section>
          <h2 className="text-3xl font-headline font-bold mb-6">Main Repositories</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {repositories.map((repo) => (
              <RepositoryCard key={repo.name} repo={repo} />
            ))}
          </div>
        </section>
      </main>

      <footer className="py-8 text-center text-muted-foreground border-t mt-12">
        <p>&copy; {new Date().getFullYear()} VectorSophie. All rights reserved.</p>
        <p>Made with next.js, vercel and love.</p>
      </footer>
    </div>
  );
}
