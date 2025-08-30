import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import React from "react";

interface RenewBulkResultsDialogProps {
  open: boolean;
  onClose: () => void;
  result?: {
    success: boolean;
    message?: string;
    renewedCount?: number;
    errors?: Array<{ figureUrl: string; error: string }>;
  };
}

const RenewBulkResultsDialog: React.FC<RenewBulkResultsDialogProps> = ({
  open,
  onClose,
  result,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Renew Backlinked Figures Results</DialogTitle>
      <DialogContent>
        {result && (
          <>
            <Typography variant="body1" gutterBottom>
              {result.message}
            </Typography>
            {result.errors && result.errors.length > 0 && (
              <>
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Errors encountered:
                </Typography>
                <List>
                  {result.errors.map((error, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={error.figureUrl}
                        secondary={error.error}
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RenewBulkResultsDialog;
