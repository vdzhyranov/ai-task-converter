<!--
Sync Impact Report
==================
Version Change: Initial → 1.0.0
Reason: Initial constitution ratification for ba-agent project

Modified Principles: N/A (initial creation)
Added Sections:
  - Core Principles (5 principles focused on simplicity and web development)
  - Development Workflow
  - Quality Standards
  - Governance

Templates Status:
  ✅ spec-template.md - Reviewed, compatible with constitution principles
  ✅ plan-template.md - Reviewed, constitution check section aligns
  ✅ tasks-template.md - Reviewed, phase structure supports principles
  ⚠️  Command files - Generic agent references found, updated to remove Claude-specific references

Follow-up TODOs: None
-->

# ba-agent Constitution

## Core Principles

### I. Simplicity First

Every feature and implementation MUST start with the simplest solution that could possibly work. Complexity MUST be justified with concrete requirements before being added.

**Rules**:
- Apply YAGNI (You Aren't Gonna Need It) rigorously
- No abstractions until proven necessary by repetition (Rule of Three)
- No frameworks or libraries without clear justification
- Choose boring, well-understood technology over novel solutions

**Rationale**: Simple systems are easier to understand, debug, maintain, and extend. Complexity should emerge from proven needs, not anticipated ones.

### II. User-Centric Design

All features MUST be designed with clear user scenarios and acceptance criteria before implementation begins. Features without validated user value MUST NOT be implemented.

**Rules**:
- Every feature requires documented user stories with Given-When-Then scenarios
- User stories MUST be prioritized (P1, P2, P3) by business value
- Each user story MUST be independently testable and deployable
- UI/UX decisions MUST be validated with actual user workflows

**Rationale**: Building the right thing is more important than building things right. User-centric design prevents waste and ensures delivered value.

### III. Web Application Standards

As a web application, the system MUST follow established web development best practices for both frontend and backend components.

**Rules**:
- Clear separation between frontend and backend concerns
- RESTful or GraphQL API design with proper HTTP semantics
- Responsive design supporting mobile, tablet, and desktop viewports
- Progressive enhancement where appropriate
- Security: OWASP Top 10 vulnerabilities MUST be addressed
- Performance: Frontend bundle size <500KB, API response times <200ms p95

**Rationale**: Web applications have well-established patterns that improve reliability, security, and user experience. Following standards reduces friction and technical debt.

### IV. Documentation as Code

Documentation MUST be maintained alongside code and MUST stay current. Features without documentation MUST NOT be merged.

**Rules**:
- API endpoints MUST have OpenAPI/Swagger documentation
- Each user-facing feature MUST have usage documentation
- Architecture decisions MUST be recorded in ADRs (Architecture Decision Records)
- README MUST include setup, development, and deployment instructions
- Code MUST be self-documenting with clear naming and minimal comments

**Rationale**: Documentation that lives with code is more likely to stay current. Good documentation reduces onboarding time and prevents knowledge silos.

### V. Continuous Integration

Code changes MUST pass automated checks before merging. Quality gates MUST be enforced at the CI/CD level.

**Rules**:
- All code MUST pass linting and formatting checks
- Security scanning MUST be run on all dependencies
- Build MUST succeed for both frontend and backend
- Deployment MUST be automated via CI/CD pipeline
- Tests (when present) MUST pass before merge

**Rationale**: Automation catches errors early and ensures consistent quality. Manual verification is error-prone and doesn't scale.

## Development Workflow

### Feature Development Cycle

1. **Specification**: Create feature spec with user stories (use `/speckit.specify`)
2. **Planning**: Research and design implementation approach (use `/speckit.plan`)
3. **Task Breakdown**: Generate actionable task list (use `/speckit.tasks`)
4. **Implementation**: Execute tasks according to priority and dependencies
5. **Validation**: Verify against acceptance criteria and success metrics
6. **Documentation**: Update user docs, API specs, and quickstart guides
7. **Review**: Code review for compliance with this constitution
8. **Merge**: Only after all quality gates pass

### Branching Strategy

- `main` or `master`: Production-ready code only
- Feature branches: `###-feature-name` format matching spec/plan directories
- One feature branch per user story or related story group
- Keep branches short-lived (<1 week ideal, <2 weeks maximum)

## Quality Standards

### Code Review Checklist

All pull requests MUST be reviewed against:

- [ ] **Simplicity**: Is this the simplest solution? Complexity justified?
- [ ] **User Value**: Does this implement prioritized user scenarios?
- [ ] **Web Standards**: Follows frontend/backend best practices?
- [ ] **Documentation**: User docs, API specs, ADRs updated?
- [ ] **CI/CD**: All automated checks passing?
- [ ] **Security**: No OWASP vulnerabilities introduced?
- [ ] **Performance**: Meets defined performance budgets?

### Technical Debt

- Technical debt MUST be tracked in a visible location (issues, tickets, or TODOs with issue references)
- Any intentional shortcuts MUST include a plan and timeline for resolution
- Accumulating technical debt without a payoff plan MUST be escalated

## Governance

### Amendment Procedure

1. Propose amendment with clear rationale and impact analysis
2. Review with development team and stakeholders
3. Update constitution with semantic versioning:
   - **MAJOR**: Backward incompatible changes (principle removal/redefinition)
   - **MINOR**: New principles or materially expanded guidance
   - **PATCH**: Clarifications, wording fixes, non-semantic updates
4. Propagate changes to all dependent templates and documentation
5. Generate sync impact report and communicate changes to team

### Compliance Review

- Constitution compliance is checked during code review
- Non-compliant code MUST be either fixed or explicitly justified
- Repeated violations indicate constitution needs revision or better enforcement
- Quarterly review of constitution effectiveness and relevance

### Exceptions

- Exceptions to constitutional principles MUST be documented in the Complexity Tracking section of `plan.md`
- Each exception MUST include: what principle is violated, why it's necessary, and what simpler alternatives were rejected
- Exceptions are allowed but MUST be rare and well-justified

**Version**: 1.0.0 | **Ratified**: 2025-11-06 | **Last Amended**: 2025-11-06