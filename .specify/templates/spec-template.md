# Feature Specification: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]`  
**Created**: [DATE]  
**Status**: Draft  
**Input**: User description: "$ARGUMENTS"

## Execution Flow (main)
```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Confirm product context (Memotron, Pointron, Nucleus, Gathery, cross-product)
3. Extract key concepts
   → Identify actors, actions, data, constraints, feature gates, persistence or sync needs
4. Mark unclear aspects with [NEEDS CLARIFICATION]
5. Fill User Scenarios & Testing
   → If no clear user flow: ERROR "Cannot determine user scenarios"
6. Generate Functional Requirements
   → Each requirement must be testable and product-aware
7. Identify Key Entities or state surfaces (stores, Flux persistence, shared types, DynamoDB contracts)
8. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove technical execution details"
9. Return SUCCESS when spec is ready for planning
```

---

## ⚡ Quick Guidelines
- ✅ Focus on what users experience across Tidigit products
- ✅ Capture feature gates, personalization, offline/online expectations
- ✅ Note when the Dexie offline store or DynamoDB sync needs to change
   - Dexie data model expectations vs DynamoDB sync requirements
- ❌ Avoid implementation details (no code, APIs, libraries)
- 👥 Written for stakeholders and planners; developers rely on plan.md

### Section Requirements
- **Mandatory sections**: Provide detail or remove section entirely; no placeholders
- **Optional sections**: Include only when relevant to the feature
- Remove any unused subsections rather than leaving "N/A"

### For AI Generation
1. **Mark ambiguities** with `[NEEDS CLARIFICATION: question]`
2. **Do not assume** product context if not provided; call it out explicitly
3. **Think like QA**: requirements must be observable via user behavior or data changes
4. **Common underspecified areas**:
   - Multi-product differences (Memotron vs Pointron vs Nucleus)
   - Feature gating and preferences in `client/products/product.config.ts`
   - Dexie data model expectations vs DynamoDB sync requirements
   - Security/privacy handling within personal productivity context
   - Accessibility or mobile considerations

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
[Describe the core journey referencing the product context]

### Acceptance Scenarios
1. **Given** [initial state tied to product], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

### Edge Cases
- What happens when [boundary condition unique to Tidigit products]?
- How does the system handle [error scenario or sync issue]?

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST [user-visible capability]
- **FR-002**: System MUST [product-specific rule]
- **FR-003**: Users MUST be able to [key interaction]
- **FR-004**: System MUST [persist/transform data expectation across Dexie ↔ DynamoDB]
- **FR-005**: System MUST [feedback, logging, or notifications]
- **FR-00X**: System MUST [NEEDS CLARIFICATION: detail not provided]

### Non-Functional Requirements *(include when relevant)*
- **NFR-001**: [Performance, responsiveness, offline behavior, sync cadence]
- **NFR-002**: [Accessibility, localization, or trust requirement]

### Key Entities & State *(include if feature touches data, stores, or sync)*
- **[Store or Flux Resource]**: [What it represents, relationship to Dexie schema]
- **[DynamoDB Item or Index]**: [How backend state is organized or queried]
- **[Preference or Feature Flag]**: [How it influences the user experience]

### Dependencies & Assumptions *(optional but recommended)*
- Depends on [existing feature, integration, or release sequence]
- Assumes [user settings, offline availability, sync environment]

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [ ] No implementation details (languages, frameworks, APIs)
- [ ] Focused on user value, product context, and business needs
- [ ] Written for non-technical stakeholders and planners
- [ ] All mandatory sections completed or intentionally removed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous
- [ ] Success criteria tie back to user scenarios
- [ ] Scope boundaries are explicit (in/out of feature)
- [ ] Dependencies and assumptions are identified

---

## Execution Status
*Updated by main() during processing*

- [ ] User description parsed
- [ ] Product context identified
- [ ] Key concepts extracted
- [ ] Ambiguities marked
- [ ] User scenarios defined
- [ ] Requirements generated
- [ ] Entities/state surfaces identified
- [ ] Review checklist passed

---
