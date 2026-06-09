import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Server-rendered markdown with GitHub-flavored extensions. Styling is handled
 * by the `.markdown` scope in globals.css to keep the article typography
 * consistent and theme-aware.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
