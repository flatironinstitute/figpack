# Slim Python base to run figpack
FROM python:3.11-slim

# System deps (add any build tools/ssl/cert bundles figpack might need)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl tini && \
    rm -rf /var/lib/apt/lists/*

# Install figpack once at build-time, not on every request
RUN pip install --no-cache-dir figpack

# Copy the small HTTP shim
WORKDIR /app
COPY app.py /app/app.py

# Use tini as PID1 for nicer signal handling
ENTRYPOINT ["/usr/bin/tini", "--"]

# Expose the port the Worker will call
ENV PORT=8080
CMD ["python", "app.py"]
