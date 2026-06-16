# 🚀 GitHub Pages Setup

## Why the site shows a white page

GitHub Pages is serving the **source** `index.html` (which references `/src/main.tsx` — a raw TypeScript file browsers can't execute).  
It needs to serve the **built** `dist/index.html` instead (which has all JS/CSS inlined).

## How to fix it (choose ONE option):

### Option A: GitHub Actions (recommended)

1. Make sure `.github/workflows/deploy.yml` exists in your repo with this content:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm install
      - run: npm run build

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

      - id: deployment
        uses: actions/deploy-pages@v4
```

2. Go to **Repository Settings → Pages → Source** and select **"GitHub Actions"** (NOT "Deploy from a branch")
3. Push a commit to trigger the workflow

### Option B: Manual deploy (simplest)

1. Clone the repo locally
2. Run `npm install && npm run build`
3. Copy `dist/index.html` to `docs/index.html`
4. Commit and push
5. Go to **Repository Settings → Pages → Source** and select **"Deploy from a branch"** → `main` → `/docs`

### Option C: Direct file replacement

1. Open `dist/index.html` after building (it's a single self-contained file)
2. In your GitHub repo, create/edit `docs/index.html` and paste the entire content
3. Set Pages source to `main` → `/docs`
