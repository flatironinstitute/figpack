import React from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Typography,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import { ExpandMore, Folder } from "@mui/icons-material";

export interface ManifestFile {
  path: string;
  size: number;
}

export interface Manifest {
  timestamp: number;
  files: ManifestFile[];
  total_size: number;
  total_files: number;
}

interface FileManifestProps {
  manifest: Manifest;
  formatBytes: (bytes: number) => string;
  formatDate: (timestamp: number) => string;
}

const FileManifest: React.FC<FileManifestProps> = ({
  manifest,
  formatBytes,
  formatDate,
}) => {
  return (
    <Accordion>
      <AccordionSummary
        expandIcon={<ExpandMore />}
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
          <Folder color="primary" />
          <Typography variant="h6">
            File Manifest ({manifest.files.length} files)
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
            }}
          >
            <Box sx={{ flex: 1, textAlign: "center" }}>
              <Typography variant="h4" color="primary.main">
                {manifest.total_files}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Files
              </Typography>
            </Box>
            <Box sx={{ flex: 1, textAlign: "center" }}>
              <Typography variant="h4" color="primary.main">
                {formatBytes(manifest.total_size)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Size
              </Typography>
            </Box>
            <Box sx={{ flex: 1, textAlign: "center" }}>
              <Typography variant="h4" color="primary.main">
                {formatDate(manifest.timestamp).split(",")[0]}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Created
              </Typography>
            </Box>
          </Box>

          <Divider />

          <Box sx={{ maxHeight: 300, overflow: "auto" }}>
            <List dense>
              {manifest.files.map((file, index) => (
                <ListItem key={index} sx={{ px: 0 }}>
                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: "monospace" }}
                      >
                        {file.path}
                      </Typography>
                    }
                    secondary={formatBytes(file.size)}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};

export default FileManifest;
