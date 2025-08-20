import React from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { ExpandMore } from "@mui/icons-material";

export interface User {
  email: string;
  name: string;
  researchDescription: string;
  apiKey: string;
  isAdmin: boolean;
  createdAt: string;
}

interface UsersSummaryProps {
  users: User[];
}

const UsersSummary: React.FC<UsersSummaryProps> = ({ users }) => {
  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Typography variant="h6">Current Users ({users.length})</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          {users.map((user, index) => (
            <Paper key={index} sx={{ p: 2 }}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="start"
              >
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {user.name} {user.isAdmin && "(Admin)"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user.email}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {user.researchDescription}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Created: {new Date(user.createdAt).toLocaleString()}
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: "monospace",
                    bgcolor: "grey.100",
                    p: 1,
                    borderRadius: 1,
                    maxWidth: 200,
                    wordBreak: "break-all",
                  }}
                >
                  {user.apiKey.substring(0, 16)}...
                </Typography>
              </Box>
            </Paper>
          ))}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};

export default UsersSummary;
