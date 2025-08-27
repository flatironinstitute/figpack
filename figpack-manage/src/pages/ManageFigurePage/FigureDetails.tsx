import {
  Box,
  Card,
  CardContent,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
} from "@mui/material";
import React from "react";
import type { BacklinkEntry } from "../../contexts/backlinksTypes";

interface FigureDetailsProps {
  backlinks?: BacklinkEntry[];
  figpackStatus: {
    figureUrl: string;
    bucket?: string;
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
  backlinks = [],
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
                    <TableCell
                      sx={{ fontFamily: "monospace", wordBreak: "break-word" }}
                    >
                      {figpackStatus.figureUrl ? (
                        <Link
                          href={figpackStatus.figureUrl}
                          sx={{
                            textDecoration: "none",
                            color: "inherit",
                            "&:hover": {
                              textDecoration: "underline",
                            },
                          }}
                        >
                          {figpackStatus.figureUrl}
                        </Link>
                      ) : (
                        "N/A"
                      )}
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
                  <TableRow>
                    <TableCell sx={{ color: "text.secondary" }}>
                      Bucket
                    </TableCell>
                    <TableCell>{figpackStatus.bucket}</TableCell>
                  </TableRow>
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
                  {backlinks && (
                    <TableRow>
                      <TableCell sx={{ color: "text.secondary" }}>
                        Backlinks
                      </TableCell>
                      <TableCell>
                        {backlinks.length > 0 ? (
                          <Box component="ul" sx={{ m: 0, pl: 2 }}>
                            {backlinks.map((backlink, index) => (
                              <li key={index}>
                                <Box sx={{ fontWeight: "medium" }}>
                                  {backlink.repo}
                                </Box>
                                <Link
                                  href={`https://github.com/${backlink.repo}/blob/main/${backlink.file}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  sx={{
                                    color: "text.secondary",
                                    fontSize: "0.875em",
                                    display: "block",
                                    textDecoration: "none",
                                    "&:hover": {
                                      textDecoration: "underline",
                                    },
                                  }}
                                >
                                  {backlink.file}
                                </Link>
                              </li>
                            ))}
                          </Box>
                        ) : (
                          "No backlinks"
                        )}
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
