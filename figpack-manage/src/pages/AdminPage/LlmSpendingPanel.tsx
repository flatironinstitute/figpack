import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { Refresh } from "@mui/icons-material";
import { formatNumber } from "../../utils/formatUtils";
import { getLlmUsage } from "./adminApi";
import type { LlmUsageResult, LlmUsageTotals } from "./adminApi";

// Small costs need more digits to be distinguishable from zero
const formatCost = (usd: number) =>
  `$${usd < 1 ? usd.toFixed(4) : usd.toFixed(2)}`;

const sum = (rows: LlmUsageTotals[]) =>
  rows.reduce(
    (acc, r) => ({
      requests: acc.requests + r.requests,
      promptTokens: acc.promptTokens + r.promptTokens,
      completionTokens: acc.completionTokens + r.completionTokens,
      costUsd: acc.costUsd + r.costUsd,
    }),
    { requests: 0, promptTokens: 0, completionTokens: 0, costUsd: 0 },
  );

const Stat: React.FC<{ label: string; value: string; detail?: string }> = ({
  label,
  value,
  detail,
}) => (
  <Box>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="h6">{value}</Typography>
    {detail && (
      <Typography variant="caption" color="text.secondary">
        {detail}
      </Typography>
    )}
  </Box>
);

const UsageCells: React.FC<{ row: LlmUsageTotals }> = ({ row }) => (
  <>
    <TableCell align="right">{formatNumber(row.requests)}</TableCell>
    <TableCell align="right">{formatNumber(row.promptTokens)}</TableCell>
    <TableCell align="right">{formatNumber(row.completionTokens)}</TableCell>
    <TableCell align="right">{formatCost(row.costUsd)}</TableCell>
  </>
);

const UsageHeaderCells: React.FC = () => (
  <>
    <TableCell align="right">Requests</TableCell>
    <TableCell align="right">Input tokens</TableCell>
    <TableCell align="right">Output tokens</TableCell>
    <TableCell align="right">Cost</TableCell>
  </>
);

// Spending on the LLM proxy (/llm/chat-completions) across all users, from GET /llm/usage
const LlmSpendingPanel: React.FC<{ apiKey: string }> = ({ apiKey }) => {
  const [usage, setUsage] = useState<LlmUsageResult["all"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getLlmUsage(apiKey);
    if (result.success && result.all) {
      setUsage(result.all);
    } else {
      setError(result.message || "Failed to load LLM usage");
    }
    setLoading(false);
  }, [apiKey]);

  useEffect(() => {
    load();
  }, [load]);

  const last30 = usage ? sum(usage.daily) : null;

  return (
    <Paper sx={{ p: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">LLM Spending</Typography>
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

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {usage && last30 && (
        <>
          <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap", mb: 2 }}>
            <Stat
              label="Today (UTC)"
              value={formatCost(usage.today.costUsd)}
              detail={`of ${formatCost(usage.today.maxCostUsd)} daily cap, ${formatNumber(usage.today.requests)} requests`}
            />
            <Stat
              label="Last 30 days"
              value={formatCost(last30.costUsd)}
              detail={`${formatNumber(last30.requests)} requests`}
            />
            <Stat
              label="All time"
              value={formatCost(usage.total.costUsd)}
              detail={`${formatNumber(usage.total.requests)} requests`}
            />
          </Box>

          <Typography variant="subtitle2" sx={{ mt: 2 }}>
            By user (all time)
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <UsageHeaderCells />
                  <TableCell align="right">Last request</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {usage.perUser.map((u) => (
                  <TableRow key={u.email} hover>
                    <TableCell>{u.email}</TableCell>
                    <UsageCells row={u} />
                    <TableCell align="right">
                      {new Date(u.lastRequestAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="subtitle2" sx={{ mt: 3 }}>
            By day (last 30 days, UTC)
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <UsageHeaderCells />
                </TableRow>
              </TableHead>
              <TableBody>
                {usage.daily.map((d) => (
                  <TableRow key={d.day} hover>
                    <TableCell>{d.day}</TableCell>
                    <UsageCells row={d} />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {usage.perUser.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              No LLM requests yet.
            </Typography>
          )}
        </>
      )}
    </Paper>
  );
};

export default LlmSpendingPanel;
