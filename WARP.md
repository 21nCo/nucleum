# WARP Agent Rules and Guidelines

## Code Generation and Editing Rules

### 1. No Inline Comments
- No inline comments should be added whenever new code is generated or code is edited by the agent
- Keep code clean and comment-free when making changes
- Let the code speak for itself without additional commentary

### 2. Pull Request Review Fixing Protocol

When asked to fix pull request review comments by providing a PR number:

#### Step 1: Initial Data Fetch
- **MUST** fetch the PR using GitHub CLI first
- Use commands like `gh pr view <number> --json reviews,comments`
- Extract all available review data through the CLI

#### Step 2: Comprehensive Data Collection
- If the CLI data is not clear enough or incomplete
- **MUST** use a headless browser (Playwright/Puppeteer) to fetch the entire PR data
- Create scripts in a temporary directory (e.g., `/tmp/pr_review/`) 
- **DO NOT** pollute the project directory with scraping tools
- Extract all review comments, inline comments, and actionable items

#### Step 3: Critical Issue Analysis
- **DO NOT** miss any kind of critical issues when asked to fix the PR
- Identify all actionable comments from all review sources:
  - Sourcery AI
  - CodeRabbit AI
  - Typo-app
  - Cubic AI
  - Human reviewers
  - Any other automated review tools

#### Step 4: Systematic Issue Resolution
- Create a comprehensive todo list of all issues found
- Fix each issue systematically
- Verify that ALL actionable items have been addressed
- Do not skip or ignore any reported problems

#### Best Practices
- Always work in temporary directories for tooling
- Clean up after scraping operations
- Be thorough and methodical in issue identification
- Double-check that no critical issues are missed
- Provide clear summary of what was fixed
