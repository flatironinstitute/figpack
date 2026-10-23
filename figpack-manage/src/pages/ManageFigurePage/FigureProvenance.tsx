import { ContentCopy } from "@mui/icons-material";
import { Box, Link, Typography } from "@mui/material";
import React from "react";
import { Link as RouterLink } from "react-router-dom";

interface FigureProvenanceProps {
  copiedFromUrl: string;
  originalUrl?: string;
  originalOwnerEmail?: string;
}

const manageLink = (figureUrl: string) =>
  `/figure?figure_url=${encodeURIComponent(figureUrl)}`;

// "Copied from <source> · originally created by <email>" for figures made by
// POST /figures/copy. The links go to the figures' manage pages, which still
// work after a figure has expired.
const FigureProvenance: React.FC<FigureProvenanceProps> = ({
  copiedFromUrl,
  originalUrl,
  originalOwnerEmail,
}) => {
  const original = originalOwnerEmail
    ? `originally created by ${originalOwnerEmail}`
    : "originally an ephemeral figure";
  return (
    <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
      <ContentCopy color="action" fontSize="small" />
      <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
        Copied from{" "}
        <Link component={RouterLink} to={manageLink(copiedFromUrl)}>
          {copiedFromUrl.replace(/\/index\.html$/, "")}
        </Link>{" "}
        · {original}
        {originalUrl && originalUrl !== copiedFromUrl && (
          <>
            {" ("}
            <Link component={RouterLink} to={manageLink(originalUrl)}>
              original figure
            </Link>
            {")"}
          </>
        )}
      </Typography>
    </Box>
  );
};

export default FigureProvenance;
