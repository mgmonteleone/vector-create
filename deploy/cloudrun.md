# Cloud Run — first live deploy (CSS-1553)

Project: `customer-support-success`  
Service (suggested): `vector-create`  
Region (suggested): `us-central1`  
Secret: `auggie-session-auth` → injected as env for the auggie CLI (commonly `AUGMENT_SESSION_AUTH`)

## Image

```bash
export PROJECT=customer-support-success
export REGION=us-central1
export REPO=vector-create
export SERVICE=vector-create
export IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}/vector-create:$(git rev-parse --short HEAD)"

gcloud artifacts repositories create "${REPO}" \
  --repository-format=docker --location="${REGION}" --project="${PROJECT}" || true

gcloud builds submit --tag "${IMAGE}" --project="${PROJECT}" .
```

## Deploy

```bash
gcloud run deploy "${SERVICE}" \
  --project="${PROJECT}" \
  --region="${REGION}" \
  --image="${IMAGE}" \
  --allow-unauthenticated \
  --port=8080 \
  --set-env-vars="SERVE_SINGLE_PORT=1,ENABLE_GRPC=0,SPA_DIST=/app/packages/spa/dist,AUGGIE_COMMAND=auggie" \
  --set-secrets="AUGMENT_SESSION_AUTH=auggie-session-auth:latest" \
  --cpu=1 --memory=1Gi --min-instances=0 --max-instances=3 \
  --timeout=300
```

Public URL is printed by `gcloud run services describe` / the deploy output.

## Verify

```bash
URL=$(gcloud run services describe "${SERVICE}" --project="${PROJECT}" --region="${REGION}" --format='value(status.url)')
curl -sS "${URL}/healthz"
curl -sS "${URL}/api/concepts" | head -c 200
open "${URL}/"   # retro SPA
```
