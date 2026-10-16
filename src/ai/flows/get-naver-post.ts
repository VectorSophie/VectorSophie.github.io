import 'server-only';
/**
 * @fileOverview Fetches the latest blog post from a Naver blog RSS feed.
 *
 * - getLatestBlogPost - A function that fetches and parses the latest blog post.
 * - GetLatestBlogPostInput - The input type for the getLatestBlogPost function.
 * - GetLatestBlogPostOutput - The return type for the getLatestBlogPost function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { BlogPost } from '@/lib/data';

const GetLatestBlogPostInputSchema = z.object({
  blogId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/).describe('The ID of the Naver blog.'),
});
export type GetLatestBlogPostInput = z.infer<typeof GetLatestBlogPostInputSchema>;

const GetLatestBlogPostOutputSchema = z.object({
  title: z.string(),
  url: z.string(),
  publishedAt: z.string(),
  content: z.string(),
});
export type GetLatestBlogPostOutput = z.infer<typeof GetLatestBlogPostOutputSchema>;


export async function getLatestBlogPost(input: GetLatestBlogPostInput): Promise<GetLatestBlogPostOutput> {
    return getLatestBlogPostFlow(input);
}

// Simple and naive XML parser
function parseValue(xml: string, tag: string): string {
    const startTag = `<${tag}>`;
    const endTag = `</${tag}>`;
    const startIndex = xml.indexOf(startTag);
    if (startIndex === -1) return '';
    const endIndex = xml.indexOf(endTag, startIndex);
    if (endIndex === -1) return '';
    let value = xml.substring(startIndex + startTag.length, endIndex);
    // Handle CDATA
    if (value.startsWith('<![CDATA[')) {
        value = value.substring(9, value.length - 3);
    }
    return value;
}

// Simple and naive HTML tag remover
function stripHtml(html: string): string {
    return html.replace(/<[^>]*>?/gm, '');
}

const getLatestBlogPostFlow = ai.defineFlow(
  {
    name: 'getLatestBlogPostFlow',
    inputSchema: GetLatestBlogPostInputSchema,
    outputSchema: GetLatestBlogPostOutputSchema,
  },
  async ({ blogId }) => {
    const rssUrl = `https://blog.rss.naver.com/${blogId}.xml`;
    const response = await fetch(rssUrl, { signal: AbortSignal.timeout(8000), next: { revalidate: 3600 } });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch RSS feed: ${response.statusText}`);
    }

    const xmlText = await response.text();
    
    const firstItemStart = xmlText.indexOf('<item>');
    const firstItemEnd = xmlText.indexOf('</item>', firstItemStart);
    if (firstItemStart < 0 || firstItemEnd < 0) throw new Error('No items found in RSS feed');
    const itemXml = xmlText.substring(firstItemStart, firstItemEnd + '</item>'.length);
    
    if (!itemXml) {
        throw new Error('No items found in RSS feed');
    }

    const title = parseValue(itemXml, 'title');
    const rawUrl = new URL(parseValue(itemXml, 'link'));
    if (rawUrl.protocol !== 'https:' || !['blog.naver.com', 'm.blog.naver.com'].includes(rawUrl.hostname)) {
      throw new Error('Unexpected Naver post URL');
    }
    const url = rawUrl.href;
    const rawDescription = parseValue(itemXml, 'description');
    const publishedAt = parseValue(itemXml, 'pubDate');

    const content = stripHtml(rawDescription);

    const date = new Date(publishedAt);
    const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    
    return {
        title,
        url,
        content,
        publishedAt: formattedDate
    };
  }
);
