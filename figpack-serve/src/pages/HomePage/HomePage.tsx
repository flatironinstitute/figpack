import { Paper } from "@mui/material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import homeContent from "./home.md?raw";

const HomePage = () => {
  return (
    <Paper sx={{ p: 4, borderRadius: 2 }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{homeContent}</ReactMarkdown>
    </Paper>
  );
};

export default HomePage;
