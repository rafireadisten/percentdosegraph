# GitHub Web Deployment Folder

This folder contains the built, deployable version of PercentDoseGraph ready for:
- GitHub Pages
- Netlify
- Vercel
- Other static hosting services

## Build Instructions

To populate this folder with the latest build:

```bash
# From project root
npm run build:web

# Files will be built to: frontend-react/app.bundle.js
# Copy built files here or update deploy script
```

## Deployment Options

### Option 1: GitHub Pages
1. Push this folder to `gh-pages` branch
2. Enable GitHub Pages in repository settings
3. Public URL: `https://yourusername.github.io/percentdosegraph`

### Option 2: Netlify
1. Connect your GitHub repo to Netlify
2. Build command: `npm run build:web`
3. Publish directory: `frontend-react/`

### Option 3: Vercel
1. Import project from GitHub
2. Build command: `npm run build:web`
3. Output directory: `frontend-react/`

## Contents

- `index.html` - Main entry point
- `app.bundle.js` - Compiled React application (generated)
- `styles.css` - Application styles
- Supporting assets (if any)

## Auto-Build & Deploy

See `.github/workflows/ci.yml` for automated CI/CD setup.

To add deployment automation:
1. Set up GitHub Actions workflow
2. Trigger on push to main
3. Build and deploy to hosting service

---

**Status**: Ready for deployment configuration
