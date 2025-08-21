import React from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
} from "@mui/material";
import { ExpandMore, Preview } from "@mui/icons-material";

interface FigurePreviewProps {
  figureUrl: string;
}

const FigurePreview: React.FC<FigurePreviewProps> = ({ figureUrl }) => {
  return (
    <Accordion>
      <AccordionSummary
        expandIcon={<ExpandMore />}
        aria-controls="figure-preview-content"
        id="figure-preview-header"
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Preview color="primary" />
          <Typography variant="h6">Figure Preview</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box
          sx={{
            width: "100%",
            height: "500px",
            border: "1px solid #ccc",
            borderRadius: "4px",
            overflow: "hidden",
          }}
        >
          <iframe
            src={figureUrl}
            title="Figure Preview"
            style={{
              width: "100%",
              height: "100%",
              border: "none",
            }}
          />
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default FigurePreview;
