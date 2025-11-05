# Slim Python base to run figpack
FROM python:3.11-slim

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl tini && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir boto3 requests

# Copy the small HTTP shim
WORKDIR /app
COPY app.py /app/app.py

# Use tini as PID1 for nicer signal handling
ENTRYPOINT ["/usr/bin/tini", "--"]

# Expose the port the Worker will call
ENV PORT=8080
CMD ["python", "app.py"]
