# ez-book-purchase-application

Book purchase application built with React Router.

## Getting Started

### Install dependencies

```bash
npm install
```

### Start development server

```bash
npm run dev
```

App runs at `http://localhost:5173`.

## Build

```bash
npm run build
```

## Deployment

### Docker

```bash
docker build -t ez-book-purchase-application:latest .
docker run -p 3000:3000 ez-book-purchase-application:latest
```

### Helm (Kubernetes)

Helm chart is in `charts/ez-book-purchase-application`.

1. Prepare values file:

```bash
cp charts/ez-book-purchase-application/values.yaml values.prod.yaml
```

2. Edit `values.prod.yaml`:
   - Set `image.repository` to your image registry.
   - Set `image.tag` to the image tag you pushed.
   - Fill `env` values:
     - `GOOGLE_SHEETS_SPREADSHEET_ID`
     - `GOOGLE_SHEETS_LOGS_SPREADSHEET_ID`
     - `GOOGLE_SHEETS_CLIENT_EMAIL`
     - `GOOGLE_SHEETS_PRIVATE_KEY`

3. Install/upgrade:

```bash
helm upgrade --install ez-book-purchase-application \
  ./charts/ez-book-purchase-application \
  -f values.prod.yaml \
  --namespace ez-book \
  --create-namespace
```

4. Check resources:

```bash
kubectl get all -n ez-book
```

If ingress is disabled, use port-forward:

```bash
kubectl -n ez-book port-forward svc/ez-book-purchase-application-ez-book-purchase-application 8080:3000
```

## Runtime env vars

Required environment variables:

- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_SHEETS_LOGS_SPREADSHEET_ID`
- `GOOGLE_SHEETS_CLIENT_EMAIL`
- `GOOGLE_SHEETS_PRIVATE_KEY`
