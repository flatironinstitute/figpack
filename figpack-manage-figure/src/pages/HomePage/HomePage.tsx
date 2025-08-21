import { Paper } from "@mui/material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import homeContent from "./home.md?raw";

const HomePage = () => {
  return (
    <Paper sx={{ p: 4, borderRadius: 2 }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { children, className } = props;
            const match = /language-(\w+)/.exec(className || "");
            return match ? (
              <SyntaxHighlighter
                style={oneLight}
                language={match[1]}
                PreTag="div"
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            ) : (
              <code className={className}>{children}</code>
            );
          },
        }}
      >
        {homeContent}
      </ReactMarkdown>
    </Paper>
  );
};

export default HomePage;
