
/**
 * Utilities to process Obsidian-style Markdown for the BudTender Knowledge Base.
 */

interface ObsidianParsed {
  title: string;
  content: string;
  tags: string[];
  category?: string;
}

/**
 * Removes Obsidian-specific syntax to make the text cleaner for embeddings.
 */
export function cleanObsidianMarkdown(text: string): string {
  return text
    // 1. Remove Frontmatter (--- ... ---)
    .replace(/^---[\s\S]*?---/, '')
    // 2. Convert [[WikiLinks]] to plain text
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1')
    // 3. Remove Tags (#tag) - keeping the word if it's part of a sentence is tricky, 
    // but usually standalone tags are metadata.
    .replace(/(^|\s)#([a-zA-Z0-9_\-/]+)/g, '$1$2')
    // 4. Remove comments (%% ... %%)
    .replace(/%%[\s\S]*?%%/g, '')
    // 5. Remove internal callouts like > [!INFO]
    .replace(/>\s*\[![^\]]+\][-+]?\s*/g, '')
    // 6. Cleanup formatting
    .replace(/==([^=]+)==/g, '$1') // remove highlights
    .trim();
}

/**
 * Parses a markdown file content, extracting metadata if available in frontmatter.
 */
export function parseObsidianNote(content: string, filename: string): ObsidianParsed {
  const frontmatterMatch = content.match(/^---([\s\S]*?)---/);
  const metadata: Record<string, any> = {};
  
  if (frontmatterMatch) {
    const yaml = frontmatterMatch[1];
    yaml.split('\n').forEach(line => {
      const [key, ...val] = line.split(':');
      if (key && val.length > 0) {
        metadata[key.trim()] = val.join(':').trim();
      }
    });
  }

  const title = metadata.title || metadata.name || filename.replace(/\.md$/i, '').replace(/_/g, ' ');
  const category = metadata.category || 'other';
  
  // Basic tag extraction if they are in the yaml
  let tags: string[] = [];
  if (metadata.tags) {
    if (typeof metadata.tags === 'string') {
      tags = metadata.tags.split(',').map((t: string) => t.trim());
    } else if (Array.isArray(metadata.tags)) {
      tags = metadata.tags.map(String);
    }
  }

  const cleanedContent = cleanObsidianMarkdown(content);

  return {
    title,
    content: cleanedContent,
    tags,
    category
  };
}
