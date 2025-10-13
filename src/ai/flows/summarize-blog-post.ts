'use server';

/**
 * @fileOverview Summarizes a Naver blog post using GenAI.
 *
 * - summarizeBlogPost - A function that summarizes the blog post content.
 * - SummarizeBlogPostInput - The input type for the summarizeBlogPost function.
 * - SummarizeBlogPostOutput - The return type for the summarizeBlogPost function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeBlogPostInputSchema = z.object({
  blogContent: z
    .string()
    .describe('The content of the Naver blog post to summarize.'),
});
export type SummarizeBlogPostInput = z.infer<typeof SummarizeBlogPostInputSchema>;

const SummarizeBlogPostOutputSchema = z.object({
  summary: z.string().describe('A short summary of the Naver blog post.'),
});
export type SummarizeBlogPostOutput = z.infer<typeof SummarizeBlogPostOutputSchema>;

export async function summarizeBlogPost(input: SummarizeBlogPostInput): Promise<SummarizeBlogPostOutput> {
  return summarizeBlogPostFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeBlogPostPrompt',
  input: {schema: SummarizeBlogPostInputSchema},
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
