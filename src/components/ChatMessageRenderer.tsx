import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, Terminal, FileCode } from 'lucide-react';

interface ChatMessageRendererProps {
  content: string;
  isUser?: boolean;
}

interface CodeBlockProps {
  language?: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API fails in iframe
      const textarea = document.createElement('textarea');
      textarea.value = code;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const displayLang = language && language.trim() ? language.trim() : 'code';

  return (
    <div className="my-2.5 rounded-xl overflow-hidden border border-neutral-700/80 bg-neutral-950 text-neutral-100 shadow-md">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-neutral-900 border-b border-neutral-800 text-[11px]">
        <div className="flex items-center gap-1.5 font-mono text-neutral-400 font-semibold uppercase tracking-wider">
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span>{displayLang}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer active:scale-95"
          title="Sao chép toàn bộ mã nguồn"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Đã chép!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Sao chép</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <div className="p-3 overflow-x-auto font-mono text-xs leading-relaxed selection:bg-emerald-500/30">
        <pre className="m-0 p-0">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

export const ChatMessageRenderer: React.FC<ChatMessageRendererProps> = ({ content, isUser }) => {
  // If user message, render clean typography with linebreaks
  if (isUser) {
    return <div className="whitespace-pre-wrap break-words leading-relaxed">{content}</div>;
  }

  return (
    <div className="chat-markdown-body text-xs sm:text-sm leading-relaxed break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom Table Rendering with GFM
          table: ({ children }) => (
            <div className="my-3 w-full overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700/80 bg-white/50 dark:bg-neutral-900/50 shadow-xs">
              <table className="w-full min-w-[320px] text-xs sm:text-sm border-collapse text-left">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-neutral-100/90 dark:bg-neutral-800/90 text-neutral-900 dark:text-neutral-100 font-semibold border-b border-neutral-200 dark:border-neutral-700">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-neutral-200/70 dark:divide-neutral-800/70">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="even:bg-neutral-500/5 hover:bg-emerald-500/5 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-3.5 py-2.5 text-xs font-bold tracking-wide text-neutral-800 dark:text-neutral-200 whitespace-nowrap bg-neutral-150/50 dark:bg-neutral-800/70">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3.5 py-2.5 text-xs sm:text-sm align-top leading-relaxed text-neutral-700 dark:text-neutral-200">
              {children}
            </td>
          ),

          // Custom Code Block vs Inline Code
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');

            // Check if this is a block code (has newline or language class)
            const isBlock = match || String(children).includes('\n');

            if (isBlock) {
              return (
                <CodeBlock
                  language={match ? match[1] : undefined}
                  code={codeString}
                />
              );
            }

            // Inline code chip
            return (
              <code
                className="px-1.5 py-0.5 mx-0.5 rounded-md font-mono text-[11px] sm:text-xs font-semibold bg-black/5 dark:bg-white/10 text-emerald-600 dark:text-emerald-400 border border-black/10 dark:border-white/10"
                {...props}
              >
                {children}
              </code>
            );
          },

          // Prevent default pre wrapping since CodeBlock handles its own pre
          pre: ({ children }) => <>{children}</>,

          // Headings
          h1: ({ children }) => (
            <h1 className="text-base sm:text-lg font-bold mt-4 mb-2 pb-1 border-b border-neutral-200 dark:border-neutral-800 tracking-tight text-neutral-900 dark:text-neutral-50">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm sm:text-base font-bold mt-3.5 mb-1.5 text-emerald-600 dark:text-emerald-400">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs sm:text-sm font-semibold mt-3 mb-1 text-neutral-800 dark:text-neutral-200">
              {children}
            </h3>
          ),

          // Paragraphs & Lists (Clean, spaced, easy to read)
          p: ({ children }) => (
            <p className="mb-2.5 last:mb-0 leading-relaxed text-neutral-800 dark:text-neutral-200">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 my-2.5 space-y-1.5 text-neutral-800 dark:text-neutral-200 marker:text-emerald-500 marker:text-sm">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 my-2.5 space-y-1.5 text-neutral-800 dark:text-neutral-200 marker:text-emerald-600 dark:marker:text-emerald-400 marker:font-semibold">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-1 text-xs sm:text-sm">
              {children}
            </li>
          ),

          // Blockquote (for Tips / Callouts / Notes)
          blockquote: ({ children }) => (
            <blockquote className="my-2.5 p-2.5 rounded-r-xl border-l-4 border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 italic shadow-xs">
              {children}
            </blockquote>
          ),

          // Strong / Bold
          strong: ({ children }) => (
            <strong className="font-bold text-neutral-900 dark:text-neutral-100">
              {children}
            </strong>
          ),

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 dark:text-emerald-400 underline underline-offset-2 hover:text-emerald-500 font-medium"
            >
              {children}
            </a>
          ),

          // Horizontal rule
          hr: () => (
            <hr className="my-3 border-t border-neutral-300 dark:border-neutral-700/80" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
