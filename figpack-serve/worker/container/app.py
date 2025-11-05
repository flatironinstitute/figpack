import os
import json
import tempfile
import tarfile
import shutil
from pathlib import Path
from http.server import BaseHTTPRequestHandler, HTTPServer
import sys
from io import StringIO
import boto3
import requests

PORT = int(os.environ.get("PORT", "8080"))

bucket_name = os.environ.get("R2_BUCKET_NAME")
if not bucket_name:
    raise ValueError("R2_BUCKET_NAME environment variable is not set")


def get_r2_client():
    """Create and return an S3 client configured for Cloudflare R2."""
    print("Creating R2 client...")
    account_id = os.environ.get("R2_ACCOUNT_ID")
    access_key_id = os.environ.get("R2_ACCESS_KEY_ID")
    secret_access_key = os.environ.get("R2_SECRET_ACCESS_KEY")

    if not all([account_id, access_key_id, secret_access_key]):
        raise ValueError("Missing R2 credentials in environment variables")

    endpoint_url = f"https://{account_id}.r2.cloudflarestorage.com"
    print(f"R2 endpoint URL: {endpoint_url}")

    s3_client = boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=access_key_id,
        aws_secret_access_key=secret_access_key,
        region_name="auto",
    )

    print("R2 client created successfully")
    return s3_client


def upload_directory_to_r2(s3_client, bucket_name, local_dir, bucket_prefix):
    """
    Upload all files from local_dir to R2 bucket with the given prefix.
    Returns the number of files uploaded.
    """
    print(
        f"Starting upload from {local_dir} to bucket {bucket_name} with prefix {bucket_prefix}"
    )
    uploaded_count = 0
    local_path = Path(local_dir)

    for file_path in local_path.rglob("*"):
        if file_path.is_file():
            # Get relative path from local_dir
            relative_path = file_path.relative_to(local_path)
            # Create S3 key with bucket_prefix
            s3_key = f"{bucket_prefix}/{relative_path}"

            # Determine content type
            content_type = "application/octet-stream"
            suffix = file_path.suffix.lower()
            if suffix == ".html":
                content_type = "text/html"
            elif suffix == ".css":
                content_type = "text/css"
            elif suffix == ".js":
                content_type = "application/javascript"
            elif suffix == ".json":
                content_type = "application/json"
            elif suffix == ".png":
                content_type = "image/png"
            elif suffix == ".jpg" or suffix == ".jpeg":
                content_type = "image/jpeg"
            elif suffix == ".svg":
                content_type = "image/svg+xml"
            elif suffix == ".txt":
                content_type = "text/plain"

            # Upload file
            print(f"Uploading file: {s3_key} (Content-Type: {content_type})")
            with open(file_path, "rb") as f:
                s3_client.put_object(
                    Bucket=bucket_name, Key=s3_key, Body=f, ContentType=content_type
                )

            uploaded_count += 1

    print(f"Upload complete. Total files uploaded: {uploaded_count}")
    return uploaded_count


class Handler(BaseHTTPRequestHandler):
    def _send(self, code: int, payload: dict):
        data = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        print(f"Received POST request to {self.path}")
        if self.path != "/run":
            print(f"Invalid path: {self.path}")
            self._send(404, {"error": "not found"})
            return

        print("Parsing request body...")
        try:
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length)
            body = json.loads(raw or "{}")
        except Exception as e:
            print(f"Error parsing JSON: {e}")
            self._send(400, {"error": f"invalid json: {e}"})
            return

        source_url = (body.get("source_url") or "").strip()
        print(f"Received source_url: {source_url}")

        if not source_url:
            print("Error: source_url is missing")
            self._send(400, {"error": "missing source_url"})
            return

        try:
            assert source_url.endswith(".tgz") or source_url.endswith(
                ".tar.gz"
            ), "source_url must point to a .tgz or .tar.gz file"
        except AssertionError as e:
            print(f"Error: Invalid source_url format - {e}")
            self._send(400, {"error": str(e)})
            return

        # Extract bucket key from source_url
        # e.g., https://sandbox.zenodo.org/records/391408/files/hello_figpack.tgz
        # becomes sandbox.zenodo.org/records/391408/files/hello_figpack.tgz
        bucket_key = source_url.split("://")[1]
        print(f"Bucket key: {bucket_key}")

        temp_dir = None

        # Capture stdout
        stdout_capture = StringIO()
        old_stdout = sys.stdout
        sys.stdout = stdout_capture

        try:
            # Create temporary directory for download and extraction
            temp_dir = tempfile.mkdtemp()
            print(f"Created temporary directory: {temp_dir}")
            download_path = os.path.join(temp_dir, "archive.tar.gz")
            extract_dir = os.path.join(temp_dir, "extracted")

            # Download the archive
            print(f"Downloading archive from {source_url}...")
            response = requests.get(source_url, stream=True, timeout=300)
            response.raise_for_status()
            print(f"Download response status: {response.status_code}")

            bytes_downloaded = 0
            with open(download_path, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
                    bytes_downloaded += len(chunk)
            print(f"Download complete. Total bytes: {bytes_downloaded}")

            # Extract the archive
            print(f"Extracting archive to {extract_dir}...")
            os.makedirs(extract_dir, exist_ok=True)
            with tarfile.open(download_path, "r:*") as tar:
                tar.extractall(path=extract_dir)
            print("Extraction complete")

            # Get R2 client and upload files
            s3_client = get_r2_client()

            uploaded_count = upload_directory_to_r2(
                s3_client, bucket_name, extract_dir, bucket_key
            )

            # Construct the URL to the uploaded index.html
            url = f"https://serve-bucket.figpack.org/{bucket_key}/index.html"
            print(f"Successfully processed request. URL: {url}")

            # Restore stdout and get captured output
            sys.stdout = old_stdout
            stdout = stdout_capture.getvalue()

            self._send(
                200,
                {
                    "ok": True,
                    "url": url,
                    "files_uploaded": uploaded_count,
                    "stdout": stdout,
                },
            )

        except requests.exceptions.RequestException as e:
            # Restore stdout on error
            sys.stdout = old_stdout
            stdout = stdout_capture.getvalue()
            print(f"ERROR: Failed to download source_url: {e}")
            self._send(
                500, {"error": f"failed to download source_url: {e}", "stdout": stdout}
            )
            return
        except tarfile.TarError as e:
            # Restore stdout on error
            sys.stdout = old_stdout
            stdout = stdout_capture.getvalue()
            print(f"ERROR: Failed to extract archive: {e}")
            self._send(
                500, {"error": f"failed to extract archive: {e}", "stdout": stdout}
            )
            return
        except Exception as e:
            # Restore stdout on error
            sys.stdout = old_stdout
            stdout = stdout_capture.getvalue()
            print(f"ERROR: Failed to process source_url: {e}")
            self._send(
                500, {"error": f"failed to process source_url: {e}", "stdout": stdout}
            )
            return
        finally:
            # Ensure stdout is always restored
            sys.stdout = old_stdout
            # Clean up temporary directory
            if temp_dir and os.path.exists(temp_dir):
                print(f"Cleaning up temporary directory: {temp_dir}")
                shutil.rmtree(temp_dir, ignore_errors=True)


def main():
    print(f"Starting HTTP server on 0.0.0.0:{PORT}")
    print(f"Using R2 bucket: {bucket_name}")
    server = HTTPServer(("0.0.0.0", PORT), Handler)
    print("Server ready, waiting for requests...")
    server.serve_forever()


if __name__ == "__main__":
    main()
