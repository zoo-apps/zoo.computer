# zoo.computer

Zoo ecosystem application deployed at https://computer.zoo.ngo

## Development

```bash
npm install
npm run dev
```

## Deployment

Automatically deploys to GitHub Pages on push to main branch.

## Custom Domain

DNS configured to point computer.zoo.ngo to this GitHub Pages site.

## Setup

1. Enable GitHub Pages in repository settings
2. Set source to "GitHub Actions"
3. Configure custom domain: computer.zoo.ngo
4. Wait for DNS propagation
5. Enable "Enforce HTTPS"

## Build

```bash
npm run build
```

Build output goes to `./dist` directory.
