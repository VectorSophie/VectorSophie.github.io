export const dynamic = "force-dynamic";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Github, Rss, BookOpen, Mail } from "lucide-react";
import Image from "next/image";

async function getGithubProfile(username: string) {
  try {
    const response = await fetch(`https://api.github.com/users/${username}`, {
      cache: "no-store"
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

function TechIcon({ name, icon }: { name: string; icon: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center justify-center w-16 h-16 rounded-lg bg-card/50 hover:bg-card border border-border hover:border-primary/50 transition-all duration-200 cursor-pointer">
          <i className={`${icon} text-4xl`}></i>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{name}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default async function Home() {
  const profile = await getGithubProfile('VectorSophie');

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex-1 container mx-auto p-4 md:p-8 lg:p-12 space-y-16">
        {/* Hero Section */}
        <section className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
          <Avatar className="w-28 h-28 border-2 border-primary shadow-lg shadow-primary/20">
            {profile && (
              <AvatarImage
                src={profile.avatar_url}
                alt="VectorSophie's GitHub avatar"
              />
            )}
            <AvatarFallback>JB</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-5xl font-headline font-bold text-primary mb-2">Hi! I'm Jack</h1>
            <p className="text-xl text-muted-foreground mb-4">Developer / Writer</p>
            <p className="text-base text-muted-foreground max-w-2xl">
              Fullstack developer focused on AI-powered web apps, LLM systems, and open-source tools.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              I like useful software, silly ideas that somehow work, and small projects that teach lessons.
            </p>
            <div className="mt-6 flex justify-center md:justify-start gap-4 flex-wrap">
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
              <Button asChild variant="secondary">
                <a href="https://velog.io/@vectorsophie/posts" target="_blank" rel="noopener noreferrer">
                  <BookOpen /> Velog
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href="mailto:jay7math@gmail.com">
                  <Mail /> Contact
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section>
          <Card className="bg-card/80 border-border shadow-lg">
            <CardHeader>
              <CardTitle className="text-primary">Tech Stack</CardTitle>
            </CardHeader>
            <CardContent>
              <TooltipProvider>
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-foreground">Programming Languages</h3>
                    <div className="flex flex-wrap gap-3">
                      <TechIcon name="CSS3" icon="devicon-css3-plain colored" />
                      <TechIcon name="HTML5" icon="devicon-html5-plain colored" />
                      <TechIcon name="JavaScript" icon="devicon-javascript-plain colored" />
                      <TechIcon name="TypeScript" icon="devicon-typescript-plain colored" />
                      <TechIcon name="Python" icon="devicon-python-plain colored" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-foreground">Frontend</h3>
                    <div className="flex flex-wrap gap-3">
                      <TechIcon name="React" icon="devicon-react-original colored" />
                      <TechIcon name="Next.js" icon="devicon-nextjs-plain" />
                      <TechIcon name="Svelte" icon="devicon-svelte-plain colored" />
                      <TechIcon name="Vite" icon="devicon-vitejs-plain colored" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-foreground">Backend</h3>
                    <div className="flex flex-wrap gap-3">
                      <TechIcon name="Express.js" icon="devicon-express-original" />
                      <TechIcon name="FastAPI" icon="devicon-fastapi-plain colored" />
                      <TechIcon name="Prisma" icon="devicon-prisma-original" />
                      <TechIcon name="Supabase" icon="devicon-supabase-plain colored" />
                      <TechIcon name="Redis" icon="devicon-redis-plain colored" />
                      <TechIcon name="Celery" icon="devicon-python-plain colored" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-foreground">UI/UX</h3>
                    <div className="flex flex-wrap gap-3">
                      <TechIcon name="Tailwind CSS" icon="devicon-tailwindcss-plain colored" />
                      <TechIcon name="Shadcn/ui" icon="devicon-react-original" />
                      <TechIcon name="Radix UI" icon="devicon-react-original" />
                      <TechIcon name="Canva" icon="devicon-canva-original colored" />
                      <TechIcon name="Figma" icon="devicon-figma-plain colored" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-foreground">AI</h3>
                    <div className="flex flex-wrap gap-3">
                      <TechIcon name="NumPy" icon="devicon-numpy-plain colored" />
                      <TechIcon name="Pandas" icon="devicon-pandas-plain colored" />
                      <TechIcon name="scikit-learn" icon="devicon-scikitlearn-plain colored" />
                      <TechIcon name="TensorFlow" icon="devicon-tensorflow-original colored" />
                      <TechIcon name="PyTorch" icon="devicon-pytorch-original colored" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-foreground">Package Management</h3>
                    <div className="flex flex-wrap gap-3">
                      <TechIcon name="npm" icon="devicon-npm-original-wordmark colored" />
                      <TechIcon name="PyPI" icon="devicon-python-plain colored" />
                      <TechIcon name="Chocolatey" icon="devicon-windows8-original colored" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-foreground">DevOps & Deployment</h3>
                    <div className="flex flex-wrap gap-3">
                      <TechIcon name="Docker" icon="devicon-docker-plain colored" />
                      <TechIcon name="Git" icon="devicon-git-plain colored" />
                      <TechIcon name="Github Actions" icon="devicon-githubactions-plain" />
                      <TechIcon name="Vercel" icon="devicon-vercel-plain" />
                    </div>
                  </div>
                </div>
              </TooltipProvider>
            </CardContent>
          </Card>
        </section>

        {/* Open Source & Contact */}
        <section className="grid md:grid-cols-2 gap-8">
          <Card className="bg-card/80 border-border shadow-lg">
            <CardHeader>
              <CardTitle className="text-primary">Open Source</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-card-foreground/80 leading-relaxed mb-4">
                I care about open source because it turns private learning into public infrastructure.
              </p>
              <p className="text-sm text-muted-foreground">I'm most interested in contributing to:</p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-2">
                <li>Dev tools</li>
                <li>AI infrastructure</li>
                <li>Education-focused software</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-card/80 border-border shadow-lg">
            <CardHeader>
              <CardTitle className="text-primary">Languages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><strong className="text-foreground">English:</strong> <span className="text-muted-foreground">Literally the preferred choice in many scenarios</span></p>
              <p><strong className="text-foreground">Korean:</strong> <span className="text-muted-foreground">Native language, I do poetry and short stories occasionally</span></p>
              <p><strong className="text-foreground">Spanish:</strong> <span className="text-muted-foreground">Has talked with locals on the camino de santiago</span></p>
              <p><strong className="text-foreground">Chinese:</strong> <span className="text-muted-foreground">Relearning (former YCT4)</span></p>
            </CardContent>
          </Card>
        </section>

        {/* Contact Section */}
        <section>
          <Card className="bg-card/80 border-border shadow-lg">
            <CardHeader>
              <CardTitle className="text-primary">Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-card-foreground/80 mb-4">
                If you want to collaborate, talk shop, or build something questionable in a productive way:
              </p>
              <p className="text-lg font-semibold text-primary mb-4">jay7math@gmail.com</p>
              <p className="text-sm text-muted-foreground">Not interested in:</p>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                <li>Crypto miracles</li>
                <li>"star my repos and back"</li>
                <li>"definitely not a malware!!! pls PR this mp4!!!"</li>
              </ul>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="py-8 text-center text-muted-foreground border-t mt-12">
        <p>&copy; {new Date().getFullYear()} VectorSophie. All rights reserved.</p>
        <p>Made with next.js, vercel and love.</p>
      </footer>
    </div>
  );
}
