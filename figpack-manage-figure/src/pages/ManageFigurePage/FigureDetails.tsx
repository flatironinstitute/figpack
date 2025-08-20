import React from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Stack,
  Typography,
} from "@mui/material";
import { Info, Schedule } from "@mui/icons-material";

interface FigureDetailsProps {
  figpackStatus: {
    figureId: string;
    ownerEmail?: string;
    figpackVersion: string;
    totalSize?: number;
    uploadStarted: number;
    uploadCompleted?: number;
    expiration: number;
    hasWriteAccess?: boolean;
  };
  formatBytes: (bytes: number) => string;
  formatDate: (timestamp: number) => string;
}

const FigureDetails: React.FC<FigureDetailsProps> = ({
  figpackStatus,
  formatBytes,
  formatDate,
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        gap: 3,
      }}
    >
      {/* Figure Information */}
      <Box sx={{ flex: 1 }}>
        <Card>
          <CardHeader
            avatar={<Info color="primary" />}
            title="Figure Information"
            titleTypographyProps={{ variant: "h6" }}
          />
          <CardContent sx={{ pt: 0 }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Figure ID
                </Typography>
                <Typography variant="body1" sx={{ fontFamily: "monospace" }}>
                  {figpackStatus.figureId || "N/A"}
                </Typography>
              </Box>
              {figpackStatus.ownerEmail && (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Owner
                  </Typography>
                  <Typography variant="body1">
                    {figpackStatus.ownerEmail}
                  </Typography>
                </Box>
              )}
              {figpackStatus.hasWriteAccess !== undefined && (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Access Level
                  </Typography>
                  <Typography variant="body1">
                    {figpackStatus.hasWriteAccess
                      ? "Write Access"
                      : "Read Only"}
                  </Typography>
                </Box>
              )}
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Figpack Version
                </Typography>
                <Typography variant="body1">
                  {figpackStatus.figpackVersion || "N/A"}
                </Typography>
              </Box>
              {figpackStatus.totalSize && (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Size
                  </Typography>
                  <Typography variant="body1">
                    {formatBytes(figpackStatus.totalSize)}
                  </Typography>
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {/* Timeline Information */}
      <Box sx={{ flex: 1 }}>
        <Card>
          <CardHeader
            avatar={<Schedule color="primary" />}
            title="Timeline"
            titleTypographyProps={{ variant: "h6" }}
          />
          <CardContent sx={{ pt: 0 }}>
            <Stack spacing={2}>
              {figpackStatus.uploadStarted && (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Upload Started
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(figpackStatus.uploadStarted)}
                  </Typography>
                </Box>
              )}
              {figpackStatus.uploadCompleted && (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Upload Completed
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(figpackStatus.uploadCompleted)}
                  </Typography>
                </Box>
              )}
              {/* expiration is required in our new model */}
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Expiration
                </Typography>
                <Typography variant="body1">
                  {formatDate(figpackStatus.expiration)}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default FigureDetails;
