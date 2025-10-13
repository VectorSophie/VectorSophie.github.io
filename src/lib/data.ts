export type Repository = {
  name: string;
  url: string;
  description: string;
  language: string;
  stars: number;
};

export type BlogPost = {
  title: string;
  url: string;
  publishedAt: string;
  content: string;
};
