# Conduct Agent Instructions

## Overview
This repository uses Conduct for specification and change management. This file provides instructions for AI coding agents to work effectively with the Conduct structure.

## Directory Structure
```
conduct/
├── spec.v0.md          # Root project specification
├── track.json          # Feature and change tracking with issue tracker mappings
├── AGENTS.md           # This file - instructions for AI agents
├── features/           # Feature specifications (can be nested)
│   └── feature-name/
│       ├── spec.v0.md  # Feature specification (versioned)
│       ├── features/   # Nested sub-features
│       └── changes/    # Changes to this feature
└── changes/            # Root-level changes
```

## Issue Trackers
This project uses the following issue tracking systems:
- GitHub Issues (21nOrg/tidigit/issues)

All features and changes should be linked to issues in track.json.

## Creating New Features

### Using CLI (if available)
If you have the Conduct CLI installed, the easiest way is to use it directly. However, if CLI commands are not available in your environment, follow the manual instructions below.

### Manual Feature Creation
1. Choose the appropriate location:
   - For root-level features: `conduct/features/`
   - For nested features: `conduct/features/<parent-feature>/features/`

2. Create feature directory structure:
   ```
   conduct/features/<feature-name>/
   ├── spec.v0.md
   ├── features/
   └── changes/
   ```

3. Create `spec.v0.md` with the following template:
   ```markdown
   # Feature Name

   ## Overview
   <!-- Description of this feature -->

   ## Requirements
   ### Functional Requirements
   <!-- What the feature must do -->

   ### Non-functional Requirements
   <!-- Performance, security, usability requirements -->

   ## Implementation
   ### Technical Approach
   <!-- How the feature will be implemented -->

   ### File Structure
   <!-- Files and directories created -->

   ## Dependencies
   <!-- Related features or external dependencies -->
   ```

4. Add entry to `conduct/track.json` features array:
   ```json
   {
     "name": "<feature-name>",
     "path": "features/<feature-name>",
     "version": 0,
     "created": "YYYY-MM-DD",
     "issueTrackers": {
       "github": ""
     }
   }
   ```

## Creating Changes

### Manual Change Creation
1. Identify the target feature (or use root `conduct/changes/` for project-level changes)

2. Create change file directly in the changes/ folder:
   ```
   conduct/[features/<feature-name>/]changes/<change-name>.spec.md
   ```

3. Create `<change-name>.spec.md` with the following template:
   ```markdown
   # Change Name

   ## Change Description
   <!-- What is being changed and why -->

   ## Impact
   <!-- What parts of the system are affected -->

   ## Implementation Notes
   <!-- Technical details of the change -->

   ## Checklist
   - [ ] Implementation complete
   - [ ] Tests added/updated
   - [ ] Documentation updated
   - [ ] Parent spec updated
   ```

4. Increment the parent feature's spec version:
   - Copy `spec.vN.md` to `spec.v(N+1).md`
   - Update the new version to reflect the change

5. Add entry to `conduct/track.json` changes array:
   ```json
   {
     "name": "<change-name>",
     "path": "[features/<feature-name>/]changes/<change-name>",
     "parentFeature": "<feature-name>",
     "created": "YYYY-MM-DD",
     "issueTrackers": {
       "github": ""
     }
   }
   ```

## Updating Existing Features

When making changes to an existing feature:

1. **Increment the spec version**:
   - Copy the latest `spec.vN.md` to `spec.v(N+1).md`
   - Update the new version with your changes

2. **Document what changed**:
   - Add a comment or section at the top describing the update
   - Keep previous versions for history

3. **Update track.json**:
   - Update the `version` field for the feature
   - Add `updated` timestamp

## Best Practices

1. **Specification-First Development**:
   - Always create or update specs before implementing changes
   - Keep specs up to date as development progresses

2. **Nested Features**:
   - Use nested features for logical sub-components
   - Keep the hierarchy shallow (2-3 levels max recommended)

3. **Version Management**:
   - Never delete old spec versions - they provide history
   - Increment versions whenever significant changes are made
   - Parent specs should be updated when child features/changes are added

4. **Issue Tracker Integration**:
   - Always link features and changes to issue tracker items
   - Update track.json with issue IDs as soon as they're created
   - Use empty string ("") when issue is not yet created

5. **Clarity and Detail**:
   - Write specs that are clear and actionable
   - Include code examples where helpful
   - Document dependencies and impacts

## Agent-Specific Commands

Some AI coding agents may have custom commands available. Check for:
- `.opencode` - Commands for OpenCode agent
- `.factory` - Commands for Factory agent  
- `.cursor` - Commands for Cursor agent
- `.claude` - Commands for Claude agent

If these files exist, they contain agent-specific shortcuts like:
- `conduct-feature` - Quick feature creation
- `conduct-change` - Quick change creation

## Examples

### Example: Creating a nested authentication feature
```
conduct/features/
└── user-management/
    ├── spec.v0.md
    ├── features/
    │   └── authentication/
    │       ├── spec.v0.md
    │       ├── features/
    │       └── changes/
    └── changes/
```

### Example: Adding a change to a feature
```
conduct/features/user-management/
├── spec.v0.md
├── spec.v1.md          # Incremented version
├── features/
└── changes/
    └── add-password-reset.spec.md
```

## Getting Help

- Review existing features and changes as examples
- Check `conduct/spec.v0.md` for project-level context
- Consult the Conduct CLI documentation if available
- Follow the templates provided above strictly for consistency
