import type { AdminData } from "./AdminData";

interface AuthenticateAdminCallbacks {
  setAdminData: (data: AdminData | null) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  setError: (error: string | null) => void;
  setSuccess: (success: string | null) => void;
}

export const authenticateAndLoadAdminData = async (
  key: string,
  callbacks: AuthenticateAdminCallbacks
) => {
  const { setAdminData, setIsAuthenticated, setError, setSuccess } = callbacks;

  if (!key) {
    setAdminData(null);
    setIsAuthenticated(false);
    setError("Please enter an API key");
    setSuccess(null);
    return;
  }

  setError(null);
  setSuccess(null);

  try {
    const response = await fetch("https://figpack-api.vercel.app/api/admin", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
      },
    });

    const result = await response.json();

    if (result.success && result.data) {
      setAdminData(result.data);
      setIsAuthenticated(true);
      setSuccess("Successfully authenticated and loaded admin data");
    } else {
      setError(result.message || "Authentication failed");
      setIsAuthenticated(false);
    }
  } catch (err) {
    setError(`Error: ${err}`);
    setIsAuthenticated(false);
  }
};
