/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  PushPin,
  Refresh,
  Schedule,
  Search,
  Settings,
  Visibility,
  Warning,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  Link,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useBacklinks } from "../../hooks/useBacklinks";
import type { FigureListItem, FigureListParams } from "./figuresApi";
import { getFigures } from "./figuresApi";
import { getStatusColor, getStatusIcon, getStatusLabel } from "./utils";

const FiguresPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { apiKey, user } = useAuth();
  const { backlinks, loading: backlinksLoading } = useBacklinks();

  // State
  const [figures, setFigures] = useState<FigureListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.isAdmin || false;

  // Pagination and filtering
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showAll, setShowAll] = useState(false);

  const limit = 25; // Items per page

  // Format functions
  const formatDate = useCallback((timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  }, []);

  const formatBytes = useCallback((bytes?: number) => {
    if (!bytes) return "N/A";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  }, []);

  const truncateEmail = useCallback((email: string) => {
    if (email.length <= 15) return email;
    return `${email.slice(0, 15)}...`;
  }, []);

  const getTimeUntilExpiration = useCallback((expiration: number) => {
    if (!expiration) {
      return "N/A";
    }
    const now = Date.now();
    const timeLeft = expiration - now;

    if (timeLeft <= 0) return "Expired";

    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  }, []);

  const isExpiringSoon = useCallback((expiration: number) => {
    if (!expiration) return false;
    const now = Date.now();
    const timeLeft = expiration - now;
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    return timeLeft > 0 && timeLeft <= threeDays;
  }, []);

  const isExpired = useCallback((expiration: number) => {
    return expiration && expiration <= Date.now();
  }, []);

  // Load figures
  const loadFigures = useCallback(async () => {
    if (!apiKey) return;

    setLoading(true);
    setError(null);

    const params: FigureListParams = {
      apiKey,
      all: showAll,
      page,
      limit,
      sortBy: sortBy as
        | "createdAt"
        | "updatedAt"
        | "expiration"
        | "figureUrl"
        | "status"
        | "title"
        | "ownerEmail",
      sortOrder,
    };

    if (statusFilter) {
      params.status = statusFilter as "uploading" | "completed" | "failed";
    }

    if (search.trim()) {
      params.search = search.trim();
    }

    try {
      const result = await getFigures(params);

      if (result.success) {
        setFigures(result.figures || []);
        setTotal(result.total || 0);
      } else {
        setError(result.message || "Failed to load figures");
      }
    } catch (err) {
      setError(`Error loading figures: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [apiKey, page, limit, search, statusFilter, sortBy, sortOrder, showAll]);

  // Effects
  useEffect(() => {
    loadFigures();
  }, [loadFigures]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sortBy, sortOrder, showAll]);

  // Handlers
  const handleRefresh = () => {
    loadFigures();
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  const handleStatusFilterChange = (event: any) => {
    setStatusFilter(event.target.value);
  };

  const handleSortChange = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setPage(value);
  };

  const handleShowAllChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setShowAll(event.target.checked);
  };

  const getManageUrl = (figureUrl: string) => {
    return `/figure?figure_url=${encodeURIComponent(figureUrl)}`;
  };

  const getBacklinkCount = (figureUrl: string) => {
    if (backlinksLoading || !backlinks) return 0;
    return backlinks.filter((backlink) => backlink.url === figureUrl).length;
  };

  const totalPages = Math.ceil(total / limit);

  if (!apiKey) {
    return (
      <Box sx={{ maxWidth: 1200, mx: "auto", mt: 4 }}>
        <Alert severity="info">
          Please log in using the Login button in the top menu bar to view your
          figures.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", mt: 4 }}>
      <Card>
        <CardContent>
          <Stack spacing={3}>
            {/* Header */}
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              flexWrap="wrap"
              gap={2}
            >
              <Typography variant="h4" component="h1">
                Figures
              </Typography>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={handleRefresh}
                disabled={loading}
              >
                Refresh
              </Button>
            </Box>

            {/* Admin Toggle */}
            {isAdmin && (
              <FormControlLabel
                control={
                  <Switch
                    checked={showAll}
                    onChange={handleShowAllChange}
                    disabled={loading}
                  />
                }
                label="View all figures (Admin)"
              />
            )}

            {/* Filters */}
            <Stack
              direction={isMobile ? "column" : "row"}
              spacing={2}
              alignItems="center"
            >
              <TextField
                label="Search"
                variant="outlined"
                size="small"
                value={search}
                onChange={handleSearchChange}
                placeholder="Search by URL, name, or description"
                InputProps={{
                  startAdornment: (
                    <Search sx={{ mr: 1, color: "text.secondary" }} />
                  ),
                }}
                sx={{ minWidth: 250 }}
              />

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                  label="Status"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="completed">
                    {getStatusLabel("completed")}
                  </MenuItem>
                  <MenuItem value="uploading">
                    {getStatusLabel("uploading")}
                  </MenuItem>
                  <MenuItem value="failed">{getStatusLabel("failed")}</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            {/* Error Display */}
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {/* Loading */}
            {loading && (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            )}

            {/* Results Summary */}
            {!loading && (
              <Typography variant="body2" color="text.secondary">
                {total === 0
                  ? "No figures found"
                  : `Showing ${figures.length} of ${total} figures`}
              </Typography>
            )}

            {/* Table */}
            {!loading && figures.length > 0 && (
              <TableContainer component={Paper} variant="outlined">
                <Table size={isMobile ? "small" : "medium"}>
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <Button
                          variant="text"
                          onClick={() => handleSortChange("status")}
                          size="small"
                        >
                          Status{" "}
                          {sortBy === "status" &&
                            (sortOrder === "asc" ? "↑" : "↓")}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="text"
                          onClick={() => handleSortChange("title")}
                          size="small"
                        >
                          Title{" "}
                          {sortBy === "title" &&
                            (sortOrder === "asc" ? "↑" : "↓")}
                        </Button>
                      </TableCell>
                      {!isMobile && (
                        <>
                          <TableCell>
                            <Button
                              variant="text"
                              onClick={() => handleSortChange("createdAt")}
                              size="small"
                            >
                              Created{" "}
                              {sortBy === "createdAt" &&
                                (sortOrder === "asc" ? "↑" : "↓")}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="text"
                              onClick={() => handleSortChange("ownerEmail")}
                              size="small"
                            >
                              Owner{" "}
                              {sortBy === "ownerEmail" &&
                                (sortOrder === "asc" ? "↑" : "↓")}
                            </Button>
                          </TableCell>
                        </>
                      )}
                      <TableCell>
                        <Button
                          variant="text"
                          onClick={() => handleSortChange("expiration")}
                          size="small"
                        >
                          Expires{" "}
                          {sortBy === "expiration" &&
                            (sortOrder === "asc" ? "↑" : "↓")}
                        </Button>
                      </TableCell>
                      {!isMobile && <TableCell>Size</TableCell>}
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {figures.map((figure) => (
                      <TableRow key={figure.figureUrl} hover>
                        <TableCell>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            {getStatusIcon(figure.status)}
                            <Chip
                              label={getStatusLabel(figure.status)}
                              color={getStatusColor(figure.status)}
                              size="small"
                            />
                          </Stack>
                        </TableCell>

                        <TableCell>
                          <Box>
                            <Link
                              href={getManageUrl(figure.figureUrl)}
                              sx={{
                                fontWeight: "medium",
                                mb: 0.5,
                                textDecoration: "none",
                                wordBreak: "break-word",
                                display: "block",
                                "&:hover": {
                                  textDecoration: "underline",
                                },
                              }}
                            >
                              {figure.title || figure.figureUrl}
                            </Link>
                            {figure.pinInfo?.name && (
                              <Typography
                                variant="caption"
                                display="block"
                                color="text.secondary"
                              >
                                {figure.pinInfo.name}
                              </Typography>
                            )}
                            {figure.pinInfo?.figureDescription && (
                              <Box
                                display="flex"
                                alignItems="center"
                                gap={0.5}
                                sx={{ mt: 0.5 }}
                              >
                                <PushPin
                                  color="primary"
                                  sx={{ fontSize: "0.75rem" }}
                                />
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ fontStyle: "italic" }}
                                >
                                  {figure.pinInfo.figureDescription}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </TableCell>

                        {!isMobile && (
                          <>
                            <TableCell>
                              <Typography variant="body2">
                                {formatDate(figure.createdAt)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Tooltip title={figure.ownerEmail}>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{ userSelect: "none" }}
                                >
                                  {truncateEmail(figure.ownerEmail)}
                                </Typography>
                              </Tooltip>
                            </TableCell>
                          </>
                        )}

                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {figure.pinned ? (
                              <Chip
                                label="Pinned"
                                color="primary"
                                size="small"
                                icon={<PushPin />}
                              />
                            ) : isExpired(figure.expiration) ? (
                              <Chip
                                label="Expired"
                                color="error"
                                size="small"
                              />
                            ) : isExpiringSoon(figure.expiration) ? (
                              <Tooltip title="Expires soon">
                                <Chip
                                  label={getTimeUntilExpiration(
                                    figure.expiration
                                  )}
                                  color="warning"
                                  size="small"
                                  icon={<Warning />}
                                />
                              </Tooltip>
                            ) : (
                              <Chip
                                label={getTimeUntilExpiration(
                                  figure.expiration
                                )}
                                color="default"
                                size="small"
                                icon={<Schedule />}
                              />
                            )}
                            {getBacklinkCount(figure.figureUrl) > 0 && (
                              <Tooltip
                                title={`${getBacklinkCount(figure.figureUrl)} ${
                                  getBacklinkCount(figure.figureUrl) === 1
                                    ? "backlink"
                                    : "backlinks"
                                }`}
                                sx={{
                                  userSelect: "none",
                                }}
                              >
                                <Chip
                                  label={getBacklinkCount(figure.figureUrl)}
                                  size="small"
                                  variant="outlined"
                                />
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>

                        {!isMobile && (
                          <TableCell>
                            <Typography variant="body2">
                              {formatBytes(figure.totalSize)}
                              {figure.totalFiles && (
                                <Typography
                                  variant="caption"
                                  display="block"
                                  color="text.secondary"
                                >
                                  {figure.totalFiles} files
                                </Typography>
                              )}
                            </Typography>
                          </TableCell>
                        )}

                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            <Tooltip title="Open Figure">
                              <IconButton
                                component="a"
                                href={figure.figureUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                size="small"
                                color="secondary"
                              >
                                <Visibility />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Manage Figure">
                              <IconButton
                                component="a"
                                href={getManageUrl(figure.figureUrl)}
                                size="small"
                                color="primary"
                              >
                                <Settings />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <Box display="flex" justifyContent="center" mt={2}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  size={isMobile ? "small" : "medium"}
                />
              </Box>
            )}

            {/* Empty State */}
            {!loading && figures.length === 0 && !error && (
              <Box textAlign="center" py={4}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No figures found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {search || statusFilter
                    ? "Try adjusting your search or filter criteria."
                    : "You haven't uploaded any figures yet."}
                </Typography>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default FiguresPage;
