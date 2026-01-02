# ChainSync Documentation

User-facing documentation built with MkDocs Material.

## Quick Start

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Local Development

```bash
# Start development server
mkdocs serve

# View at http://localhost:8000
```

### Build

```bash
# Build static site
mkdocs build

# Output in site/ directory
```

## Structure

```
documentation/
├── mkdocs.yml              # MkDocs configuration
├── requirements.txt        # Python dependencies
├── docs/
│   ├── index.md           # Home page
│   ├── getting-started/   # Getting started guides
│   ├── architecture/      # Architecture docs
│   ├── sdk/               # SDK documentation
│   ├── api/               # API reference
│   ├── deployment/        # Deployment guides
│   ├── configuration/     # Configuration reference
│   ├── examples/          # Usage examples
│   ├── development/       # Contributing guides
│   ├── support/           # Support and FAQ
│   ├── stylesheets/       # Custom CSS
│   └── assets/            # Images and assets
└── site/                  # Built output (gitignored)
```

## Editing

- Edit Markdown files in `docs/`
- Configuration in `mkdocs.yml`
- Custom styles in `docs/stylesheets/extra.css`

## Deployment

Build and deploy the `site/` directory to your hosting platform.

### GitHub Pages

```bash
mkdocs gh-deploy
```

### Manual

```bash
mkdocs build
# Upload site/ to your web server
```
