# Feature Specification: Configuration Consolidation

**Feature Branch**: `022-config-consolidation`
**Created**: 2025-11-03
**Status**: Draft
**Input**: User description: "Consolidate 9+ configuration mechanisms into 3 clean layers: bootstrap config (file-based), user settings (ONE.core versioned), and entity configs (per-entity)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Clear Configuration Architecture (Priority: P1)

As a developer working on LAMA, I need a clear, documented configuration architecture so I immediately know where to add new configuration values without searching through multiple files or asking other developers.

**Why this priority**: This is the foundation - without clear architecture, developers will continue adding configuration in inconsistent ways, perpetuating the mess.

**Independent Test**: Can be fully tested by presenting a new developer with a configuration requirement (e.g., "add a setting for email notification preferences") and measuring if they can correctly identify where it belongs within 2 minutes of reading documentation.

**Acceptance Scenarios**:

1. **Given** a new developer reads the configuration documentation, **When** they need to add a user preference setting, **Then** they know it belongs in UserSettings without asking
2. **Given** a developer needs to add a bootstrap parameter, **When** they consult the documentation, **Then** they know to add it to LamaConfig with proper precedence rules
3. **Given** a developer encounters existing configuration code, **When** they see a setting being accessed, **Then** they can identify which of the 3 layers it belongs to by naming convention alone

---

### User Story 2 - Unified User Preferences (Priority: P2)

As a LAMA user, I need all my preferences (AI settings, UI preferences, proposal settings) to sync reliably across all my instances so my experience is consistent regardless of which device I use.

**Why this priority**: Users currently experience inconsistent behavior because settings are scattered - some sync via CHUM, others don't. This creates confusion and support burden.

**Independent Test**: Can be fully tested by setting preferences on one instance, waiting for CHUM sync, then verifying all preferences appear correctly on a second instance without manual intervention.

**Acceptance Scenarios**:

1. **Given** a user has two LAMA instances running, **When** they change their default AI model on instance 1, **Then** instance 2 reflects the change within 30 seconds via CHUM sync
2. **Given** a user sets their theme to "light" and word cloud preferences, **When** they open LAMA on a new device, **Then** all their UI preferences are already applied
3. **Given** a user's settings are modified on instance A while instance B is offline, **When** instance B comes online, **Then** it receives the latest settings without conflicts

---

### User Story 3 - Data Migration Without Loss (Priority: P1)

As a LAMA user upgrading to the new configuration system, I need all my existing preferences automatically migrated so I don't lose any customizations or have to reconfigure everything manually.

**Why this priority**: Without reliable migration, users will experience data loss or spend significant time reconfiguring, creating a poor upgrade experience and potential support burden.

**Independent Test**: Can be fully tested by creating a LAMA instance with all old configuration types populated, upgrading to the new system, and verifying all values are correctly migrated to the new unified structure.

**Acceptance Scenarios**:

1. **Given** a user has configured GlobalLLMSettings with a default model, **When** the app upgrades to the new system, **Then** their default model appears in UserSettings.ai without manual intervention
2. **Given** a user has customized WordCloudSettings, **When** the migration runs, **Then** all their word cloud preferences are preserved in UserSettings.ui.wordCloud
3. **Given** migration fails for any reason, **When** the error is detected, **Then** the system falls back to default settings and logs the issue without crashing

---

### User Story 4 - Reduced Code Complexity (Priority: P3)

As a developer maintaining LAMA, I need consolidated configuration code so I spend less time tracking down configuration bugs and more time building features.

**Why this priority**: While important for developer productivity, this doesn't directly impact users and can be achieved gradually after the core architecture is in place.

**Independent Test**: Can be fully tested by measuring lines of code in configuration-related files before and after refactoring, with a target reduction of ~1000 lines.

**Acceptance Scenarios**:

1. **Given** a developer needs to add a new user preference, **When** they implement it, **Then** they only need to modify UserSettings interface and UserSettingsManager (2 files max)
2. **Given** a bug report about settings not syncing, **When** a developer investigates, **Then** they only need to check UserSettingsManager and CHUM sync (not 6+ different storage mechanisms)
3. **Given** the refactoring is complete, **When** comparing code metrics, **Then** configuration-related code is reduced by at least 800 lines

---

### Edge Cases

- What happens when a user upgrades but has corrupted configuration data in the old format?
- How does the system handle conflicts when two instances modify the same UserSettings field simultaneously?
- What happens if a migration script fails partway through (e.g., GlobalLLMSettings migrated but WordCloudSettings fails)?
- How does the system behave if LamaConfig file is missing required bootstrap fields?
- What happens when a developer accesses deprecated configuration APIs after they're removed?
- How are entity-specific configs (MCPServerConfig, LLM) distinguished from user settings by naming/type alone?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide exactly 3 configuration storage layers: bootstrap config (file-based), user settings (ONE.core versioned), and entity configs (per-entity)
- **FR-002**: System MUST load bootstrap configuration from file with precedence: CLI args > environment variables > config file > defaults
- **FR-003**: System MUST store all user preferences in a single UserSettings ONE.core object with userEmail as ID field
- **FR-004**: System MUST automatically migrate existing GlobalLLMSettings to UserSettings.ai on first startup after upgrade
- **FR-005**: System MUST automatically migrate existing WordCloudSettings to UserSettings.ui.wordCloud on first startup after upgrade
- **FR-006**: System MUST sync UserSettings across instances via CHUM protocol
- **FR-007**: System MUST preserve entity-specific configs (MCPServerConfig, MCPTopicConfig, LLM objects) without modification
- **FR-008**: System MUST provide UserSettingsManager with methods: getSettings(), updateAI(), updateUI(), updateProposals()
- **FR-009**: System MUST cache UserSettings in memory for performance with cache invalidation on updates
- **FR-010**: System MUST handle migration failures gracefully by falling back to default values and logging errors
- **FR-011**: System MUST deprecate AISettingsManager, ConnectionConfig, and scattered settings handlers with warnings before removal
- **FR-012**: System MUST maintain backward compatibility for deprecated APIs for at least 1 release cycle
- **FR-013**: System MUST validate UserSettings structure on load and reject malformed data with clear error messages
- **FR-014**: System MUST document which layer (bootstrap/user/entity) each configuration type belongs to in CLAUDE.md
- **FR-015**: System MUST provide migration guide documenting all deprecated APIs and their replacements

### Key Entities

- **LamaConfig** (file-based): Bootstrap configuration required to start the application, includes instance credentials, network settings (commServer, direct P2P), web URL, and logging level. Loaded once at startup with CLI/env/file/default precedence.

- **UserSettings** (ONE.core object, ID: userEmail): Consolidated user preferences synced via CHUM, contains three sub-sections:
  - `ai`: AI/LLM preferences (default model, temperature, max tokens, provider, system prompt, streaming, auto-summarize, MCP enabled)
  - `ui`: UI preferences (theme, notifications, word cloud visualization settings)
  - `proposals`: Context-aware proposal algorithm configuration (match weight, recency weight, window, min similarity, max proposals)

- **MCPServerConfig** (ONE.core object, ID: userEmail): User's configured MCP servers, stores references to MCPServer objects, represents which MCP tools are available to the user.

- **MCPTopicConfig** (ONE.core object, ID: topicId): Per-conversation MCP settings controlling whether AI can use MCP tools (inbound) and whether external systems can access chat tools (outbound) for specific topics.

- **LLM** (ONE.core object, ID: name): Per-model configuration including encrypted authentication tokens, model parameters (temperature, context size, etc.), and AI contact linkage via personId.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can identify where to add new configuration by consulting documentation in under 2 minutes (verified by observing 3+ developers with a new configuration requirement)
- **SC-002**: Configuration-related code is reduced by at least 800 lines (measured by comparing total lines in config/settings files before and after)
- **SC-003**: 100% of existing user preferences are preserved during migration (verified by automated migration tests comparing old vs new values)
- **SC-004**: UserSettings sync across instances within 30 seconds via CHUM (measured by setting preference on instance A and observing update on instance B)
- **SC-005**: Zero data loss incidents reported during migration in first month post-release (tracked via issue reports and support tickets)
- **SC-006**: Documentation quality score of 8+/10 from team survey on clarity and completeness (surveyed after 2 weeks of use)
- **SC-007**: Developer onboarding time for understanding configuration system reduced from 2+ hours to under 15 minutes (measured by having new developers complete configuration quiz)

## Assumptions *(mandatory)*

### Technical Assumptions

- ONE.core versioning system handles concurrent updates with last-write-wins strategy (standard behavior)
- CHUM sync reliably delivers UserSettings updates within reasonable time (<1 minute under normal network conditions)
- Electron safeStorage remains available for encrypting LLM tokens (existing dependency)
- File system access is available for reading LamaConfig at startup (required for bootstrap)
- Migration scripts run once and can be idempotent (re-running doesn't cause issues)

### Business Assumptions

- Users are willing to accept automatic migration without manual review (backup strategy provided as safety net)
- Deprecation period of 1-2 releases is acceptable for removing old APIs (following standard deprecation practices)
- Configuration changes are infrequent enough that cache performance gains outweigh invalidation overhead
- Developers will read CLAUDE.md before adding new configuration (enforced via code review)

### User Behavior Assumptions

- Users run LAMA on 1-3 instances typically (not 10+, which would increase CHUM sync load)
- Users make configuration changes infrequently (daily or weekly, not constantly)
- Users can tolerate <30 second delay for settings to sync across instances

## Constraints *(mandatory)*

### Technical Constraints

- Must not break existing CHUM sync protocol (used by other features)
- Must preserve LLM token encryption using Electron safeStorage (security requirement)
- Must maintain compatibility with existing ONE.core storage format (cannot change versioned object structure)
- Must complete migrations during startup without blocking UI for more than 5 seconds
- Cannot modify MCPServerConfig, MCPTopicConfig, or LLM object structures (already in production use)

### Business Constraints

- Must complete refactoring within 2-week development window (team capacity)
- Must not require users to manually reconfigure any settings (zero manual migration steps)
- Must not introduce breaking changes before deprecation period ends (1-2 releases)
- Must maintain rollback capability if critical issues discovered post-release

### Security Constraints

- Must continue encrypting all authentication tokens using OS-level storage (Keychain/DPAPI/libsecret)
- Must not expose sensitive configuration values in logs or error messages
- Must validate all configuration input to prevent injection attacks or corruption

## Out of Scope

- Changes to ONE.core versioning or CHUM sync protocol (use existing mechanisms)
- Migration of data outside configuration (chat history, contacts, etc. remain unchanged)
- Performance optimization beyond caching UserSettings (no database indexing changes)
- UI redesign for settings screens (functional changes only, preserve existing layouts)
- Multi-user configuration profiles (single user per instance remains the pattern)
- Configuration export/import features (may be added in future feature)
- Automated configuration backup/restore (users must manually backup OneDB directory)
- Configuration validation UI (validation happens at API layer, no dedicated UI)

## Dependencies

### Internal Dependencies

- ONE.core storage-versioned-objects.js for storing UserSettings
- ONE.core CHUM sync for replicating UserSettings across instances
- Electron safeStorage for continued token encryption
- Existing recipe system for defining UserSettings structure
- Current IPC handlers must be updated to use new UserSettingsManager

### External Dependencies

- No new external dependencies required
- Relies on existing @refinio/one.core and @refinio/one.models packages
- Uses standard Node.js fs module for reading LamaConfig files
- Electron IPC mechanism for browser-to-main communication

## Open Questions

None - all design decisions have been made based on analysis of current implementation and standard patterns.
