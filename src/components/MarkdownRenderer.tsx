import { useMemo } from "react";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const html = useMemo(() => {
    let processed = content;

    // Code blocks (must be before inline code)
    processed = processed.replace(
      /```(\w+)?\n([\s\S]*?)```/g,
      '<pre><code class="language-$1">$2</code></pre>'
    );

    // Inline code
    processed = processed.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headers
    processed = processed.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    processed = processed.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    processed = processed.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold and italic
    processed = processed.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Links
    processed = processed.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    // Images
    processed = processed.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      '<img src="$2" alt="$1" />'
    );

    // Blockquotes
    processed = processed.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

    // Horizontal rules
    processed = processed.replace(/^---$/gim, '<hr />');

    // Unordered lists
    processed = processed.replace(/^\* (.*$)/gim, '<li>$1</li>');
    processed = processed.replace(/^- (.*$)/gim, '<li>$1</li>');
    processed = processed.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Ordered lists
    processed = processed.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');

    // Paragraphs
    const lines = processed.split('\n');
    const paragraphs: string[] = [];
    let currentParagraph = '';

    for (const line of lines) {
      if (line.trim() === '') {
        if (currentParagraph) {
          paragraphs.push(currentParagraph);
          currentParagraph = '';
        }
      } else if (
        line.startsWith('<h') ||
        line.startsWith('<pre') ||
        line.startsWith('<ul') ||
        line.startsWith('<ol') ||
        line.startsWith('<blockquote') ||
        line.startsWith('<hr')
      ) {
        if (currentParagraph) {
          paragraphs.push(`<p>${currentParagraph}</p>`);
          currentParagraph = '';
        }
        paragraphs.push(line);
      } else {
        currentParagraph += (currentParagraph ? ' ' : '') + line;
      }
    }

    if (currentParagraph) {
      paragraphs.push(`<p>${currentParagraph}</p>`);
    }

    return paragraphs.join('\n');
  }, [content]);

  return (
    <div 
      className="prose-custom"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
