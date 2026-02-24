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
docker build -t ghcr.io/mkmonkeycat/ez-book-purchase-application:latest .
docker push ghcr.io/mkmonkeycat/ez-book-purchase-application:latest
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
