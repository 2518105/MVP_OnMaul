import os
import uuid
from fastapi import UploadFile
from supabase import create_client, Client

_client: Client | None = None

STORAGE_BUCKET = "uploads"


def get_supabase() -> Client:
    global _client
    if _client is None:
        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_SERVICE_KEY", "")
        if not url or not key:
            raise RuntimeError(
                "환경변수 SUPABASE_URL 과 SUPABASE_SERVICE_KEY 를 설정해주세요."
            )
        _client = create_client(url, key)
    return _client


async def upload_file(file: UploadFile) -> str:
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    data = await file.read()
    content_type = file.content_type or "application/octet-stream"
    supabase = get_supabase()
    supabase.storage.from_(STORAGE_BUCKET).upload(
        filename,
        data,
        {"content-type": content_type},
    )
    url = supabase.storage.from_(STORAGE_BUCKET).get_public_url(filename)
    print(f"[Storage] uploaded {filename} ({content_type}) → {url}")
    return url
