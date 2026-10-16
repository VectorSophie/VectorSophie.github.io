import 'server-only';

/**
 * @fileOverview Summarizes a Naver blog post using GenAI.
 *
 * - summarizeBlogPost - A function that summarizes the blog post content.
 * - SummarizeBlogPostInput - The input type for the summarizeBlogPost function.
 * - SummarizeBlogPostOutput - The return type for the summarizeBlogPost function.
 */

import { unstable_cache } from 'next/cache';
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeBlogPostInputSchema = z.object({
  blogContent: z
    .string().min(1).max(12000)
    .describe('The content of the Naver blog post to summarize.'),
});
export type SummarizeBlogPostInput = z.infer<typeof SummarizeBlogPostInputSchema>;

const SummarizeBlogPostOutputSchema = z.object({
  summary: z.string().describe('A short summary of the Naver blog post.'),
});
export type SummarizeBlogPostOutput = z.infer<typeof SummarizeBlogPostOutputSchema>;

// Only server components call this function; it is not a public Server Action.
// Cache by bounded content so page refreshes reuse the same model result.
const cachedSummary = unstable_cache(
  async (blogContent: string) => summarizeBlogPostFlow({ blogContent }),
  ['blog-summary-v1'],
  { revalidate: 86400 },
);
export async function summarizeBlogPost(input: SummarizeBlogPostInput): Promise<SummarizeBlogPostOutput> {
  if (process.env.ENABLE_AI_SUMMARIES !== 'true') {
    return { summary: input.blogContent.slice(0, 220) + (input.blogContent.length > 220 ? '…' : '') };
  }
  const parsed = SummarizeBlogPostInputSchema.parse({ blogContent: input.blogContent.slice(0, 12000) });
  return cachedSummary(parsed.blogContent);
}

const prompt = ai.definePrompt({
  name: 'summarizeBlogPostPrompt',
  input: {schema: SummarizeBlogPostInputSchema},
  config: { maxOutputTokens: 256 },
  output: {schema: SummarizeBlogPostOutputSchema},
  prompt: `Summarize the following Naver blog post content in a concise paragraph:

{{{blogContent}}}`,
});

const summarizeBlogPostFlow = ai.defineFlow(
  {
    name: 'summarizeBlogPostFlow',
    inputSchema: SummarizeBlogPostInputSchema,
    outputSchema: SummarizeBlogPostOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
