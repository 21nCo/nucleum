# GitHub Actions Workflows

This repository contains GitHub Actions workflows for deploying projects in the Nucleus Turbo repo.

## Available Workflows

### Turbo Deploy (`turbo-deploy.yml`)

Unified deployment workflow for all products in the turbo repo using AWS CDK.

**Deployment Strategy:**
- **dev branch push** → Auto-deploys ALL products to dev environment
- **pre/live environments** → Manual deployment only (for safety)

**Trigger Methods:**
1. **Auto-Deploy**: Push to `dev` branch deploys all products to dev environment
2. **Manual Deploy**: Use GitHub Actions UI for specific product/environment combinations

**Manual Dispatch Options:**
- `project`: Choose which project to deploy (nucleus, memotron, pointron, gathery, all)
- `environment`: Choose deployment environment (dev, pre, live)

**Key Features:**
- **Multi-project Support**: Deploy single project or all projects at once
- **Environment-specific Secrets**: Per-environment secret management
- **Fallback Support**: Project-specific secrets with default fallbacks
- **Matrix Strategy**: Parallel builds and deployments
- **Safety Controls**: Manual approval required for pre/live environments

## Prerequisites

### Required GitHub Secrets

Secrets are organized by **GitHub Environment** (dev, pre, live) for better security and organization.

#### Project-Specific Secrets (per environment)

**Format**: `{PROJECT}_AWS_ACCESS_KEY_ID`, `{PROJECT}_AWS_SECRET_ACCESS_KEY`, `{PROJECT}_APP_ENV_VARS`

**Examples for `dev` environment:**
- `NUCLEUS_AWS_ACCESS_KEY_ID`
- `NUCLEUS_AWS_SECRET_ACCESS_KEY`
- `NUCLEUS_APP_ENV_VARS`
- `MEMOTRON_AWS_ACCESS_KEY_ID`
- `MEMOTRON_AWS_SECRET_ACCESS_KEY`
- `MEMOTRON_APP_ENV_VARS`
- ... (repeat for pointron, gathery)

#### Fallback Secrets (per environment)

**Used when project-specific secrets are not found:**
- `DEFAULT_AWS_ACCESS_KEY_ID`
- `DEFAULT_AWS_SECRET_ACCESS_KEY`
- `DEFAULT_APP_ENV_VARS`

#### Auto-Provided
- `GITHUB_TOKEN`: GitHub token for submodule access (automatically provided)

### Required GitHub Environments

Create these environments in your repository settings:
- `dev`
- `pre` 
- `live`

Each environment can have environment-specific secrets and protection rules.

## Project Structure

The workflows are designed to work with the Turbo repo structure:

```
nucleus/
├── lib/
│   ├── client/
│   │   └── products/
│   │       ├── nucleus/
│   │       ├── memotron/
│   │       ├── pointron/
│   │       └── gathery/
│   ├── packages/
│   ├── shared/
│   ├── server/
│   └── deployment/
│       └── cdk/
│           ├── client/
│           └── staticClient/
└── .github/
    └── workflows/
```

## Usage Examples

### Auto-Deploy All Products to Dev

**Push to dev branch:**
```bash
git push origin dev
```
This will automatically deploy ALL products (nucleus, memotron, pointron, gathery) to the dev environment.

### Manual Deploy Single Product

**Deploy Nucleus to Pre Environment:**
1. Go to Actions tab in GitHub
2. Select "Turbo Deploy"
3. Click "Run workflow"
4. Choose:
   - Project: `nucleus`
   - Environment: `pre`

**Deploy Memotron to Live Environment:**
1. Go to Actions tab in GitHub
2. Select "Turbo Deploy"
3. Click "Run workflow"
4. Choose:
   - Project: `memotron`
   - Environment: `live`

### Manual Deploy All Products

**Deploy All Products to Pre Environment:**
1. Go to Actions tab in GitHub
2. Select "Turbo Deploy"
3. Click "Run workflow"
4. Choose:
   - Project: `all`
   - Environment: `pre`

## Workflow Features

- **🚀 Smart Deployment Strategy**: Auto-deploy all products to dev, manual control for pre/live
- **🎯 Matrix Strategy**: Parallel builds and deployments for efficiency
- **🔐 Environment-based Secrets**: Project-specific secrets with fallback support
- **📦 Multi-project Support**: Deploy single project, multiple projects, or all at once
- **🛡️ Safety Controls**: Manual approval gates for production environments
- **📋 Artifact Management**: Build artifacts shared between build and deploy jobs
- **🔄 Submodule Support**: Automatically handles Git submodules
- **☁️ AWS CDK Integration**: Uses existing CDK infrastructure code
- **❌ Error Resilience**: fail-fast: false allows other projects to continue if one fails
- **⚡ Resource Optimization**: Configurable Node.js memory limits
- **💨 Cache Support**: NPM dependency caching for faster builds
- **📊 Comprehensive Logging**: Detailed status reporting and error messages

## Troubleshooting

### Common Issues

1. **Build Failures**: Check that all dependencies are properly defined in package.json files
2. **AWS Authentication**: 
   - Verify project-specific AWS credentials (e.g., `NUCLEUS_AWS_ACCESS_KEY_ID`) exist in the target environment
   - Check fallback credentials (`DEFAULT_AWS_ACCESS_KEY_ID`) if project-specific ones are missing
3. **Environment Variables**: 
   - Ensure project-specific env vars (e.g., `NUCLEUS_APP_ENV_VARS`) exist in the target environment
   - Verify fallback env vars (`DEFAULT_APP_ENV_VARS`) are configured
4. **Project Not Found**: Verify the project exists in `lib/client/products/{project}/`
5. **Submodule Issues**: Check that GITHUB_TOKEN has access to all required submodules
6. **CDK Deployment**: 
   - Verify CDK code is compatible with the project structure
   - Ensure `PROJECT_NAME` and `ENVIRONMENT` variables are handled correctly in CDK code
7. **Matrix Job Failures**: Individual project failures won't stop other projects (fail-fast: false)

### Getting Help

- Check workflow logs in the GitHub Actions tab
- Verify all required secrets are set
- Ensure target environments exist in GitHub repository settings
- Confirm AWS permissions for CDK deployment
