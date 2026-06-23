import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize from 'rehype-sanitize';

const MarkdownPreview = ({ ytext }) => {
  const [content, setContent] = useState('');

  useEffect(() => {
    if (!ytext) return;

    // Set initial content
    setContent(ytext.toString());

    // Listen for changes
    const observer = () => {
      setContent(ytext.toString());
    };

    ytext.observe(observer);
    return () => ytext.unobserve(observer);
  }, [ytext]);

  if (!content) {
    return (
      <div className="md-preview" style={{ opacity: 0.5 }}>
        <p style={{ fontStyle: 'italic', color: 'var(--text-tertiary)' }}>
          Start typing in the editor to see a live preview here...
        </p>
      </div>
    );
  }

  return (
    <div className="md-preview">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeSanitize]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownPreview;
