import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** GitHub-flavored markdown renderer for issue bodies and comments. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:mt-4 prose-headings:mb-2 prose-p:my-1.5 prose-pre:bg-muted prose-pre:text-foreground prose-code:before:content-none prose-code:after:content-none prose-a:text-primary [&_table]:text-xs [&_img]:max-h-96">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
