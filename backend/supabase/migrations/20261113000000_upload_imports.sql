-- Uploaded-video imports (owner fix, 13 Nov): remember the file type so the worker can hand the
-- video to Gemini, and allow the "not a beauty video" outcome to be reported.
alter table public.upload_objects add column if not exists mime_type text
  check (mime_type in ('video/mp4', 'video/quicktime', 'video/webm'));
