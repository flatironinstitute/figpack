import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import "./index.css";
import App from "./App.tsx";

// Redirect from figpack.org to manage.figpack.org
if (window.location.hostname === "figpack.org") {
  const newUrl = `https://manage.figpack.org${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.replace(newUrl);
}

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#455a64", // Blue grey - more subdued than bright blue
      light: "#607d8b",
      dark: "#37474f",
    },
    secondary: {
      main: "#546e7a", // Muted blue grey
      light: "#78909c",
      dark: "#37474f",
    },
    success: {
      main: "#4caf50", // Gentle green for positive actions
      light: "#81c784",
      dark: "#388e3c",
    },
    warning: {
      main: "#ff9800", // Warm orange for warnings
      light: "#ffb74d",
      dark: "#f57c00",
    },
    info: {
      main: "#2196f3", // Friendly blue for info
      light: "#64b5f6",
      dark: "#1976d2",
    },
    background: {
      default: "#f8f9fa", // Slightly warmer background
      paper: "#ffffff",
    },
    text: {
      primary: "#263238", // Dark blue grey for better readability
      secondary: "#546e7a",
    },
    grey: {
      50: "#f8f9fa",
      100: "#f1f3f4",
      200: "#e8eaed",
      300: "#dadce0",
      400: "#bdc1c6",
      500: "#9aa0a6",
      600: "#80868b",
      700: "#5f6368",
      800: "#3c4043",
      900: "#202124",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 500,
      color: "#263238",
    },
    h2: {
      fontWeight: 500,
      color: "#263238",
    },
    h3: {
      fontWeight: 500,
      color: "#263238",
    },
    h4: {
      fontWeight: 500,
      color: "#263238",
    },
    h5: {
      fontWeight: 500,
      color: "#263238",
    },
    h6: {
      fontWeight: 500,
      color: "#263238",
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: "linear-gradient(135deg, #455a64 0%, #37474f 100%)",
          color: "#ffffff",
          boxShadow:
            "0 2px 8px rgba(55, 71, 79, 0.15), 0 1px 3px rgba(55, 71, 79, 0.2)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          "& .MuiToolbar-root": {
            minHeight: "64px",
            paddingTop: "4px",
            paddingBottom: "4px",
          },
          "& .MuiTypography-root": {
            color: "#ffffff",
            fontWeight: 600,
            letterSpacing: "0.5px",
            textShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
          },
          "& .MuiButton-root": {
            color: "rgba(255, 255, 255, 0.9)",
            borderRadius: "8px",
            padding: "6px 12px",
            margin: "0 2px",
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              color: "#ffffff !important", // Force white text on AppBar
              transform: "translateY(-1px)",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            },
            // Override the general text button styling for AppBar
            "&.MuiButton-text": {
              color: "rgba(255, 255, 255, 0.9)",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                color: "#ffffff !important",
              },
            },
          },
          "& .MuiIconButton-root": {
            color: "rgba(255, 255, 255, 0.9)",
            borderRadius: "8px",
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              color: "#ffffff",
              transform: "translateY(-1px)",
            },
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 8,
          fontWeight: 500,
          padding: "8px 16px",
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            transform: "translateY(-1px)",
          },
        },
        contained: {
          boxShadow: "0 2px 4px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
          "&:hover": {
            boxShadow: "0 4px 8px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1)",
            transform: "translateY(-2px)",
          },
        },
        outlined: {
          borderWidth: "1.5px",
          "&:hover": {
            borderWidth: "1.5px",
            backgroundColor: "rgba(69, 90, 100, 0.04)",
          },
        },
        text: {
          "&:hover": {
            backgroundColor: "rgba(69, 90, 100, 0.08)",
            color: "#263238", // Ensure dark text on light hover background
          },
          // Special handling for table header buttons
          "&.MuiButton-textPrimary": {
            color: "#455a64",
            "&:hover": {
              backgroundColor: "rgba(69, 90, 100, 0.08)",
              color: "#263238",
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
          transition: "box-shadow 0.2s ease-in-out",
          "&:hover": {
            boxShadow: "0 2px 6px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08)",
          },
        },
        elevation1: {
          boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
        },
        elevation2: {
          boxShadow: "0 2px 6px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08)",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: "1px solid #e8eaed",
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.06)",
            borderColor: "#dadce0",
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 8,
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "#607d8b",
              },
            },
            "&.Mui-focused": {
              "& .MuiOutlinedInput-notchedOutline": {
                borderWidth: "2px",
                borderColor: "#455a64",
              },
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          fontWeight: 500,
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            transform: "scale(1.02)",
          },
        },
        colorSuccess: {
          backgroundColor: "#e8f5e8",
          color: "#2e7d32",
          "& .MuiChip-icon": {
            color: "#2e7d32",
          },
        },
        colorError: {
          backgroundColor: "#ffebee",
          color: "#c62828",
          "& .MuiChip-icon": {
            color: "#c62828",
          },
        },
        colorInfo: {
          backgroundColor: "#e3f2fd",
          color: "#1565c0",
          "& .MuiChip-icon": {
            color: "#1565c0",
          },
        },
        colorWarning: {
          backgroundColor: "#fff3e0",
          color: "#ef6c00",
          "& .MuiChip-icon": {
            color: "#ef6c00",
          },
        },
        colorPrimary: {
          backgroundColor: "#e8eaf6",
          color: "#37474f",
          "& .MuiChip-icon": {
            color: "#37474f",
          },
        },
        colorDefault: {
          backgroundColor: "#f5f5f5",
          color: "#424242",
          "& .MuiChip-icon": {
            color: "#424242",
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          padding: "8px",
        },
      },
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>
);
