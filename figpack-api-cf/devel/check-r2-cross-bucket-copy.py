"""Check that R2 supports CopyObject from one bucket to another bucket on the same account.

POST /figures/copy relies on this for copies between figpack's R2 buckets. The script writes one small
scratch object to SRC_BUCKET, copies it to DEST_BUCKET with the destination's credentials (plain
x-amz-copy-source, no tagging or checksum headers), reads the copy back, and deletes both objects.

Environment:
  R2_ACCOUNT_ID                          Cloudflare account id
  R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY  credentials used for the destination bucket (must be able to read the source)
  SRC_BUCKET, DEST_BUCKET                native bucket names
  SRC_ACCESS_KEY_ID, SRC_SECRET_ACCESS_KEY  optional, for writing the scratch object if the destination
                                         credentials cannot write to the source bucket
"""

import os
import time

import boto3
from botocore.config import Config


def client(key_id, secret):
    return boto3.client(
        "s3",
        endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        aws_access_key_id=key_id,
        aws_secret_access_key=secret,
        region_name="auto",
        # Recent boto3 adds checksum headers by default; the Worker sends none, and R2 does not implement
        # x-amz-checksum-algorithm on CopyObject
        config=Config(request_checksum_calculation="when_required", response_checksum_validation="when_required"),
    )


dest = client(os.environ["R2_ACCESS_KEY_ID"], os.environ["R2_SECRET_ACCESS_KEY"])
src = client(
    os.environ.get("SRC_ACCESS_KEY_ID", os.environ["R2_ACCESS_KEY_ID"]),
    os.environ.get("SRC_SECRET_ACCESS_KEY", os.environ["R2_SECRET_ACCESS_KEY"]),
)
src_bucket, dest_bucket = os.environ["SRC_BUCKET"], os.environ["DEST_BUCKET"]
key = f"figpack-copy-check/{int(time.time())}.txt"
body = b"figpack cross-bucket copy check"

src.put_object(Bucket=src_bucket, Key=key, Body=body, ContentType="text/plain")
try:
    dest.copy_object(Bucket=dest_bucket, Key=key, CopySource=f"{src_bucket}/{key}")
    copied = dest.get_object(Bucket=dest_bucket, Key=key)
    ok = copied["Body"].read() == body and copied["ContentType"] == "text/plain"
    print("Cross-bucket copy works" if ok else f"Copy differs: {copied['ContentType']}")
finally:
    src.delete_object(Bucket=src_bucket, Key=key)
    try:
        dest.delete_object(Bucket=dest_bucket, Key=key)
    except Exception as e:
        print(f"Could not delete the copy: {e}")
