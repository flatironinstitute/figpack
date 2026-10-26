import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
} from "@mui/material";

interface DeleteFiguresDialogProps {
  open: boolean;
  count: number;
  // Number of selected figures owned by someone else (admins only)
  othersCount: number;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  error: string | null;
}

const DeleteFiguresDialog: React.FC<DeleteFiguresDialogProps> = ({
  open,
  count,
  othersCount,
  onClose,
  onConfirm,
  loading,
  error,
}) => {
  const figuresLabel = count === 1 ? "figure" : "figures";
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose}>
      <DialogTitle>Delete Figures</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to delete {count} {figuresLabel}? This action
          cannot be undone.
        </DialogContentText>
        {othersCount > 0 && (
          <DialogContentText color="warning.main" sx={{ mt: 2 }}>
            {othersCount} of the selected figures belong to other users.
          </DialogContentText>
        )}
        {error && (
          <DialogContentText color="error" sx={{ mt: 2 }}>
            Error: {error}
          </DialogContentText>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          color="error"
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : null}
        >
          {loading ? "Deleting..." : `Delete ${count} ${figuresLabel}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteFiguresDialog;
