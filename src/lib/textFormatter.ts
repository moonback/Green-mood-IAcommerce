/**
 * Helps format plain text descriptions into cleaner HTML.
 * Converts double newlines to paragraphs, single newlines to br, 
 * and lines starting with dashes/dots to bullet points.
 */
export function formatProductText(text: string): string {
  if (!text) return '';
  
  // If text already has HTML tags like <p> or <ul>, return as is
  if (/<(p|ul|li|strong|br|div)[\s>]/i.test(text)) {
    return text.trim();
  }

  // Handle bullet points start at line beginning
  let lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let html = '';
  let inList = false;

  lines.forEach(line => {
    // Detect bullet points (-, *, •)
    if (/^[-*•]\s+/.test(line)) {
      if (!inList) {
        html += '<ul class="list-disc pl-5 mb-4 space-y-1">';
        inList = true;
      }
      html += `<li>${line.replace(/^[-*•]\s+/, '')}</li>`;
    } else {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      // Wrap normal lines in a paragraph if it's not empty
      html += `<p class="mb-4">${line}</p>`;
    }
  });

  if (inList) html += '</ul>';

  return html;
}
