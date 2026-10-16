import 'server-only';
/**
 * @fileOverview Fetches blog posts from a Velog profile.
 *
 * - getVelogPosts - A function that fetches blog posts from Velog.
 * - GetVelogPostsInput - The input type for the getVelogPosts function.
 * - GetVelogPostsOutput - The return type for the getVelogPosts function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GetVelogPostsInputSchema = z.object({
  username: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/).describe('The username of the Velog blog.'),
  limit: z.number().int().min(1).max(10).optional().describe('Number of posts to fetch (default: 3)'),
});
export type GetVelogPostsInput = z.infer<typeof GetVelogPostsInputSchema>;

const VelogPostSchema = z.object({
  title: z.string(),
  url: z.string(),
  publishedAt: z.string(),
  content: z.string(),
});

const GetVelogPostsOutputSchema = z.object({
  posts: z.array(VelogPostSchema),
});
export type GetVelogPostsOutput = z.infer<typeof GetVelogPostsOutputSchema>;

export async function getVelogPosts(input: GetVelogPostsInput): Promise<GetVelogPostsOutput> {
    return getVelogPostsFlow(input);
}

const getVelogPostsFlow = ai.defineFlow(
  {
    name: 'getVelogPostsFlow',
    inputSchema: GetVelogPostsInputSchema,
    outputSchema: GetVelogPostsOutputSchema,
  },
  async ({ username, limit = 3 }) => {
    const query = `
      query Posts($username: String!, $limit: Int!) {
        posts(username: $username, limit: $limit) {
          id
          title
          short_description
          released_at
          url_slug
        }
      }
    `;

    const response = await fetch('https://v2.velog.io/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables: { username, limit } }),
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 3600 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Velog posts: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.data?.posts) {
      throw new Error('No posts found in Velog response');
    }

    const posts = data.data.posts.map((post: any) => {
      const date = new Date(post.released_at);
      const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      return {
        title: post.title,
        url: `https://velog.io/@${encodeURIComponent(username)}/${encodeURIComponent(post.url_slug)}`,
        publishedAt: formattedDate,
        content: post.short_description || '',
      };
    });

    return { posts };
  }
);
