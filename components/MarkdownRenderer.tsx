import React, { useState, useEffect } from 'react';
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
    const [isDarkMode, setIsDarkMode] = useState(false);
    const { theme } = useTheme();

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setIsDarkMode(mediaQuery.matches);

        const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
        mediaQuery.addEventListener('change', handler);

        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    const syntaxTheme = isDarkMode ? vscDarkPlus : materialLight;

    return (
        <ReactMarkdown
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
            rehypePlugins={[rehypeRaw]}
            components={{
                code({ node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return match ? (
                        <SyntaxHighlighter
                            style={syntaxTheme}
                            language={match[1]}
                            PreTag="div"
                            {...props}
                        >
                            {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                    ) : (
                        <code className={className} {...props}>
                            {children}
                        </code>
                    );
                },
            }}
        >
            {content}
        </ReactMarkdown>
    );
};