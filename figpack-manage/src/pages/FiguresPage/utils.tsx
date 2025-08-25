import { CheckCircle, Error, Upload } from "@mui/icons-material";

export const getStatusIcon = (status: string) => {
  switch (status) {
    case "completed":
      return <CheckCircle color="success" />;
    case "failed":
      return <Error color="error" />;
    case "uploading":
      return <Upload color="info" />;
    default:
      return null;
  }
};

export const getStatusLabel = (status: string) => {
  switch (status) {
    case "completed":
      return "Uploaded";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

export const getStatusColor = (
  status: string
): "success" | "error" | "info" | "default" => {
  switch (status) {
    case "completed":
      return "success";
    case "failed":
      return "error";
    case "uploading":
      return "info";
    default:
      return "default";
  }
};
