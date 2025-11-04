import {
  Add,
  CloudQueue,
  Delete,
  Edit,
  Storage,
  Public,
  Lock,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import React from "react";
import type { Bucket } from "./bucketsApi";

interface BucketsSummaryProps {
  buckets: Bucket[];
  onEditBucket: (bucket: Bucket) => void;
  onDeleteBucket: (bucket: Bucket) => void;
  onAddBucket: () => void;
}

const BucketsSummary: React.FC<BucketsSummaryProps> = ({
  buckets,
  onEditBucket,
  onDeleteBucket,
  onAddBucket,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "aws":
        return <CloudQueue />;
      case "cloudflare":
        return <Storage />;
      default:
        return <Storage />;
    }
  };

  const getProviderColor = (
    provider: string
  ): "primary" | "secondary" | "default" => {
    switch (provider) {
      case "aws":
        return "primary";
      case "cloudflare":
        return "secondary";
      default:
        return "default";
    }
  };

  return (
    <Card>
      <CardContent>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography variant="h6" component="h2">
            Storage Buckets ({buckets.length})
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={onAddBucket}
            size="small"
          >
            Add Bucket
          </Button>
        </Box>

        {buckets.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Storage sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No buckets configured
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Add storage buckets to manage figure uploads across different
              providers.
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={onAddBucket}
            >
              Add Your First Bucket
            </Button>
          </Box>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size={isMobile ? "small" : "medium"}>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Provider</TableCell>
                  {!isMobile && <TableCell>Description</TableCell>}
                  <TableCell>Authorization</TableCell>
                  {!isMobile && <TableCell>Created</TableCell>}
                  <TableCell>Endpoint</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {buckets.map((bucket) => (
                  <TableRow key={bucket.name} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getProviderIcon(bucket.provider)}
                        <Typography variant="body2" fontWeight="medium">
                          {bucket.name}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={bucket.provider.toUpperCase()}
                        color={getProviderColor(bucket.provider)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>

                    {!isMobile && (
                      <TableCell>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            maxWidth: 200,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {bucket.description}
                        </Typography>
                      </TableCell>
                    )}

                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {bucket.isPublic ? (
                          <Tooltip title="Public upload - anyone can upload">
                            <Chip
                              icon={<Public />}
                              label="Public"
                              color="success"
                              size="small"
                              variant="outlined"
                            />
                          </Tooltip>
                        ) : (
                          <Tooltip
                            title={`Restricted - ${
                              bucket.authorizedUsers.length === 0
                                ? "Admin only"
                                : `${
                                    bucket.authorizedUsers.length
                                  } authorized user${
                                    bucket.authorizedUsers.length === 1
                                      ? ""
                                      : "s"
                                  }`
                            }`}
                          >
                            <Chip
                              icon={<Lock />}
                              label={
                                bucket.authorizedUsers.length === 0
                                  ? "Admin Only"
                                  : `${
                                      bucket.authorizedUsers.length
                                    } User${
                                      bucket.authorizedUsers.length === 1
                                        ? ""
                                        : "s"
                                    }`
                              }
                              color="warning"
                              size="small"
                              variant="outlined"
                            />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>

                    {!isMobile && (
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(bucket.createdAt)}
                        </Typography>
                      </TableCell>
                    )}

                    <TableCell>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          maxWidth: isMobile ? 120 : 200,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {bucket.s3Endpoint}
                      </Typography>
                    </TableCell>

                    <TableCell align="right">
                      <Box display="flex" gap={0.5} justifyContent="flex-end">
                        <Tooltip title="Edit bucket">
                          <IconButton
                            size="small"
                            onClick={() => onEditBucket(bucket)}
                            color="primary"
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete bucket">
                          <IconButton
                            size="small"
                            onClick={() => onDeleteBucket(bucket)}
                            color="error"
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default BucketsSummary;
