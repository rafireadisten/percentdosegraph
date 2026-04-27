# Contributing to PercentDoseGraph

Thank you for your interest in contributing to PercentDoseGraph! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- PostgreSQL (for backend development)

### Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/percentdosegraph.git
   cd percentdosegraph
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Frontend Development**
   ```bash
   npm run dev:web
   ```
   Opens the static web interface with your default browser.

4. **Backend Development**
   ```bash
   npm run dev:api
   ```
   Starts the Express.js development server with hot-reload.

5. **Build All**
   ```bash
   npm run build:all
   ```

## Project Structure

```
percentdosegraph/
├── artifacts/api-server/     # Express.js backend
├── lib/db/                   # Drizzle ORM database layer
├── lib/api-zod/              # Shared API schemas & types
├── frontend-react/           # React frontend (modern)
├── frontend-static/          # Static HTML/CSS/JS (legacy)
├── scripts/                  # Build & dev scripts
└── data/                     # Sample data files
```

## Code Style

- Use TypeScript for all backend code
- Follow ESLint configuration (TODO: add eslint config)
- Format with Prettier (TODO: add prettier config)
- Use descriptive variable and function names
- Add comments for complex logic

## Testing

TODO: Add testing setup and guidelines.

## Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Keep commits atomic and well-documented
   - Reference issues in commit messages (e.g., "fixes #123")

3. **Test your changes**
   ```bash
   npm run build:all
   ```

4. **Submit a pull request**
   - Write a clear, descriptive PR title
   - Include the issue number if applicable
   - Describe what your changes do and why

## Reporting Issues

When reporting bugs, please include:
- Environment details (OS, Node.js version, browser)
- Steps to reproduce
- Expected vs. actual behavior
- Any error messages or logs

## Clinical Considerations

This is a clinical tool. When making changes:
- Prioritize accuracy and safety
- Test thoroughly with realistic dosing scenarios
- Consider edge cases (renal function, weight adjustments, etc.)
- Ensure the drug library remains accurate and current

## License

By contributing to PercentDoseGraph, you agree that your contributions will be licensed under its MIT License.
