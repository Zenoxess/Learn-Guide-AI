import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialLight, vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../contexts/ThemeContext';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
    const { theme, isDarkMode } = useTheme();

    const syntaxTheme = isDarkMode ? vscDarkPlus : materialLight;

    return (
        // FIX: Moved className to a wrapping div to correctly apply prose styles and fix a type error.
        <div
            className={`
                prose prose-slate dark:prose-invert max-w-none 
                prose-headings:font-semibold prose-headings:mb-3 prose-headings:mt-8
                prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
                prose-p:leading-relaxed 
                prose-blockquote:font-normal prose-blockquote:not-italic
                prose-hr:my-8
                ${theme['prose-headings']}
                ${theme['prose-strong']}
                ${theme['prose-a']}
                ${theme['prose-blockquote']}
                ${theme['prose-hr']}
                ${theme['prose-li-marker']}
                ${className}
            `}
        >
            <ReactMarkdown
                rehypePlugins={[rehypeRaw]}
                components={{
                    // FIX: Destructure `ref` from props passed to SyntaxHighlighter to avoid type conflict.
                    // react-markdown passes a ref for HTMLElement, which is not compatible with SyntaxHighlighter's component ref.
                    code({ node, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        if (match) {
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                            const { ref, ...rest } = props;
                            return (
                                <SyntaxHighlighter
                                    // FIX: Cast style to `any` to resolve type mismatch from react-syntax-highlighter.
                                    style={syntaxTheme as any}
                                    language={match[1]}
                                    PreTag="div"
                                    {...rest}
                                >
                                    {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                            );
                        }
                        return (
                            <code className={className} {...props}>
                                {children}
                            </code>
                        );
                    },
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};
