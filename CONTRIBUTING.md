# Contributing to Nucleus

Thank you for your interest in contributing to Nucleus! This guide will help you get started.

## Getting Started

1. Fork the [client](https://github.com/21nOrg/client) repository.
2. Clone your fork: `git clone <your-fork-url>`
3. Install dependencies: `npm install`
4. Create a new branch: `git checkout -b feature/your-feature-name`
5. Use the below for environment variables:
```
VITE_PRODUCT=memotron
VITE_STATIC_URL=https://cdn.21n.org

# Optional: For IP-based region detection (get token at https://ipinfo.io/)
VITE_IPINFO_TOKEN=your_token_here
```

**Note:** `VITE_IPINFO_TOKEN` is optional. If not provided, the system will fall back to timezone-based region detection.

## Submitting a Pull Request

1. Push your changes to your fork
2. Submit a pull request to the main repository

## Reporting Issues

If you find any issues or have any suggestions, please report them in the [issues](https://github.com/21nOrg/nucleus/issues) section.

## License

By contributing to Nucleus, you agree that your contributions will be licensed under the [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.html) license.