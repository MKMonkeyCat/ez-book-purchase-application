# Welcome to React Router!

A modern, production-ready template for building full-stack React applications using React Router.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/remix-run/react-router-templates/tree/main/default)

## Features

- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 📖 [React Router docs](https://reactrouter.com/)

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

### Docker Deployment

To build and run using Docker:

```bash
docker build -t my-app .

# Run the container
docker run -p 3000:3000 my-app
```

The containerized application can be deployed to any platform that supports Docker, including:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `npm run build`

```
├── package.json
├── package-lock.json (or pnpm-lock.yaml, or bun.lockb)
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

### k3s Deployment

Kubernetes manifests for k3s are provided in `k8s/`.

1. Build and push image (replace registry path/tag):

```bash
docker build -t ghcr.io/your-org/ez-book-purchase-application:latest .
docker push ghcr.io/your-org/ez-book-purchase-application:latest
```

2. Update image in `k8s/deployment.yaml`.

3. Create secret file from example and fill real values:

```bash
cp k8s/secret.example.yaml k8s/secret.yaml
```

4. Apply resources:

```bash
kubectl apply -f k8s/secret.yaml
kubectl apply -k k8s
```

5. (Optional) Add local DNS entry for test host in `k8s/ingress.yaml`:

```bash
# example
<your-k3s-node-ip> ez-book.local
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

## Google Sheets as Database

This project includes server-side Google Sheets utils in `app/.server/google-sheets.ts`.

### 1) Create `.env`

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

- `GOOGLE_SHEETS_SPREADSHEET_ID`: target spreadsheet ID
- `GOOGLE_SHEETS_CLIENT_EMAIL`: service account email
- `GOOGLE_SHEETS_PRIVATE_KEY`: service account private key (keep `\n` line breaks)

### 2) Share spreadsheet permission

Share your Google spreadsheet with `GOOGLE_SHEETS_CLIENT_EMAIL` and give it **Editor** permission.

### 3) Use in route loaders/actions

```ts
import { appendSheetRow, readSheetRange } from '~/.server/google-sheets';

// Read rows
const rows = await readSheetRange('Orders!A1:E');

// Append one row
await appendSheetRow('Orders!A:E', [
  new Date().toISOString(),
  'book-001',
  'Clean Code',
  1,
  399,
]);
```

Available utils:

- `readSheetRange(range)`
- `appendSheetRow(range, row)`
- `appendSheetRows(range, rows)`
- `updateSheetRange(range, rows)`
- `clearSheetRange(range)`
- `mapRowsToObjects(rows)`

---

Built with ❤️ using React Router.
