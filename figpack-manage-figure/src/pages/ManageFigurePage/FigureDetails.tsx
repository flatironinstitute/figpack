import {
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
} from "@mui/material";
import React from "react";

interface FigureDetailsProps {
  figpackStatus: {
    figureUrl: string;
    ownerEmail?: string;
    figpackVersion: string;
    totalSize?: number;
    uploadStarted: number;
    uploadCompleted?: number;
    expiration: number;
    hasWriteAccess?: boolean;
    figureManagementUrl?: string;
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
          <CardContent sx={{ pt: 0 }}>
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ width: "40%", color: "text.secondary" }}>
                      Figure URL
                    </TableCell>
                    <TableCell sx={{ fontFamily: "monospace" }}>
                      {figpackStatus.figureUrl || "N/A"}
                    </TableCell>
                  </TableRow>
                  {figpackStatus.ownerEmail && (
                    <TableRow>
                      <TableCell sx={{ color: "text.secondary" }}>
                        Owner
                      </TableCell>
                      <TableCell>{figpackStatus.ownerEmail}</TableCell>
                    </TableRow>
                  )}
                  {figpackStatus.hasWriteAccess !== undefined && (
                    <TableRow>
                      <TableCell sx={{ color: "text.secondary" }}>
                        Access Level
                      </TableCell>
                      <TableCell>
                        {figpackStatus.hasWriteAccess
                          ? "Write Access"
                          : "Read Only"}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell sx={{ color: "text.secondary" }}>
                      Figpack Version
                    </TableCell>
                    <TableCell>
                      {figpackStatus.figpackVersion || "N/A"}
                    </TableCell>
                  </TableRow>
                  {figpackStatus.totalSize && (
                    <TableRow>
                      <TableCell sx={{ color: "text.secondary" }}>
                        Total Size
                      </TableCell>
                      <TableCell>
                        {formatBytes(figpackStatus.totalSize)}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>

      {/* Timeline Information */}
      <Box sx={{ flex: 1 }}>
        <Card>
          <CardContent sx={{ pt: 0 }}>
            <TableContainer>
              <Table size="small">
                <TableBody>
                  {figpackStatus.uploadStarted && (
                    <TableRow>
                      <TableCell sx={{ width: "40%", color: "text.secondary" }}>
                        Upload Started
                      </TableCell>
                      <TableCell>
                        {formatDate(figpackStatus.uploadStarted)}
                      </TableCell>
                    </TableRow>
                  )}
                  {figpackStatus.uploadCompleted && (
                    <TableRow>
                      <TableCell sx={{ color: "text.secondary" }}>
                        Upload Completed
                      </TableCell>
                      <TableCell>
                        {formatDate(figpackStatus.uploadCompleted)}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell sx={{ color: "text.secondary" }}>
                      Expiration
                    </TableCell>
                    <TableCell>
                      {formatDate(figpackStatus.expiration)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default FigureDetails;
