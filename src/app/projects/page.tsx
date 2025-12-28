export const dynamic = "force-dynamic";
import { type Repository } from "@/lib/data";
import RepositoryCard from "@/components/repository-card";

async function getRepositories(repoNames: string[]): Promise<Repository[]> {
  const repoPromises = repoNames.map(async (name) => {
    try {
      const response = await fetch(`https://api.github.com/repos/VectorSophie/${name}`, {
        cache: "no-store"
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

export default async function ProjectsPage() {
  const repoNames = [
    'OpenFrontIO',
    'Storytime',
    'Arknights-ClassPredictor',
    'LCB-ID-TLs',
    'indicamp',
    'StructGen'
  ];
  const repositories = await getRepositories(repoNames);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex-1 container mx-auto p-4 md:p-8 lg:p-12">
        <div className="mb-8">
          <h1 className="text-5xl font-headline font-bold text-primary mb-4">Projects</h1>
          <p className="text-lg text-muted-foreground">
            A collection of my open-source projects and contributions
          </p>
        </div>

        <section>
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
