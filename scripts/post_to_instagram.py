#!/usr/bin/env python3
"""Publica en Instagram la siguiente imagen en cola usando la Graph API de Meta."""

import json
import os
import sys
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
IMAGES_DIR = ROOT / "content" / "images"
CAPTIONS_DIR = ROOT / "content" / "captions"
STATE_FILE = ROOT / "state" / "posted.json"

GRAPH_API_VERSION = os.environ.get("GRAPH_API_VERSION", "v19.0")
GRAPH_API_BASE = f"https://graph.facebook.com/{GRAPH_API_VERSION}"

IMAGE_EXTENSIONS = {".jpg", ".jpeg"}


def load_posted():
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return []


def save_posted(posted):
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(posted, indent=2, ensure_ascii=False) + "\n")


def list_queue():
    if not IMAGES_DIR.exists():
        return []
    return sorted(
        p.name for p in IMAGES_DIR.iterdir() if p.suffix.lower() in IMAGE_EXTENSIONS
    )


def pick_next(queue, posted):
    remaining = [name for name in queue if name not in posted]
    if remaining:
        return remaining[0]
    if queue and os.environ.get("REPEAT_WHEN_EMPTY", "false").lower() == "true":
        return queue[0]
    return None


def image_url_for(filename):
    repo = os.environ["GITHUB_REPOSITORY"]
    branch = os.environ.get("GITHUB_REF_NAME", "main")
    return f"https://raw.githubusercontent.com/{repo}/{branch}/content/images/{filename}"


def caption_for(filename):
    caption_file = CAPTIONS_DIR / f"{Path(filename).stem}.txt"
    if caption_file.exists():
        return caption_file.read_text().strip()
    return os.environ.get("DEFAULT_CAPTION", "")


def publish(image_url, caption, access_token, ig_user_id):
    container = requests.post(
        f"{GRAPH_API_BASE}/{ig_user_id}/media",
        data={"image_url": image_url, "caption": caption, "access_token": access_token},
        timeout=30,
    )
    container.raise_for_status()
    creation_id = container.json()["id"]

    # Le damos un momento a Meta para descargar y procesar la imagen antes de publicar.
    time.sleep(5)

    publish_resp = requests.post(
        f"{GRAPH_API_BASE}/{ig_user_id}/media_publish",
        data={"creation_id": creation_id, "access_token": access_token},
        timeout=30,
    )
    publish_resp.raise_for_status()
    return publish_resp.json()


def main():
    access_token = os.environ["INSTAGRAM_ACCESS_TOKEN"]
    ig_user_id = os.environ["INSTAGRAM_BUSINESS_ACCOUNT_ID"]

    posted = load_posted()
    queue = list_queue()
    next_image = pick_next(queue, posted)

    if next_image is None:
        print("No hay imagenes nuevas en content/images/. Nada que publicar hoy.")
        return

    image_url = image_url_for(next_image)
    caption = caption_for(next_image)

    print(f"Publicando {next_image} -> {image_url}")
    result = publish(image_url, caption, access_token, ig_user_id)
    print(f"Publicado. Instagram media id: {result.get('id')}")

    posted.append(next_image)
    save_posted(posted)


if __name__ == "__main__":
    try:
        main()
    except requests.HTTPError as exc:
        print(f"Error de la API de Instagram: {exc.response.text}", file=sys.stderr)
        sys.exit(1)
    except KeyError as exc:
        print(f"Falta variable de entorno requerida: {exc}", file=sys.stderr)
        sys.exit(1)
