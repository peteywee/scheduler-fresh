/**
 * v2 Refactor Orchestrated Plan
 * Rules:
 *  - status may move from 'pending' -> 'in_progress' -> 'review' -> 'done'
 *  - 'done' ONLY if: lint, format:check, typecheck, test:run, test:rules, build all green + no warnings
 *  - Dependencies must be satisfied (all prereqs === done) before starting a scope unless allowParallel=true
 *  - Adjustments require comment with timestamp (do not silently mutate intent)
 */

export type Status = 'pending' | 'in_progress' | 'review' | 'blocked' | 'done';

export interface Task {
  id: string;
  title: string;
  detail: string;
  status: Status;
  dependsOn?: string[];
  scope: string;
  gating?: boolean;
  allowParallel?: boolean;
  outputs?: string[];         // files or artifacts
  verify: string[];           // commands or assertions
  notes?: string;
}

export interface Scope {
  id: string;
  name: string;
  objective: string;
  tasks: string[];            // task ids
  critical?: boolean;
  parallelizable?: boolean;
  doneWhen: string[];         // must all be true or tasks all done
}

export interface Plan {
  version: string;
  greenDefinition: string[];
  scopes: Scope[];
  tasks: Task[];
  lastUpdated: string;
}

const GREEN_DEFINITION = [
  'pnpm lint (0 errors, 0 warnings)',
  'pnpm format:check (clean)',
  'pnpm typecheck (0 errors)',
  'pnpm test:run (all pass)',
  'pnpm test:rules (all pass)',
  'pnpm build (succeeds)',
  'node scripts/watchman-package-drift.ts returns OK'
];

// Scopes (grouped for minimal cross-churn)
const SCOPES: Scope[] = [
  {
    id: 'scope.baseline',
    name: 'Baseline Integrity & CI',
    objective: 'Enforce zero-warn build, CI stages, branch protection foundation',
    tasks: ['task.tag_baseline','task.ci_split','task.add_format_check','task.eslint_zero','task.watchman_script'],
    critical: true,
    parallelizable: false,
    doneWhen: ['All tasks done']
  },
  {
    id: 'scope.schema_rules',
    name: 'Universal Schemas + Rules',
    objective: 'Install new multi-tenant Zod schemas + Firestore & Storage rules rewrite + tests',
    tasks: [
      'task.prune_v1','task.blank_types',
      'task.add_universal_types','task.replace_rules',
      'task.rules_tests','task.storage_rules'
    ],
    critical: true,
    parallelizable: false,
    doneWhen: ['All tasks done']
  },
  {
    id: 'scope.auth_tokens',
    name: 'Onboarding Tokens & Claims',
    objective: 'Token generation & validation + claims function path',
    tasks: [
      'task.gen_token_api','task.validate_token_api',
      'task.claims_function','task.staff_join_flow_test'
    ],
    critical: true,
    parallelizable: false,
    doneWhen: ['All tasks done']
  },
  {
    id: 'scope.ledger_replication',
    name: 'Ledger Replication Core',
    objective: 'Attendance → approved → idempotent ledger line replication',
    tasks: [
      'task.attendance_schema_align','task.replicate_function',
      'task.replicate_idempotency','task.ledger_rules_tests'
    ],
    critical: true,
    parallelizable: false,
    doneWhen: ['All tasks done']
  },
  {
    id: 'scope.pwa_offline',
    name: 'PWA & Offline Core',
    objective: 'Manifest, SW caching strategies, offline queue for clock actions',
    tasks: [
      'task.manifest','task.service_worker',
      'task.indexeddb_queue','task.offline_banner'
    ],
    parallelizable: true,
    doneWhen: ['All tasks done']
  },
  {
    id: 'scope.scheduler_ui',
    name: 'Scheduler Engine Skeleton',
    objective: 'Draggable schedule grid + shift creation placeholder',
    tasks: [
      'task.scheduler_grid','task.dnd_implementation',
      'task.shift_api_stub','task.conflict_placeholder'
    ],
    parallelizable: true,
    doneWhen: ['All tasks done']
  },
  {
    id: 'scope.security_hardening',
    name: 'Security Hardening',
    objective: 'Token replay defense, audit log, boundary assertions',
    tasks: [
      'task.token_replay_guard','task.audit_log_collection',
      'task.org_boundary_middleware','task.parent_no_write_assert'
    ],
    parallelizable: true,
    doneWhen: ['All tasks done']
  },
  {
    id: 'scope.testing_expansion',
    name: 'Testing Expansion',
    objective: 'Coverage for negative rules, replication idempotency, offline queue replay',
    tasks: [
      'task.test_rules_negative','task.test_replication_no_dup',
      'task.test_offline_queue','task.test_token_expiry'
    ],
    parallelizable: true,
    doneWhen: ['All tasks done']
  },
  {
    id: 'scope.performance',
    name: 'Performance & Bundling',
    objective: 'Enable Turbopack dev, size limits, bundle analysis',
    tasks: [
      'task.enable_turbopack','task.size_limit',
      'task.bundle_report','task.virtualization_plan'
    ],
    parallelizable: true,
    doneWhen: ['All tasks done']
  },
  {
    id: 'scope.docs_dx',
    name: 'Docs & DX',
    objective: 'Architecture, PWA offline strategy, API error contract, replication doc',
    tasks: [
      'task.doc_architecture','task.doc_pwa_offline',
      'task.doc_api_errors','task.doc_replication'
    ],
    parallelizable: true,
    doneWhen: ['All tasks done']
  },
  {
    id: 'scope.release_prep',
    name: 'Release Prep',
    objective: 'Final green verification + tag + merge instructions',
    tasks: ['task.final_verification','task.version_bump','task.create_tag','task.merge_main_checklist'],
    parallelizable: false,
    doneWhen: ['All tasks done']
  }
];

const TASKS: Task[] = [
  // Baseline
  {
    id: 'task.tag_baseline',
    title: 'Tag baseline v0.1.0',
    detail: 'Create signed annotated tag before refactor start',
    status: 'pending',
    scope: 'scope.baseline',
    gating: true,
    verify: ['git tag shows v0.1.0-baseline pushed'],
    outputs: ['git tag v0.1.0-baseline']
  },
  {
    id: 'task.ci_split',
    title: 'CI split jobs',
    detail: 'Add lint, format:check, test, build jobs with dependencies',
    status: 'pending',
    scope: 'scope.baseline',
    verify: ['CI run shows 4 jobs passing'],
    outputs: ['.github/workflows/ci.yml']
  },
  {
    id: 'task.add_format_check',
    title: 'Add format:check script',
    detail: 'Add "format:check": "prettier . --check" to package.json',
    status: 'pending',
    scope: 'scope.baseline',
    verify: ['pnpm run format:check passes']
  },
  {
    id: 'task.eslint_zero',
    title: 'Zero warning ESLint',
    detail: 'Resolve all existing warnings; enforce --max-warnings=0',
    status: 'pending',
    scope: 'scope.baseline',
    verify: ['pnpm lint returns 0 warnings']
  },
  {
    id: 'task.watchman_script',
    title: 'Package drift watchman',
    detail: 'Script compares package.json deps vs lock; flags drift, unused, missing scripts',
    status: 'pending',
    scope: 'scope.baseline',
    verify: ['node scripts/watchman-package-drift.ts outputs OK'],
    outputs: ['scripts/watchman-package-drift.ts']
  },

  // Schema & Rules
  {
    id: 'task.prune_v1',
    title: 'Remove v1 API dirs',
    detail: 'Delete src/app/api/invites & src/app/api/orgs + invites page',
    status: 'pending',
    scope: 'scope.schema_rules',
    verify: ['grep -R "api/invites" returns none']
  },
  {
    id: 'task.blank_types',
    title: 'Blank types.ts',
    detail: 'Clear legacy content prior to universal definitions',
    status: 'pending',
    scope: 'scope.schema_rules',
    verify: ['types.ts empty commit before new schemas']
  },
  {
    id: 'task.add_universal_types',
    title: 'Add universal Zod schemas',
    detail: 'Implement CorporateAccountSchema, OrganizationSchema, StaffSchema, etc.',
    status: 'pending',
    scope: 'scope.schema_rules',
    verify: ['tsc passes', 'schemas exported']
  },
  {
    id: 'task.replace_rules',
    title: 'Replace firestore.rules',
    detail: 'Install new hub/spoke access model',
    status: 'pending',
    scope: 'scope.schema_rules',
    verify: ['rules tests pass']
  },
  {
    id: 'task.rules_tests',
    title: 'Rules test suite',
    detail: 'Positive & negative multi-tenant isolation tests',
    status: 'pending',
    scope: 'scope.schema_rules',
    verify: ['pnpm test:rules includes new cases']
  },
  {
    id: 'task.storage_rules',
    title: 'Replace storage.rules',
    detail: 'Certification file path rule, org_admin or staff self',
    status: 'pending',
    scope: 'scope.schema_rules',
    verify: ['Upload test passes; unauthorized denied']
  },

  // Onboarding Tokens
  {
    id: 'task.gen_token_api',
    title: 'Generate token API',
    detail: 'POST /api/tokens/generate with STAFF_JOIN / ORG_PARTNER',
    status: 'pending',
    scope: 'scope.auth_tokens',
    verify: ['unit + integration tests pass']
  },
  {
    id: 'task.validate_token_api',
    title: 'Validate token API',
    detail: 'GET /api/tokens/validate?backupId=',
    status: 'pending',
    scope: 'scope.auth_tokens',
    verify: ['happy + expired + used tests']
  },
  {
    id: 'task.claims_function',
    title: 'Claims assignment function',
    detail: 'Functions to set custom claims upon org/corporate creation',
    status: 'pending',
    scope: 'scope.auth_tokens',
    verify: ['function deploy simulation passes']
  },
  {
    id: 'task.staff_join_flow_test',
    title: 'Staff join integration test',
    detail: 'End-to-end token → account → staff doc → claims',
    status: 'pending',
    scope: 'scope.auth_tokens',
    verify: ['playwright or integration test green']
  },

  // Ledger Replication
  {
    id: 'task.attendance_schema_align',
    title: 'Attendance schema alignment',
    detail: 'Ensure attendance doc fields match replication expectation',
    status: 'pending',
    scope: 'scope.ledger_replication',
    verify: ['tsc + tests referencing fields']
  },
  {
    id: 'task.replicate_function',
    title: 'replicateAttendanceToLedger function',
    detail: 'Trigger on approved status transition',
    status: 'pending',
    scope: 'scope.ledger_replication',
    verify: ['unit + emulator test']
  },
  {
    id: 'task.replicate_idempotency',
    title: 'Idempotency guard',
    detail: 'Deterministic ledger line ID or existence check',
    status: 'pending',
    scope: 'scope.ledger_replication',
    verify: ['double approval test yields single line']
  },
  {
    id: 'task.ledger_rules_tests',
    title: 'Parent ledger read tests',
    detail: 'Corporate admin can read; no client writes',
    status: 'pending',
    scope: 'scope.ledger_replication',
    verify: ['rules negative write test passes']
  },

  // PWA & Offline
  {
    id: 'task.manifest',
    title: 'Manifest finalize',
    detail: 'Add proper icons, theme, standalone config',
    status: 'pending',
    scope: 'scope.pwa_offline',
    verify: ['Lighthouse PWA score ≥ 90']
  },
  {
    id: 'task.service_worker',
    title: 'Service worker caching',
    detail: 'NetworkFirst for API, StaleWhileRevalidate static, queue sync hooks',
    status: 'pending',
    scope: 'scope.pwa_offline',
    verify: ['offline resource fetch test']
  },
  {
    id: 'task.indexeddb_queue',
    title: 'IndexedDB action queue',
    detail: 'Offline clock-in/out queue + replay',
    status: 'pending',
    scope: 'scope.pwa_offline',
    verify: ['test_offline_queue passes']
  },
  {
    id: 'task.offline_banner',
    title: 'Connectivity guard UI',
    detail: 'Banner + toast when offline / degraded',
    status: 'pending',
    scope: 'scope.pwa_offline',
    verify: ['manually verify / network throttle']
  },

  // Scheduler
  {
    id: 'task.scheduler_grid',
    title: 'Scheduler grid skeleton',
    detail: 'Week view time slots (RSC + client island)',
    status: 'pending',
    scope: 'scope.scheduler_ui',
    verify: ['renders placeholder shifts']
  },
  {
    id: 'task.dnd_implementation',
    title: 'Drag and drop base',
    detail: '@dnd-kit integration for shift placement',
    status: 'pending',
    scope: 'scope.scheduler_ui',
    verify: ['drag test passes']
  },
  {
    id: 'task.shift_api_stub',
    title: 'Shift API stub',
    detail: 'Create shift endpoint (org admin only)',
    status: 'pending',
    scope: 'scope.scheduler_ui',
    verify: ['API tests passing']
  },
  {
    id: 'task.conflict_placeholder',
    title: 'Conflict detection stub',
    detail: 'Minimal overlap pre-check before create',
    status: 'pending',
    scope: 'scope.scheduler_ui',
    verify: ['unit test: overlap flagged']
  },

  // Security Hardening
  {
    id: 'task.token_replay_guard',
    title: 'Token replay guard',
    detail: 'issuedAt + maxAge + single-use enforcement',
    status: 'pending',
    scope: 'scope.security_hardening',
    verify: ['expired + reused token tests']
  },
  {
    id: 'task.audit_log_collection',
    title: 'Audit log append-only',
    detail: 'Collection orgs/{orgId}/audit for membership changes',
    status: 'pending',
    scope: 'scope.security_hardening',
    verify: ['write only via server test']
  },
  {
    id: 'task.org_boundary_middleware',
    title: 'Org boundary middleware',
    detail: 'Middleware verifying claim orgId vs path orgId',
    status: 'pending',
    scope: 'scope.security_hardening',
    verify: ['forged orgId test denied']
  },
  {
    id: 'task.parent_no_write_assert',
    title: 'Parent ledger client write deny test',
    detail: 'Explicit negative attempt from UI-layer client',
    status: 'pending',
    scope: 'scope.security_hardening',
    verify: ['rules negative passes']
  },

  // Testing Expansion
  {
    id: 'task.test_rules_negative',
    title: 'Cross-tenant negative rules',
    detail: 'Ensure isolation enforced',
    status: 'pending',
    scope: 'scope.testing_expansion',
    verify: ['pnpm test:rules includes new suite']
  },
  {
    id: 'task.test_replication_no_dup',
    title: 'Replication duplication test',
    detail: 'Prevent double ledger on repeated updates',
    status: 'pending',
    scope: 'scope.testing_expansion',
    verify: ['single ledger line assert']
  },
  {
    id: 'task.test_offline_queue',
    title: 'Offline queue replay test',
    detail: 'Simulate offline clock actions persisted then flushed',
    status: 'pending',
    scope: 'scope.testing_expansion',
    verify: ['Vitest offline scenario green']
  },
  {
    id: 'task.test_token_expiry',
    title: 'Token expiry test',
    detail: 'Expired returns 410 / error contract',
    status: 'pending',
    scope: 'scope.testing_expansion',
    verify: ['integration test passes']
  },

  // Performance
  {
    id: 'task.enable_turbopack',
    title: 'Enable Turbopack dev',
    detail: 'Add NEXT_TELEMETRY_DISABLED & dev command flag if needed',
    status: 'pending',
    scope: 'scope.performance',
    verify: ['pnpm dev logs turbopack']
  },
  {
    id: 'task.size_limit',
    title: 'Bundle size limits',
    detail: 'Add size-limit config and CI job',
    status: 'pending',
    scope: 'scope.performance',
    verify: ['pnpm size-limit passes']
  },
  {
    id: 'task.bundle_report',
    title: 'Bundle analysis report',
    detail: 'Add script using next build + analyze',
    status: 'pending',
    scope: 'scope.performance',
    verify: ['report artifact generated']
  },
  {
    id: 'task.virtualization_plan',
    title: 'Virtualization plan doc',
    detail: 'Document thresholds for shift virtualization',
    status: 'pending',
    scope: 'scope.performance',
    verify: ['doc committed']
  },

  // Docs & DX
  {
    id: 'task.doc_architecture',
    title: 'Architecture doc update',
    detail: 'Reflect hub/spoke + universal schemas',
    status: 'pending',
    scope: 'scope.docs_dx',
    verify: ['docs/architecture.md updated']
  },
  {
    id: 'task.doc_pwa_offline',
    title: 'PWA offline strategy doc',
    detail: 'Caching table + queue design',
    status: 'pending',
    scope: 'scope.docs_dx',
    verify: ['docs/pwa-offline.md present']
  },
  {
    id: 'task.doc_api_errors',
    title: 'API error contract doc',
    detail: 'Uniform JSON error shape documented',
    status: 'pending',
    scope: 'scope.docs_dx',
    verify: ['docs/api-errors.md present']
  },
  {
    id: 'task.doc_replication',
    title: 'Replication function doc',
    detail: 'Idempotency + anonymity contract',
    status: 'pending',
    scope: 'scope.docs_dx',
    verify: ['docs/functions/replication.md present']
  },

  // Release Prep
  {
    id: 'task.final_verification',
    title: 'Final full green suite',
    detail: 'Run all commands + Lighthouse PWA ≥ 90',
    status: 'pending',
    scope: 'scope.release_prep',
    verify: ['all green logs archived']
  },
  {
    id: 'task.version_bump',
    title: 'Version bump v2.0.0-rc',
    detail: 'Update package.json version + CHANGELOG',
    status: 'pending',
    scope: 'scope.release_prep',
    verify: ['git diff shows version increment']
  },
  {
    id: 'task.create_tag',
    title: 'Create release tag',
    detail: 'Signed annotated tag v2.0.0-rc',
    status: 'pending',
    scope: 'scope.release_prep',
    verify: ['git tag shows v2.0.0-rc pushed']
  },
  {
    id: 'task.merge_main_checklist',
    title: 'Merge checklist executed',
    detail: 'PR with checklist confirming all gates',
    status: 'pending',
    scope: 'scope.release_prep',
    verify: ['PR merged successfully']
  }
];

export function getPlan(): Plan {
  return {
    version: '1.0.0',
    greenDefinition: GREEN_DEFINITION,
    scopes: SCOPES,
    tasks: TASKS,
    lastUpdated: new Date().toISOString()
  };
}

// Utility (optional) to fetch ready tasks (no unmet dependencies)
export function getUnblockedTasks(): Task[] {
  const byId = new Map(TASKS.map(t => [t.id, t]));
  return TASKS.filter(t => {
    if (t.status !== 'pending') return false;
    if (!t.dependsOn || t.dependsOn.length === 0) return true;
    return t.dependsOn.every(d => byId.get(d)?.status === 'done');
  });
}
