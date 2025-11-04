import os

FIGPACK_API_BASE_URL = os.getenv(
    "FIGPACK_API_BASE_URL", "https://figpack-api.figpack.org"
)

FIGPACK_BUCKET = os.getenv("FIGPACK_BUCKET", "figpack-figures")
