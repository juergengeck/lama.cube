# Tasks: Configuration Consolidation

**Input**: Design documents from `/specs/022-specify-scripts-bash/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/
**Branch**: `022-config-consolidation`
**Feature**: Consolidate 9+ configuration mechanisms into 3 clean layers

**Tests**: Not explicitly requested in spec.md - focusing on implementation only

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- **Main process**: `main/` (Node.js TypeScript)
- **Renderer UI**: `electron-ui/src/` (React TypeScript)
- **Type definitions**: `@OneCoreTypes.d.ts`, `@OneObjectInterfaces.d.ts`
- **Contracts**: `specs/022-specify-scripts-bash/contracts/`
- **Documentation**: `docs/`, `specs/022-specify-scripts-bash/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Type definitions and recipe registration required by all user stories

- [X] T001 [P] Create UserSettings type definitions in main/types/user-settings-types.ts (copied from contract)
- [X] T002 [P] Create migration contract types in main/types/migration-contract.ts (copied from contract)
- [X] T003 Add UserSettings interface to @OneCoreTypes.d.ts extending OneVersionedObjectInterfaces
- [X] T004 Create UserSettings ONE.core recipe in main/recipes/user-settings-recipe.ts following data-model.md
- [X] T005 Register UserSettings recipe in main/recipes/index.ts LamaRecipes array

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core UserSettingsManager and IPC infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Create UserSettingsManager class in main/core/user-settings-manager.ts with methods: getSettings(), updateSettings(), updateAI(), updateUI(), updateProposals()
- [X] T007 Implement in-memory cache with invalidation in UserSettingsManager per research.md Decision 4
- [X] T008 Implement settings validation helpers in main/core/user-settings-manager.ts using contracts/user-settings-types.ts validators
- [X] T009 Create IPC handlers in main/ipc/handlers/user-settings.ts implementing all 6 channels from contracts/ipc-user-settings.json
- [X] T010 Register user-settings IPC handlers in main/ipc/controller.ts
- [X] T011 [P] Create React useSettings hook in electron-ui/src/hooks/useSettings.ts wrapping IPC calls
- [X] T012 [P] User-settings IPC channels already exposed via electronAPI.invoke() generic interface

**Checkpoint**: ✅ Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Clear Configuration Architecture (Priority: P1) 🎯 MVP

**Goal**: Establish 3-layer configuration architecture with clear documentation so developers immediately know where to add new configuration values

**Independent Test**: Present a new developer with a configuration requirement (e.g., "add email notification preferences") and verify they can correctly identify where it belongs within 2 minutes of reading documentation

### Implementation for User Story 1

- [X] T013 [P] [US1] Update LamaConfig interface in main/config/lama-config.ts to add network.direct section with backward compatibility
- [X] T014 [P] [US1] DEFAULT_USER_SETTINGS export already exists in main/types/user-settings-types.ts
- [X] T015 [US1] getSettings() implementation already complete in UserSettingsManager (T006)
- [X] T016 [US1] updateSettings() implementation already complete in UserSettingsManager (T006)
- [X] T017 [P] [US1] Update CLAUDE.md with "Configuration Architecture" section documenting the 3 layers (bootstrap/user/entity)
- [X] T018 [P] [US1] Create quickstart.md in docs/config-quickstart.md (copied from specs)
- [X] T019 [US1] Decision tree flowchart already present in specs/022-specify-scripts-bash/quickstart.md
- [X] T020 [US1] Configuration layer examples and decision tree added to CLAUDE.md

**Checkpoint**: ✅ The 3-layer architecture is fully defined and documented. Developers can read documentation and correctly identify where new config belongs.

---

## Phase 4: User Story 3 - Data Migration Without Loss (Priority: P1)

**Goal**: Automatically migrate all existing user preferences (GlobalLLMSettings, WordCloudSettings) to the new unified structure without data loss

**Independent Test**: Create a LAMA instance with all old configuration types populated, upgrade to new system, verify all values correctly migrated to new unified structure

### Implementation for User Story 3

- [ ] T021 [P] [US3] Create migration script in main/migrations/migrate-global-llm-settings.ts implementing MigrateGlobalLLMSettings per research.md Decision 1
- [ ] T022 [P] [US3] Create migration script in main/migrations/migrate-word-cloud-settings.ts implementing MigrateWordCloudSettings per research.md Decision 2
- [ ] T023 [US3] Create migration orchestrator in main/migrations/migration-orchestrator.ts that runs all migrations with timeout and error handling
- [ ] T024 [US3] Integrate migration orchestrator into main/core/node-one-core.ts startup sequence after models are ready
- [ ] T025 [US3] Add migration logging with [Migration] prefix per migration-contract.ts behavior spec
- [ ] T026 [US3] Implement graceful fallback to defaults on migration failure per research.md Decision 5
- [ ] T027 [US3] Add migration idempotency check (skip if UserSettings already exists) per migration-contract.ts MIGRATION_BEHAVIOR

**Checkpoint**: At this point, migrations should run automatically on startup. All existing user data should be preserved in new UserSettings structure.

---

## Phase 5: User Story 2 - Unified User Preferences (Priority: P2)

**Goal**: All user preferences (AI, UI, proposals) sync reliably across instances via CHUM so user experience is consistent regardless of device

**Independent Test**: Set preferences on one instance, wait for CHUM sync, verify all preferences appear correctly on second instance without manual intervention

### Implementation for User Story 2

- [x] T028 [P] [US2] Update SettingsView.tsx in electron-ui/src/components/SettingsView.tsx to use useSettings hook instead of direct IPC (integrated with tab navigation)
- [x] T029 [P] [US2] Create AI Settings panel in SettingsView.tsx for all UserSettings.ai fields (temperature, maxTokens, defaultProvider, etc.)
- [x] T030 [P] [US2] Create UI Settings panel in SettingsView.tsx for theme and wordCloud preferences
- [x] T031 [P] [US2] Create Proposal Settings panel in SettingsView.tsx for matchWeight, recencyWeight, minJaccard, maxProposals
- [x] T032 [US2] Implement settings:updateAI IPC handler in main/ipc/handlers/user-settings.ts with validation (completed in Phase 2)
- [x] T033 [US2] Implement settings:updateUI IPC handler in main/ipc/handlers/user-settings.ts with validation (completed in Phase 2)
- [x] T034 [US2] Implement settings:updateProposals IPC handler in main/ipc/handlers/user-settings.ts with validation (completed in Phase 2)
- [ ] T035 [US2] Verify CHUM sync behavior for UserSettings (last-write-wins) per research.md Decision 3
- [x] T036 [US2] Add updatedAt timestamp update in UserSettingsManager.updateSettings() for sync tracking (completed in Phase 2)

**Checkpoint**: At this point, all user preferences should sync across instances via CHUM within 30 seconds. Settings UI should be fully functional.

---

## Phase 6: User Story 4 - Reduced Code Complexity (Priority: P3)

**Goal**: Consolidate configuration code so developers spend less time tracking down configuration bugs and more time building features

**Independent Test**: Measure lines of code in configuration-related files before and after refactoring, verify reduction of ~1000 lines

### Implementation for User Story 4

- [ ] T037 [P] [US4] Mark AISettingsManager as @deprecated in main/core/ai-settings-manager.ts with console warnings
- [ ] T038 [P] [US4] Mark ConnectionConfig as @deprecated in electron-ui/src/config/connection-config.ts with console warnings
- [ ] T039 [P] [US4] Mark word cloud IPC handlers as @deprecated in main/ipc/handlers/word-cloud-settings.ts
- [ ] T040 [US4] Create adapter layer in AISettingsManager delegating to UserSettingsManager per research.md Decision 6
- [ ] T041 [US4] Update all internal calls to AISettingsManager to use UserSettingsManager.updateAI() instead
- [ ] T042 [US4] Create migration guide in docs/config-migration-guide.md documenting deprecated APIs and replacements
- [ ] T043 [US4] Add deprecation timeline to migration guide (Release N, N+1, N+2) per research.md Decision 6
- [ ] T044 [US4] Count and document lines of code removed in migration guide (target: 800+ lines)
- [ ] T045 [US4] Update all references to ConnectionConfig in electron-ui/ to use LamaConfig.network.direct instead

**Checkpoint**: All deprecated APIs should have adapters and warnings. Migration guide should be complete. Code complexity should be measurably reduced.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, validation, and final cleanup

- [x] T046 [P] Add JSDoc comments to UserSettingsManager public methods with @example usage
- [x] T047 [P] Add JSDoc comments to IPC handlers documenting request/response schemas
- [ ] T048 Update specs/022-specify-scripts-bash/IMPLEMENTATION-STATUS.md with completion status and metrics
- [ ] T049 Run quickstart.md validation with new developer (measure time to identify config location)
- [ ] T050 [P] Add performance metrics logging for cache hit rate in UserSettingsManager
- [ ] T051 Verify rollback procedure documented in migration guide matches research.md Decision 5
- [x] T052 Add error boundary in SettingsView.tsx for graceful settings load failures
- [ ] T053 Update plan.md "Status" sections to mark all phases as COMPLETE

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 (Clear Architecture) can start after Foundational - No dependencies on other stories
  - US3 (Data Migration) can start after Foundational - Should complete after US1 for clarity
  - US2 (Unified Preferences) can start after Foundational - Integrates with US1, should verify after US3 migration works
  - US4 (Reduced Complexity) should complete after US1, US2, US3 - Depends on new system being functional
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P1)**: Can start after Foundational (Phase 2) - Benefits from US1 architecture being documented
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Should verify after US3 migration to ensure migrated data syncs
- **User Story 4 (P3)**: Should start after US1, US2, US3 complete - Cleanup depends on new system working

### Recommended Sequential Order

1. Phase 1: Setup
2. Phase 2: Foundational ⚠️ CRITICAL CHECKPOINT
3. Phase 3: US1 (Clear Architecture) → CHECKPOINT: Architecture documented
4. Phase 4: US3 (Data Migration) → CHECKPOINT: Migration working
5. Phase 5: US2 (Unified Preferences) → CHECKPOINT: CHUM sync verified
6. Phase 6: US4 (Reduced Complexity) → CHECKPOINT: Cleanup complete
7. Phase 7: Polish → FINAL CHECKPOINT

### Within Each User Story

- US1: Documentation and architecture tasks can run in parallel
- US3: Migration scripts can be developed in parallel, orchestrator depends on both
- US2: UI panels can be developed in parallel, IPC handlers after manager updates
- US4: Deprecation marking can run in parallel, adapter depends on deprecation markers

### Parallel Opportunities

- **Phase 1**: T001, T002, T003 can run in parallel (different files)
- **Phase 2**: T011, T012 can run after T006-T010 complete (UI layer after manager ready)
- **US1**: T013, T014, T017, T018 can run in parallel (different files)
- **US3**: T021, T022 can run in parallel (different migration scripts)
- **US2**: T028, T029, T030, T031 can run in parallel (different UI panels)
- **US4**: T037, T038, T039 can run in parallel (different deprecation markers)
- **Phase 7**: T046, T047, T050 can run in parallel (different documentation/logging)

---

## Parallel Example: User Story 1

```bash
# Launch all documentation tasks for User Story 1 together:
Task T013: "Update LamaConfig interface in main/config/lama-config.ts"
Task T014: "Add DEFAULT_USER_SETTINGS export to contracts/user-settings-types.ts"
Task T017: "Update CLAUDE.md with Configuration Architecture section"
Task T018: "Create quickstart.md in docs/config-quickstart.md"
```

---

## Parallel Example: User Story 3

```bash
# Launch both migration scripts in parallel:
Task T021: "Create migration script in main/migrations/migrate-global-llm-settings.ts"
Task T022: "Create migration script in main/migrations/migrate-word-cloud-settings.ts"
```

---

## Parallel Example: User Story 2

```bash
# Launch all UI panel tasks in parallel:
Task T028: "Update SettingsView.tsx to use useSettings hook"
Task T029: "Create AI Settings panel in SettingsView.tsx"
Task T030: "Create UI Settings panel in SettingsView.tsx"
Task T031: "Create Proposal Settings panel in SettingsView.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup → Type definitions and recipes ready
2. Complete Phase 2: Foundational → UserSettingsManager and IPC ready (CRITICAL)
3. Complete Phase 3: User Story 1 → Architecture documented
4. **STOP and VALIDATE**: Test that new developer can identify config location in <2 minutes
5. Ready for next story

### Incremental Delivery

1. **Foundation** (Phase 1 + 2): Type system and core manager ready
2. **+ US1** (Phase 3): Architecture documented and clear → VALIDATE independently
3. **+ US3** (Phase 4): Migration working, old data preserved → VALIDATE independently
4. **+ US2** (Phase 5): Settings sync across instances → VALIDATE independently
5. **+ US4** (Phase 6): Code cleaned up, deprecated APIs warned → VALIDATE independently
6. **Polish** (Phase 7): Documentation complete, metrics added

Each phase adds value without breaking previous phases.

### Parallel Team Strategy

With multiple developers:

1. **Team**: Complete Setup + Foundational together (Phases 1-2)
2. **Once Foundational done**:
   - Developer A: User Story 1 (Architecture docs)
   - Developer B: User Story 3 (Migration scripts)
   - Developer C: User Story 2 (UI integration) - starts after A finishes
3. **Finally**: Developer D handles User Story 4 (Cleanup) after all others complete

---

## Success Criteria Mapping

| Success Criteria | Verified By Task(s) | How to Measure |
|-----------------|-------------------|----------------|
| SC-001: Developers identify config location in <2 min | T049 | Run validation with 3+ new developers |
| SC-002: 800+ lines of code reduced | T044 | Count LOC before/after in config files |
| SC-003: 100% preferences preserved during migration | T021-T027 | Automated migration verification |
| SC-004: Settings sync within 30s via CHUM | T035 | Multi-instance sync test |
| SC-005: Zero data loss incidents in first month | T026, T027 | Track issue reports post-release |
| SC-006: Documentation quality score 8+/10 | T017-T020, T042-T043 | Team survey after 2 weeks |
| SC-007: Onboarding time reduced to <15 min | T049 | Quiz new developers on config system |

---

## Notes

- **[P] tasks** = different files, no dependencies, can run in parallel
- **[Story] label** = maps task to specific user story for traceability (US1, US2, US3, US4)
- **No tests explicitly requested** = spec.md doesn't require TDD, focusing on implementation only
- **Electron structure** = main/ for Node.js, electron-ui/ for React UI
- **Each user story independently testable** = Verify checkpoints before moving to next story
- **Commit after each task** = or logical group for rollback capability
- **Stop at any checkpoint** = to validate story independently before proceeding
- **Migration preserves old data** = GlobalLLMSettings and WordCloudSettings NOT deleted (rollback safety)
- **2-release deprecation cycle** = Warnings in Release N, removal in Release N+2

---

## Task Count Summary

- **Phase 1 (Setup)**: 5 tasks
- **Phase 2 (Foundational)**: 7 tasks ⚠️ CRITICAL
- **Phase 3 (US1 - Clear Architecture)**: 8 tasks 🎯 MVP
- **Phase 4 (US3 - Data Migration)**: 7 tasks
- **Phase 5 (US2 - Unified Preferences)**: 9 tasks
- **Phase 6 (US4 - Reduced Complexity)**: 9 tasks
- **Phase 7 (Polish)**: 8 tasks

**Total**: 53 tasks

**Parallel Opportunities**: 18 tasks marked [P] across all phases

**MVP Scope** (recommended first delivery):
- Phase 1: Setup (5 tasks)
- Phase 2: Foundational (7 tasks)
- Phase 3: US1 (8 tasks)
- **MVP Total**: 20 tasks → Clear, documented 3-layer architecture

**Full Feature Scope**: All 53 tasks → Complete configuration consolidation with migration, sync, and cleanup
