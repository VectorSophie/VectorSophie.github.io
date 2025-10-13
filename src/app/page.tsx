import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Github, Rss } from "lucide-react";
import { repositories, latestPost } from "@/lib/data";
import RepositoryCard from "@/components/repository-card";
import BlogCard from "@/components/blog-card";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export default async function Home() {
  const avatarImage = PlaceHolderImages.find(p => p.id === 'avatar');

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex-1 container mx-auto p-4 md:p-8 lg:p-12">
        <section className="flex flex-col md:flex-row items-center gap-8 mb-16 text-center md:text-left">
          <Avatar className="w-28 h-28 border-2 border-primary shadow-lg shadow-primary/20">
            {avatarImage && (
              <AvatarImage 
                src={avatarImage.imageUrl} 
                alt="A placeholder for Sophie Vector"
                data-ai-hint={avatarImage.imageHint}
              />
            )}
            <AvatarFallback>SV</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-5xl font-headline font-bold text-primary">Sophie Vector</h1>
            <p className="mt-2 text-lg text-muted-foreground">Creative Developer | Tech Enthusiast | Blogger</p>
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
          <BlogCard post={latestPost} />
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
        <p>&copy; {new Date().getFullYear()} Sophie Vector. All rights reserved.</p>
      </footer>
    </div>
  );
}
