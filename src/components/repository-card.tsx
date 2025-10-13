"use client";
import type { Repository } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';

const languageColors: { [key: string]: string } = {
  TypeScript: 'bg-chart-1',
  JavaScript: 'bg-chart-2',
  Python: 'bg-chart-3',
  HTML: 'bg-chart-4',
  Go: 'bg-chart-5',
};

export default function RepositoryCard({ repo }: { repo: Repository }) {
  return (
    <a href={repo.url} target="_blank" rel="noopener noreferrer" className="block group">
      <Card className="h-full bg-card/80 hover:bg-card/95 border-border hover:border-primary/50 transition-all duration-300 transform hover:-translate-y-1 shadow-lg shadow-background">
        <CardHeader>
          <CardTitle className="text-primary group-hover:underline">{repo.name}</CardTitle>
          <CardDescription className="pt-2">{repo.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${languageColors[repo.language] || 'bg-muted'}`}></span>
              <span>{repo.language}</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400" />
              <span>{repo.stars}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </a>
  );
}
