import io
from minio import Minio
from minio.error import S3Error
from ..config import settings
from ..utils.logger import setup_logger

logger = setup_logger(__name__)


def _client() -> Minio:
    return Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=False,
    )


def ensure_bucket(client: Minio) -> None:
    if not client.bucket_exists(settings.minio_bucket):
        client.make_bucket(settings.minio_bucket)
        logger.info("Created MinIO bucket: %s", settings.minio_bucket)


def upload_pdf(data: bytes, object_name: str) -> str:
    """Upload PDF bytes, return the object key (not a presigned URL)."""
    client = _client()
    ensure_bucket(client)
    client.put_object(
        settings.minio_bucket,
        object_name,
        io.BytesIO(data),
        length=len(data),
        content_type="application/pdf",
    )
    logger.info("Uploaded PDF to MinIO: %s", object_name)
    return object_name


def get_pdf_stream(object_name: str):
    """Return (response, content_length) for streaming a PDF from MinIO."""
    client = _client()
    response = client.get_object(settings.minio_bucket, object_name)
    stat = client.stat_object(settings.minio_bucket, object_name)
    return response, stat.size


def delete_pdf(object_name: str) -> None:
    try:
        _client().remove_object(settings.minio_bucket, object_name)
        logger.info("Deleted PDF from MinIO: %s", object_name)
    except S3Error as e:
        logger.warning("MinIO delete failed for %s: %s", object_name, e)
