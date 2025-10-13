export type Repository = {
  name: string;
  url: string;
  description: string;
  language: string;
  stars: number;
};

export const repositories: Repository[] = [
  {
    name: 'neon-engine',
    url: 'https://github.com/VectorSophie/neon-engine',
    description: 'A lightweight 2D game engine with a focus on neon aesthetics and performance.',
    language: 'TypeScript',
    stars: 128,
  },
  {
    name: 'cyber-notes',
    url: 'https://github.com/VectorSophie/cyber-notes',
    description: 'A futuristic note-taking app with markdown support and a customizable interface.',
    language: 'JavaScript',
    stars: 256,
  },
  {
    name: 'data-synthesizer',
    url: 'https://github.com/VectorSophie/data-synthesizer',
    description: 'A Python tool for generating realistic synthetic datasets for machine learning.',
    language: 'Python',
    stars: 310,
  },
  {
    name: 'portfolio-v1',
    url: 'https://github.com/VectorSophie/portfolio-v1',
    description: 'The first version of my personal portfolio website, built with pure HTML and CSS.',
    language: 'HTML',
    stars: 42,
  },
  {
    name: 'go-blockchain',
    url: 'https://github.com/VectorSophie/go-blockchain',
    description: 'A simple blockchain implementation written in Go to understand the fundamentals.',
    language: 'Go',
    stars: 99,
  },
  {
    name: 'dotfiles',
    url: 'https://github.com/VectorSophie/dotfiles',
    description: 'My personal development environment configurations for zsh, vim, and more.',
    language: 'TypeScript',
    stars: 75,
  },
];

export type BlogPost = {
  title: string;
  url: string;
  publishedAt: string;
  content: string;
};

export const latestPost: BlogPost = {
  title: 'Exploring the Aesthetics of Retrofuturism in UI Design',
  url: 'https://blog.naver.com/paranormalian',
  publishedAt: 'July 15, 2024',
  content: `Retrofuturism is more than just a visual style; it's a bridge between the past's vision of the future and our present reality. In UI design, this manifests as a fascinating blend of old-school hardware aesthetics—like chunky CRT monitors, glowing green text, and physical-looking buttons—with modern usability principles. The charm lies in the nostalgia, a longing for a future that was imagined but never quite came to be. This design language often employs a dark color palette, punctuated by vibrant, neon colors that mimic the glow of early computer screens. Typography plays a key role, with monospaced and pixelated fonts evoking a sense of computational history. By integrating these elements, we create interfaces that are not only functional but also tell a story, invoking a unique emotional response from the user. It's a testament to the idea that looking back can be the most innovative way to move forward in design.`,
};
