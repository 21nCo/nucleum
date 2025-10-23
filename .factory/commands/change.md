---
description: Create a new change specification and increment parent feature version
argument-hint: change name and optional target feature
---

# conduct-change
Creates a new change specification and increments parent feature version.

**Usage:**
```
conduct-change <change-name> [target-feature]
```

**Steps:**
1. Determine target:
   - If target-feature provided: search for feature in hierarchy
   - Otherwise: use root `conduct/changes/`

2. Create change file:
   ```
   <target>/changes/<change-name>.spec.md
   ```

3. Populate <change-name>.spec.md with change template:
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

4. Increment parent spec version:
   - Copy latest `spec.vN.md` to `spec.v(N+1).md`
   - Update the new spec version to document the change

5. Add to track.json changes array:
   ```json
   {
     "name": "<change-name>",
     "path": "<relative-path>",
     "parentFeature": "<feature-name-or-root>",
     "created": "<current-date>",
     "issueTrackers": { "github": "" }
   }
   ```

**Notes:**
- Always follow the templates in AGENTS.md
- Update track.json for every change
- Keep specs up to date with implementation
- Link to issue trackers when available
