const defaultAllowedOrigins = [
  "https://figpack.org",
  "https://manage.figpack.org",
  "https://documents.figpack.org",
  "https://figpack.org",
  "http://localhost:5173",
  "http://localhost:5174",
];

export const allowedOrigins = (
  process.env.ALLOWED_ORIGINS || defaultAllowedOrigins.join(",")
)
  .split(",")
  .map((origin) => origin.trim());

export const setCorsHeaders = (req: any, res: any) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-api-key"
    );
  }
};

export const figpackManageUrl =
  process.env.FIGPACK_MANAGE_URL || "https://manage.figpack.org";
