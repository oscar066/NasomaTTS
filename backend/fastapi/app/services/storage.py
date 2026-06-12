"""
MinIO object storage service.

Wraps the MinIO Python client to provide simple upload, download, and delete
operations for PDF binaries.  A new MinIO client is created per call rather
than being shared across requests — this avoids thread-safety concerns with
the synchronous MinIO SDK when used inside an async application.

All public functions raise exceptions on failure; callers are responsible for
catching them and deciding whether to abort or degrade gracefully (e.g. the
upload route continues without storing the PDF when MinIO is unavailable).
"""

import io

from minio import Minio
from minio.error import S3Error

from ..utils.config import settings
from ..utils.logger import setup_logger

logger = setup_logger("nasoma.services.storage")


def _client() -> Minio:
    """Create and return a MinIO client configured from application settings.

    A new client is instantiated on each call.  The MinIO SDK is synchronous,
    so sharing a single instance across async tasks would require a lock.
    Creating a fresh client is cheap and avoids that complexity.
    """
    return Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=False,  # Set to True when MinIO is behind TLS in production.
    )


def ensure_bucket(client: Minio) -> None:
    """Create the configured bucket if it does not already exist.

    Called before every upload so the bucket is created on first use without
    requiring manual setup in new environments.

    Args:
        client: An authenticated MinIO client instance.
    """
    if not client.bucket_exists(settings.minio_bucket):
        client.make_bucket(settings.minio_bucket)
        logger.info("Created MinIO bucket: %s", settings.minio_bucket)


def upload_file(data: bytes, object_name: str, content_type: str) -> str:
    """Upload arbitrary bytes to MinIO and return the object key.

    Generic version of :func:`upload_pdf` that accepts any content type.
    Used for thumbnails (``image/jpeg``) and any future file types.

    Args:
        data: Raw bytes to upload.
        object_name: Full MinIO object key, including any path prefix.
        content_type: MIME type of the file (e.g. ``"image/jpeg"``).

    Returns:
        The ``object_name`` as stored, to be persisted in the document record.

    Raises:
        :class:`minio.error.S3Error`: If the MinIO operation fails.
    """
    client = _client()
    ensure_bucket(client)
    client.put_object(
        settings.minio_bucket,
        object_name,
        io.BytesIO(data),
        length=len(data),
        content_type=content_type,
    )
    logger.info("Uploaded file to MinIO: %s (%s)", object_name, content_type)
    return object_name


def upload_pdf(data: bytes, object_name: str) -> str:
    """Upload raw PDF bytes to MinIO and return the object key.

    The object key (not a presigned URL) is returned so it can be stored in
    MongoDB.  Generating presigned URLs at serve time (rather than storing
    them) means they never expire.

    Args:
        data: Raw bytes of the PDF file to upload.
        object_name: Full MinIO object key, including any path prefix.

    Returns:
        The ``object_name`` as stored, to be persisted in the document record.

    Raises:
        :class:`minio.error.S3Error`: If the MinIO operation fails.
    """
    return upload_file(data, object_name, content_type="application/pdf")


def get_pdf_stream(object_name: str) -> tuple:
    """Open a streaming response for a stored PDF object.

    Returns a tuple of ``(response, content_length)`` so the caller can set
    ``Content-Length`` in the HTTP response without buffering the entire file
    into memory.

    Args:
        object_name: The MinIO object key as stored in the document record.

    Returns:
        A ``(HTTPResponse, int)`` tuple where the first element is the
        streaming MinIO response and the second is the file size in bytes.

    Raises:
        :class:`minio.error.S3Error`: If the object does not exist or
            MinIO returns an error.
    """
    client = _client()
    response = client.get_object(settings.minio_bucket, object_name)
    stat = client.stat_object(settings.minio_bucket, object_name)
    return response, stat.size


def delete_pdf(object_name: str) -> None:
    """Delete a PDF object from MinIO.

    Failures are logged as warnings rather than re-raised because a missing
    object does not affect application correctness — the document record in
    MongoDB can still be deleted regardless.

    Args:
        object_name: The MinIO object key to remove.
    """
    try:
        _client().remove_object(settings.minio_bucket, object_name)
        logger.info("Deleted PDF from MinIO: %s", object_name)
    except S3Error as e:
        logger.warning("MinIO delete failed for %s: %s", object_name, e)
