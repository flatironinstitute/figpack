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
  const [expanded, setExpanded] = React.useState(false);

  const handleChange = (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded);
  };

  return (
    <Accordion onChange={handleChange}>
      <AccordionSummary
        expandIcon={<ExpandMore />}
        aria-controls="figure-preview-content"
        id="figure-preview-header"
        sx={{
          "&:hover": {
            backgroundColor: "rgba(0, 0, 0, 0.1)",
            "& .MuiTypography-root": {
              color: "primary.main",
            },
          },
        }}
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
          {expanded && (
            <iframe
              src={figureUrl}
              title="Figure Preview"
              style={{
                width: "100%",
                height: "100%",
                border: "none",
              }}
            />
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default FigurePreview;
