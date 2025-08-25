import React from "react";
import { Box, Button } from "@mui/material";
import { Person, PhotoLibrary, AdminPanelSettings } from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const NavigationMenu: React.FC = () => {
  const { isLoggedIn, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isLoggedIn) {
    return null;
  }

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navButtonStyle = {
    color: "inherit",
    textTransform: "none" as const,
    fontWeight: 400,
    mx: 0.5,
    minWidth: "auto",
    borderRadius: 2,
    px: 2,
    py: 0.5,
    transition: "background-color 0.2s ease-in-out",
    "&:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.08)",
    },
    "& .MuiButton-startIcon": {
      marginRight: 1,
    },
  };

  const activeButtonStyle = {
    ...navButtonStyle,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    fontWeight: 500,
    "&:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.16)",
    },
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", mr: 2 }}>
      <Button
        startIcon={<Person />}
        onClick={() => navigate("/profile")}
        sx={isActive("/profile") ? activeButtonStyle : navButtonStyle}
      >
        Profile
      </Button>

      <Button
        startIcon={<PhotoLibrary />}
        onClick={() => navigate("/figures")}
        sx={isActive("/figures") ? activeButtonStyle : navButtonStyle}
      >
        Figures
      </Button>

      {user?.isAdmin && (
        <Button
          startIcon={<AdminPanelSettings />}
          onClick={() => navigate("/admin")}
          sx={{
            ...(isActive("/admin") ? activeButtonStyle : navButtonStyle),
            position: "relative",
          }}
        >
          Admin
          <Box
            sx={{
              ml: 1,
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: "rgba(255, 255, 255, 0.7)",
              display: "inline-block",
            }}
          />
        </Button>
      )}
    </Box>
  );
};

export default NavigationMenu;
