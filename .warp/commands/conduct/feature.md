---
description: Create a new feature with proper directory structure and spec template
argument-hint: feature name and optional parent feature
---

# conduct-feature
Creates a new feature with the proper directory structure and spec template.

**Usage:**
```
conduct-feature <feature-name> [parent-feature]
```

**Steps:**
1. Determine target path:
   - If parent-feature provided: search for it in hierarchy and create under `features/`
   - Otherwise: create in `conduct/features/`

2. Create directory structure:
   ```
   <target-path>/<feature-name>/
   ├── spec.v0.md
   ├── features/
   └── changes/
   ```

3. Populate spec.v0.md with feature template:
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

4. If creating nested feature, increment parent spec version:
   - Copy latest `spec.vN.md` to `spec.v(N+1).md` in parent feature folder
   - Update the new spec version to document the new nested feature

5. Add to track.json features array:
   ```json
   {
     "name": "<feature-name>",
     "path": "<relative-path>",
     "version": 0,
     "created": "<current-date>",
     "issueTrackers": { "github": "" }
   }
   ```

**Notes:**
- Always follow the templates in AGENTS.md
- Update track.json for every feature
- Link to issue trackers when available
