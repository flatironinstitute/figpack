import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Refresh } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { formatBytes } from "../../utils/formatUtils";
import { getRecentCreators } from "./adminApi";
import type { RecentCreator } from "./adminApi";
import { getFigures } from "../FiguresPage/figuresApi";
import type { FigureListItem } from "../FiguresPage/figuresApi";
import { getStatusColor, getStatusLabel } from "../FiguresPage/utils";

const USER_FIGURES_LIMIT = 100;

const formatDate = (timestamp: number) => new Date(timestamp).toLocaleString();

// Figures owned by one user, newest first (GET /figures/list with all + owner)
const UserFiguresTable: React.FC<{ apiKey: string; email: string }> = ({
  apiKey,
  email,
}) => {
  const navigate = useNavigate();
  const [figures, setFigures] = useState<FigureListItem[] | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    setFigures(null);
    setError(null);
    getFigures({
      apiKey,
      all: true,
      owner: email,
      limit: USER_FIGURES_LIMIT,
      sortBy: "createdAt",
      sortOrder: "desc",
    }).then((result) => {
      if (canceled) return;
      if (result.success) {
        setFigures(result.figures || []);
        setTotal(result.total || 0);
      } else {
        setError(result.message || "Failed to load figures");
      }
    });
    return () => {
      canceled = true;
    };
  }, [apiKey, email]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!figures) return <CircularProgress size={24} />;

  const now = Date.now();
  return (
    <>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Figures owned by {email} (
        {total > figures.length
          ? `newest ${figures.length} of ${total}`
          : `${total} total`}
        )
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Bucket</TableCell>
              <TableCell align="right">Size</TableCell>
              <TableCell>Expires</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {figures.map((f) => (
              <TableRow key={f.figureUrl} hover>
                <TableCell>
                  <Link
                    component="button"
                    variant="body2"
                    sx={{ textAlign: "left" }}
                    onClick={() =>
                      navigate(
                        `/figure?figure_url=${encodeURIComponent(f.figureUrl)}`,
                      )
                    }
                  >
                    {f.title || f.figureUrl}
                  </Link>
                </TableCell>
                <TableCell>{formatDate(f.createdAt)}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={getStatusLabel(f.status)}
                    color={getStatusColor(f.status)}
                  />
                </TableCell>
                <TableCell>{f.bucket || "figpack-figures"}</TableCell>
                <TableCell align="right">
                  {f.totalSize ? formatBytes(f.totalSize) : "-"}
                </TableCell>
                <TableCell>
                  {f.pinned
                    ? "Pinned"
                    : f.expiration === 0
                      ? "Never"
                      : f.expiration <= now
                        ? "Expired"
                        : formatDate(f.expiration)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

// Users who created figures in the last N days; click a row to list that user's figures
const RecentCreatorsPanel: React.FC<{ apiKey: string }> = ({ apiKey }) => {
  const [daysInput, setDaysInput] = useState<string>("14");
  const [days, setDays] = useState<number>(14);
  const [creators, setCreators] = useState<RecentCreator[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getRecentCreators(apiKey, days);
    if (result.success && result.creators) {
      setCreators(result.creators);
    } else {
      setError(result.message || "Failed to load recent creators");
    }
    setLoading(false);
  }, [apiKey, days]);

  useEffect(() => {
    load();
  }, [load]);

  const applyDays = () => {
    const n = parseInt(daysInput, 10);
    if (n >= 1) setDays(n);
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
          mb: 2,
        }}
      >
        <Typography variant="h6">Recent Figure Creators</Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <TextField
            label="Last N days"
            type="number"
            size="small"
            value={daysInput}
            onChange={(e) => setDaysInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyDays()}
            onBlur={applyDays}
            inputProps={{ min: 1 }}
            sx={{ width: 120 }}
          />
          <Button
            variant="outlined"
            size="small"
            onClick={load}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <Refresh />}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {creators && (
        <>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell align="right">Figures</TableCell>
                  <TableCell align="right">Ephemeral</TableCell>
                  <TableCell align="right">Size</TableCell>
                  <TableCell align="right">Last created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {creators.map((c) => (
                  <TableRow
                    key={c.email}
                    hover
                    selected={c.email === selectedEmail}
                    onClick={() =>
                      setSelectedEmail(
                        c.email === selectedEmail ? null : c.email,
                      )
                    }
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell>{c.email}</TableCell>
                    <TableCell align="right">{c.figureCount}</TableCell>
                    <TableCell align="right">{c.ephemeralCount}</TableCell>
                    <TableCell align="right">
                      {formatBytes(c.totalSize)}
                    </TableCell>
                    <TableCell align="right">
                      {formatDate(c.lastCreatedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {creators.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              No figures created in the last {days} days.
            </Typography>
          )}
        </>
      )}

      {selectedEmail && (
        <Box sx={{ mt: 3 }}>
          <UserFiguresTable apiKey={apiKey} email={selectedEmail} />
        </Box>
      )}
    </Paper>
  );
};

export default RecentCreatorsPanel;
