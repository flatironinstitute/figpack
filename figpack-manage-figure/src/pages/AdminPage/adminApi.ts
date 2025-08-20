import type { AdminData } from './AdminData';
import validateAdminData from './validateAdminData';

interface SaveResult {
  success: boolean;
  message?: string;
  data?: AdminData;
}

export const saveAdminData = async (apiKey: string, adminData: AdminData): Promise<SaveResult> => {
  // Validate the data before sending
  if (!apiKey) {
    return { success: false, message: "No API key available" };
  }

  if (!adminData) {
    return { success: false, message: "No data to save" };
  }

  const validation = validateAdminData(adminData);
  if (!validation.valid) {
    return { success: false, message: `Validation error: ${validation.error}` };
  }

  try {
    const response = await fetch("https://figpack-api.vercel.app/api/admin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apiKey: apiKey,
        data: validation.data,
      }),
    });

    const result = await response.json();

    if (result.success) {
      return { 
        success: true, 
        message: "Admin data saved successfully",
        data: validation.data
      };
    } else {
      return { 
        success: false, 
        message: result.message || "Failed to save admin data" 
      };
    }
  } catch (err) {
    return { 
      success: false, 
      message: `Error saving data: ${err}` 
    };
  }
}
