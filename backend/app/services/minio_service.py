from minio import Minio
from urllib.parse import urlparse


def get_minio_client(endpoint: str, access_key: str, secret_key: str, use_ssl: bool = True, region: str = "us-east-1"):
    # Strip scheme if present
    parsed = urlparse(endpoint)
    host = parsed.hostname or endpoint
    port = parsed.port
    location = parsed.hostname or endpoint

    if port:
        host = f"{host}:{port}"

    return Minio(
        host,
        access_key=access_key,
        secret_key=secret_key,
        secure=use_ssl,
        region=region,
    )


def list_buckets(client: Minio) -> list[dict]:
    buckets = client.list_buckets()
    return [{"name": b.name, "creation_date": b.creation_date.isoformat() if b.creation_date else None} for b in buckets]


def list_objects(client: Minio, bucket: str) -> list[dict]:
    objects = client.list_objects(bucket, recursive=True)
    result = []
    for obj in objects:
        result.append({
            "key": obj.object_name,
            "size": obj.size,
            "etag": obj.etag,
            "last_modified": obj.last_modified.isoformat() if obj.last_modified else None,
        })
    return result


def copy_object(
    src_client: Minio,
    src_bucket: str,
    object_key: str,
    dest_client: Minio,
    dest_bucket: str,
) -> bool:
    try:
        # Use copy_source as a dict
        copy_source = {"bucket": src_bucket, "object": object_key}
        dest_client.copy_object(dest_bucket, object_key, copy_source)
        return True
    except Exception as e:
        return False
