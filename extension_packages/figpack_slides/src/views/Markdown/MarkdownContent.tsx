/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkMath from "remark-math";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vs as highlightStyle } from "react-syntax-highlighter/dist/esm/styles/prism";

interface MarkdownContentProps {
  content: string;
  doRehypeRaw?: boolean;
}

const MarkdownContent: FunctionComponent<MarkdownContentProps> = ({
  content,
  doRehypeRaw = true,
}) => {
  const rehypePlugins = useMemo(() => {
    const plugins: any[] = [rehypeKatex];
    if (doRehypeRaw) {
      plugins.push(rehypeRaw);
    }
    return plugins;
  }, [doRehypeRaw]);
  const remarkPlugins = useMemo(() => {
    const plugins: any[] = [remarkGfm, remarkMath];
    return plugins;
  }, []);
  const customUrlTransform = useMemo(
    () => (url: string) => {
      // we need a custom url transform so it doesn't strip the data urls for embedded images
      return url;
    },
    [],
  );
  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      components={{
        a({ children, ...props }) {
          return (
            <a
              href={props.href}
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          );
        },
        img({ alt, ...props }) {
          return <img alt={alt} {...props} />;
        },
        code(props) {
          const { children, className, ...rest } = props;
          const match = /language-(\w+)/.exec(className || "");
          const code = String(children).replace(/\n$/, "");

          // eslint-disable-next-line react-hooks/rules-of-hooks
          const [copied, setCopied] = useState(false);

          const handleCopy = () => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          };

          return match ? (
            <div style={{ position: "relative" }}>
              <SyntaxHighlighter
                PreTag="div"
                children={code}
                language={match[1]}
                style={highlightStyle}
              />
              <button
                onClick={handleCopy}
                style={{
                  color: "black",
                  position: "absolute",
                  right: "8px",
                  bottom: "24px",
                  padding: "4px 8px",
                  fontSize: "12px",
                  background: "#f5f5f5",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          ) : (
            <code
              {...rest}
              className={className}
              style={{ background: "#eee" }}
            >
              {children}
            </code>
          );
        },
      }}
      urlTransform={customUrlTransform}
    >
      {content}
    </ReactMarkdown>
  );
};

export default MarkdownContent;
