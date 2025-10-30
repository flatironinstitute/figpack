import React, { useState } from "react";
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { Login, Logout, AccountCircle } from "@mui/icons-material";
import { useAuth } from "../hooks/useAuth";
import LoginDialog from "./LoginDialog";

const LoginButton: React.FC = () => {
  const { isLoggedIn, login, logout } = useAuth();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (isLoggedIn) {
      setAnchorEl(event.currentTarget);
    } else {
      setLoginDialogOpen(true);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleClose();
  };

  const handleLogin = (apiKey: string) => {
    login(apiKey);
  };

  return (
    <>
      <Button
        color="inherit"
        startIcon={isLoggedIn ? <AccountCircle /> : <Login />}
        onClick={handleClick}
      >
        {isLoggedIn ? "Account" : "Login"}
      </Button>

      {/* Logout Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          <ListItemText>Logout</ListItemText>
        </MenuItem>
      </Menu>

      {/* Login Dialog */}
      <LoginDialog
        open={loginDialogOpen}
        onClose={() => setLoginDialogOpen(false)}
        onLogin={handleLogin}
      />
    </>
  );
};

export default LoginButton;
