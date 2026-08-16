# barrioverso — publicación diaria automática en Instagram

Este repositorio publica automáticamente, una vez al día, la siguiente imagen en cola
en una cuenta de Instagram, usando GitHub Actions (cron) y la Graph API de Meta.

## Cómo funciona

1. Colocás imágenes `.jpg`/`.jpeg` en `content/images/` (opcionalmente con un texto en
   `content/captions/<mismo-nombre>.txt` para el pie de foto).
2. Un workflow de GitHub Actions (`.github/workflows/instagram-daily-post.yml`) corre
   todos los días a una hora fija (por defecto 14:00 UTC).
3. `scripts/post_to_instagram.py` mira `state/posted.json` para saber qué ya se publicó,
   toma la siguiente imagen de la cola (por orden alfabético), la publica vía la Graph
   API y guarda el nombre en `state/posted.json` (el workflow commitea ese cambio).
4. Si no quedan imágenes nuevas, no publica nada ese día (a menos que actives
   `REPEAT_WHEN_EMPTY`, ver abajo).

La Graph API necesita una URL pública de la imagen, no una subida directa de archivo:
por eso el script arma la URL como
`https://raw.githubusercontent.com/<owner>/<repo>/<branch>/content/images/<archivo>`.
Esto requiere que el repositorio sea público (o que la cuenta que ejecuta el workflow
tenga forma de servir esa imagen públicamente).

## 1. Requisitos previos en Meta/Instagram

- La cuenta de Instagram debe ser **Business o Creator**, y estar vinculada a una
  **Página de Facebook**.
- Necesitás una app en [developers.facebook.com](https://developers.facebook.com/apps)
  con el producto **Instagram Graph API** agregado.
- Un **token de acceso de usuario** con los permisos:
  `instagram_basic`, `instagram_content_publish`, `pages_show_list`,
  `pages_read_engagement`.

## 2. Obtener `INSTAGRAM_BUSINESS_ACCOUNT_ID`

Con un token de acceso válido:

```
GET https://graph.facebook.com/v19.0/me/accounts?access_token=<TOKEN>
```

Tomá el `id` de la Página de Facebook vinculada, y luego:

```
GET https://graph.facebook.com/v19.0/<PAGE_ID>?fields=instagram_business_account&access_token=<TOKEN>
```

El campo `instagram_business_account.id` es el `INSTAGRAM_BUSINESS_ACCOUNT_ID`.

## 3. Obtener un token de larga duración

Los tokens de usuario cortos duran ~1-2 horas. Convertilo a uno de larga duración
(~60 días):

```
GET https://graph.facebook.com/v19.0/oauth/access_token
    ?grant_type=fb_exchange_token
    &client_id=<APP_ID>
    &client_secret=<APP_SECRET>
    &fb_exchange_token=<TOKEN_CORTO>
```

Ese token de 60 días es el que usás como `INSTAGRAM_ACCESS_TOKEN`. **Los tokens de
página vinculados no expiran mientras la página siga activa y el token se refresque
antes de los 60 días**; poné un recordatorio para renovarlo, o automatizá la renovación
si querés que el sistema sea completamente autónomo a largo plazo (no incluido acá).

## 4. Configurar los secrets en GitHub

En el repo: `Settings → Secrets and variables → Actions → New repository secret`:

- `INSTAGRAM_ACCESS_TOKEN`
- `INSTAGRAM_BUSINESS_ACCOUNT_ID`

## 5. Probar

- Manual: `Actions → Instagram daily auto-post → Run workflow`.
- Local:

```bash
pip install -r requirements.txt
export INSTAGRAM_ACCESS_TOKEN=...
export INSTAGRAM_BUSINESS_ACCOUNT_ID=...
export GITHUB_REPOSITORY=themarchal/barrioverso
export GITHUB_REF_NAME=main
python scripts/post_to_instagram.py
```

## Variables opcionales

- `DEFAULT_CAPTION`: pie de foto a usar cuando no existe un `.txt` para la imagen.
- `REPEAT_WHEN_EMPTY=true`: si se acaban las imágenes, vuelve a empezar la cola desde
  el principio en vez de no publicar nada.
- `GRAPH_API_VERSION`: versión de la Graph API (por defecto `v19.0`).

## Cambiar el horario de publicación

Editá el `cron` en `.github/workflows/instagram-daily-post.yml` (horario en UTC).
