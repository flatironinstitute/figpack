-- Migration number: 0006 	 2026-05-07T00:00:00.000Z

-- Optional AWS session token (for STS / temporary credentials). When set,
-- the worker forwards it to the S3 SDK as `credentials.sessionToken`, which
-- becomes X-Amz-Security-Token on signed requests.
ALTER TABLE buckets ADD COLUMN aws_session_token TEXT;
