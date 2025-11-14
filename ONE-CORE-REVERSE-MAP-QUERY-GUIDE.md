# ONE.core Reverse Map Query Guide

Practical guide for implementing queries using ONE.core's automatic reverse map system.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [How Reverse Maps Work](#how-reverse-maps-work)
3. [Configuring Reverse Maps](#configuring-reverse-maps)
4. [Query API](#query-api)
5. [Implementation Examples](#implementation-examples)
6. [Best Practices](#best-practices)
7. [Assembly Query Implementation](#assembly-query-implementation)

---

## Architecture Overview

### What Are Reverse Maps?

Reverse maps are **automatic indices** created by ONE.core when storing versioned/unversioned objects. They track which objects reference a target object.

**Key Characteristics**:
- ✅ **Automatic** - Created during `storeVersionedObject()` / `storeUnversionedObject()`
- ✅ **Type-safe** - TypeScript knows which types can reference which
- ✅ **Efficient** - File-based storage with fast lookups
- ✅ **Queryable** - Direct API for finding referencing objects

### Architecture Layers

```
┌─────────────────────────────────────────┐
│   Application (GroupPlan, AssemblyPlan) │
│   - Business logic                       │
│   - Query methods                        │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│   ONE.core Reverse Map Query API        │
│   - getAllEntries()                      │
│   - getAllIdObjectEntries()              │
│   - getOnlyLatestReferencingObjsHash()   │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│   ONE.core Storage                       │
│   - Reverse map files (automatic)        │
│   - Object storage                       │
└──────────────────────────────────────────┘
```

**What cube.core Is**:
- **NOT** a query infrastructure layer
- **IS** an OLAP dimensional query system built **on top** of ONE.core
- Provides multi-dimensional queries (who/where/when)
- Stores query results as ONE objects
- Complementary to reverse map queries

---

## How Reverse Maps Work

### Storage Format

Reverse maps are stored in the `reverse-maps/` directory:

```
reverse-maps/
├── {targetHash}.H.to.{type}    # Unversioned object references
└── {targetHash}.I.to.{type}    # Versioned object references (IdHash)
```

**File Format** (one line per reference):
```
targetHash,referencingIdHash,referencingHash
targetHash,referencingIdHash,referencingHash
...
```

**Example**:
```
# reverse-maps/abc123...def.I.to.Assembly
abc123...def,xyz789...ghi,mno456...pqr
abc123...def,uvw012...stu,jkl345...vwx
```

### When Are They Created?

Reverse maps are created **automatically** when:
1. Object is stored with `storeVersionedObject()` or `storeUnversionedObject()`
2. Object type has reverse map configuration
3. Object contains properties configured for reverse mapping

**No manual management needed!**

---

## Configuring Reverse Maps

### Step 1: Create Reverse Map Configuration

Create `recipes/reversemaps.ts` in your package:

```typescript
// assembly.core/recipes/reversemaps.ts
import type {
  ReverseMapTypeMap,
  ReverseMapForIdObjectsTypeMap
} from '@refinio/one.core/lib/recipes.js';

/**
 * Reverse maps for unversioned objects
 * Map<ObjectType, PropertyNames[]>
 */
export const AssemblyReverseMaps: ReverseMapTypeMap = new Map([
  // Track which Assemblies reference which Stories/Plans
  ['Assembly', ['storyRef', 'planRef']]
]);

/**
 * Reverse maps for versioned objects (IdHash references)
 * Map<ObjectType, PropertyNames[]>
 */
export const AssemblyReverseMapsForIdObjects: ReverseMapForIdObjectsTypeMap = new Map([
  // Track which Assemblies reference which versioned objects
  ['Assembly', ['storyRef', 'planRef', 'owner']]
]);
```

### Step 2: Export from Package Index

```typescript
// assembly.core/index.ts
export {
  AssemblyReverseMaps,
  AssemblyReverseMapsForIdObjects
} from './recipes/reversemaps.js';
```

### Step 3: Register During ONE.core Initialization

```typescript
// lama.cube/main/core/node-one-core.ts
import { AssemblyReverseMaps, AssemblyReverseMapsForIdObjects } from '@assembly/core';
import { MultiUser } from '@refinio/one.core/lib/multi-user.js';

const multiUser = new MultiUser({
  recipes: [
    AssemblyRecipe,
    StoryRecipe,
    PlanRecipe
  ],
  reverseMaps: new Map([
    ...AssemblyReverseMaps,
    // ... other reverse maps
  ]),
  reverseMapsForIdObjects: new Map([
    ...AssemblyReverseMapsForIdObjects,
    // ... other reverse maps
  ])
});
```

**Important**: Reverse maps must be registered **before** storing objects!

---

## Query API

### Core Functions

All functions are in `@refinio/one.core/lib/reverse-map-query.js`:

#### 1. `getAllEntries()` - Query All References

Get **all** object hashes that reference a target (for unversioned objects):

```typescript
async function getAllEntries<T>(
  targetHash: SHA256Hash | SHA256IdHash,
  typeOfReferencingObj: T
): Promise<Array<SHA256Hash<OneObjectInterfaces[T]>>>
```

**Example**:
```typescript
import { getAllEntries } from '@refinio/one.core/lib/reverse-map-query.js';

// Find all Assembly objects that reference a Story
const assemblyHashes = await getAllEntries(storyIdHash, 'Assembly');
// Returns: [hash1, hash2, hash3, ...]
```

#### 2. `getAllIdObjectEntries()` - Query Versioned References

Get **all** IdHashes of versioned objects that reference a target:

```typescript
async function getAllIdObjectEntries<T>(
  targetHash: SHA256Hash | SHA256IdHash,
  typeOfReferencingObj: T
): Promise<Array<SHA256IdHash<OneVersionedObjectInterfaces[T]>>>
```

**Example**:
```typescript
import { getAllIdObjectEntries } from '@refinio/one.core/lib/reverse-map-query.js';

// Find all Assembly IdHashes that reference a Person (owner)
const assemblyIdHashes = await getAllIdObjectEntries(personIdHash, 'Assembly');
// Returns: [idHash1, idHash2, idHash3, ...]
```

#### 3. `getOnlyLatestReferencingObjsHash()` - Latest Versions Only

Get **only latest versions** of versioned objects (filters out old versions):

```typescript
async function getOnlyLatestReferencingObjsHash<T>(
  targetHash: SHA256Hash | SHA256IdHash,
  typeOfReferencingObj: T,
  createdAfter?: number
): Promise<Array<SHA256Hash<OneVersionedObjectInterfaces[T]>>>
```

**Example**:
```typescript
import { getOnlyLatestReferencingObjsHash } from '@refinio/one.core/lib/reverse-map-query.js';

// Find latest Assembly versions for a Story (ignore old versions)
const latestHashes = await getOnlyLatestReferencingObjsHash(storyIdHash, 'Assembly');
```

#### 4. `getOnlyLatestReferencingObjsHashAndId()` - With Metadata

Get latest versions **with metadata** (hash, idHash, timestamp):

```typescript
async function getOnlyLatestReferencingObjsHashAndId<T>(
  targetHash: SHA256Hash | SHA256IdHash,
  typeOfReferencingObj: T,
  createdAfter?: number
): Promise<Array<HashAndIdHashAndTimestamp<T>>>
```

**Example**:
```typescript
import { getOnlyLatestReferencingObjsHashAndId } from '@refinio/one.core/lib/reverse-map-query.js';

const results = await getOnlyLatestReferencingObjsHashAndId(storyIdHash, 'Assembly');
// Returns: [
//   { hash: '...', idHash: '...', timestamp: 1234567890 },
//   { hash: '...', idHash: '...', timestamp: 1234567891 }
// ]
```

---

## Implementation Examples

### Example 1: Query LLM Objects by Owner

From `lama.browser/browser-ui/src/model/Model.ts`:

```typescript
import { getAllEntries } from '@refinio/one.core/lib/reverse-map-query.js';
import { getObject } from '@refinio/one.core/lib/storage-unversioned-objects.js';

// Query all LLM objects owned by a person
async function* queryAllLLMObjects() {
  const myId = await leuteModel.myMainIdentity();

  // Get all LLM object hashes that reference this person
  const llmEntries = await getAllEntries(myId, 'LLM');
  console.log(`Found ${llmEntries.length} LLM entries`);

  // Load each LLM object
  for (const entry of llmEntries) {
    const llmObject = await getObject(entry.hash);
    if (llmObject && llmObject.$type$ === 'LLM') {
      yield llmObject;
    }
  }
}
```

### Example 2: Find TrustRelationships by Person

From `trust.core/models/TrustModel.ts`:

```typescript
import { getAllEntries } from '@refinio/one.core/lib/reverse-map-query.js';

// Find all TrustRelationship objects for a person
const relationshipHashes = await getAllEntries(personId, 'TrustRelationship');

// Load and process each relationship
for (const hash of relationshipHashes) {
  const relationship = await getObject(hash);
  // Process relationship...
}
```

### Example 3: Find Keys by Owner

From `connection.core/src/plans/TrustPlan.ts`:

```typescript
import { getAllEntries } from '@refinio/one.core/lib/reverse-map-query.js';

// Find Keys objects owned by a remote person
const keyHashes = await getAllEntries(remotePersonId, 'Keys');

if (keyHashes.length > 0) {
  const keys = await getObject(keyHashes[0]);
  // Use keys...
}
```

---

## Best Practices

### 1. Always Load Objects After Query

Reverse map queries return **hashes**, not objects:

```typescript
// ❌ BAD - hashes are not objects
const hashes = await getAllEntries(targetId, 'Assembly');
console.log(hashes[0].domain); // ERROR: hash is a string!

// ✅ GOOD - load objects from hashes
const hashes = await getAllEntries(targetId, 'Assembly');
for (const hash of hashes) {
  const assembly = await getObject(hash);
  console.log(assembly.domain); // Works!
}
```

### 2. Use Latest-Only Queries for Versioned Objects

Avoid processing old versions:

```typescript
// ❌ BAD - returns ALL versions (including old ones)
const allHashes = await getAllEntries(storyId, 'Assembly');

// ✅ GOOD - returns only latest versions
const latestHashes = await getOnlyLatestReferencingObjsHash(storyId, 'Assembly');
```

### 3. Only Index Properties You Need to Query

Don't index everything - only queryable properties:

```typescript
// ❌ BAD - indexing inline objects (can't query by these)
export const BadReverseMaps = new Map([
  ['Assembly', ['supply', 'demand', 'metadata']]  // These are inline!
]);

// ✅ GOOD - only index reference properties
export const GoodReverseMaps = new Map([
  ['Assembly', ['storyRef', 'planRef', 'owner']]  // These are references
]);
```

### 4. Handle Empty Results

Always check for empty results:

```typescript
const hashes = await getAllEntries(targetId, 'Assembly');

if (hashes.length === 0) {
  console.log('No Assemblies found');
  return [];
}

// Process results...
```

### 5. Use Type-Safe Queries

TypeScript knows which types can reference which:

```typescript
// ✅ Type-safe - Assembly can reference Story
const assemblies = await getAllEntries(storyIdHash, 'Assembly');

// ❌ Type error - Person cannot reference Assembly (no reverse map)
const people = await getAllEntries(assemblyIdHash, 'Person');
```

---

## Assembly Query Implementation

### Complete Implementation for AssemblyPlan

Here's a production-ready Assembly query implementation:

#### 1. Configure Reverse Maps

```typescript
// assembly.core/recipes/reversemaps.ts
import type {
  ReverseMapTypeMap,
  ReverseMapForIdObjectsTypeMap
} from '@refinio/one.core/lib/recipes.js';

/**
 * Reverse maps for Assembly queries
 *
 * Enables querying Assemblies by:
 * - storyRef: Find Assemblies for a specific Story
 * - planRef: Find Assemblies for a specific Plan
 * - owner: Find Assemblies owned by a Person
 */
export const AssemblyReverseMaps: ReverseMapTypeMap = new Map([
  ['Assembly', ['storyRef', 'planRef']]
]);

export const AssemblyReverseMapsForIdObjects: ReverseMapForIdObjectsTypeMap = new Map([
  ['Assembly', ['storyRef', 'planRef', 'owner']]
]);
```

#### 2. Export from assembly.core

```typescript
// assembly.core/index.ts
export {
  AssemblyReverseMaps,
  AssemblyReverseMapsForIdObjects
} from './recipes/reversemaps.js';

export { AssemblyRecipe } from './recipes/AssemblyRecipe.js';
export type { Assembly } from './recipes/AssemblyRecipe.js';
```

#### 3. Register in ONE.core Initialization

```typescript
// lama.cube/main/core/node-one-core.ts
import {
  AssemblyRecipe,
  AssemblyReverseMaps,
  AssemblyReverseMapsForIdObjects
} from '@assembly/core';

const multiUser = new MultiUser({
  recipes: [
    AssemblyRecipe,
    StoryRecipe,
    PlanRecipe,
    // ... other recipes
  ],
  reverseMaps: new Map([
    ...AssemblyReverseMaps,
    // ... other reverse maps
  ]),
  reverseMapsForIdObjects: new Map([
    ...AssemblyReverseMapsForIdObjects,
    // ... other reverse maps
  ])
});
```

#### 4. Implement Query Methods in AssemblyPlan

```typescript
// assembly.core/plans/AssemblyPlan.ts
import type { SHA256Hash, SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import type { Assembly } from '../recipes/AssemblyRecipe.js';
import type { Story } from '@story/core';
import type { Plan } from '@plan/core';

/**
 * AssemblyPlan - Query and manage Assemblies
 */
export class AssemblyPlan {
  private getAllEntries: typeof import('@refinio/one.core/lib/reverse-map-query.js').getAllEntries;
  private getOnlyLatestReferencingObjsHash: typeof import('@refinio/one.core/lib/reverse-map-query.js').getOnlyLatestReferencingObjsHash;
  private getObject: typeof import('@refinio/one.core/lib/storage-unversioned-objects.js').getObject;

  constructor(deps: {
    getAllEntries: typeof import('@refinio/one.core/lib/reverse-map-query.js').getAllEntries;
    getOnlyLatestReferencingObjsHash: typeof import('@refinio/one.core/lib/reverse-map-query.js').getOnlyLatestReferencingObjsHash;
    getObject: typeof import('@refinio/one.core/lib/storage-unversioned-objects.js').getObject;
  }) {
    this.getAllEntries = deps.getAllEntries;
    this.getOnlyLatestReferencingObjsHash = deps.getOnlyLatestReferencingObjsHash;
    this.getObject = deps.getObject;
  }

  /**
   * Find all Assemblies that reference a specific Story
   *
   * @param storyIdHash - Story ID hash to query
   * @returns Array of Assembly objects
   */
  async findAssembliesByStory(
    storyIdHash: SHA256IdHash<Story>
  ): Promise<Assembly[]> {
    // Get latest Assembly hashes (ignore old versions)
    const assemblyHashes = await this.getOnlyLatestReferencingObjsHash(
      storyIdHash,
      'Assembly'
    );

    console.log(`[AssemblyPlan] Found ${assemblyHashes.length} Assemblies for Story ${storyIdHash.substring(0, 8)}...`);

    // Load Assembly objects
    const assemblies: Assembly[] = [];
    for (const hash of assemblyHashes) {
      const assembly = await this.getObject(hash);
      if (assembly && assembly.$type$ === 'Assembly') {
        assemblies.push(assembly as Assembly);
      }
    }

    return assemblies;
  }

  /**
   * Find all Assemblies owned by a specific Person
   *
   * @param ownerId - Person ID hash (owner)
   * @returns Array of Assembly objects
   */
  async findAssembliesByOwner(
    ownerId: SHA256IdHash
  ): Promise<Assembly[]> {
    const assemblyHashes = await this.getOnlyLatestReferencingObjsHash(
      ownerId,
      'Assembly'
    );

    console.log(`[AssemblyPlan] Found ${assemblyHashes.length} Assemblies for owner ${ownerId.substring(0, 8)}...`);

    const assemblies: Assembly[] = [];
    for (const hash of assemblyHashes) {
      const assembly = await this.getObject(hash);
      if (assembly && assembly.$type$ === 'Assembly') {
        assemblies.push(assembly as Assembly);
      }
    }

    return assemblies;
  }

  /**
   * Find all Assemblies that reference a specific Plan
   *
   * @param planIdHash - Plan ID hash to query
   * @returns Array of Assembly objects
   */
  async findAssembliesByPlan(
    planIdHash: SHA256IdHash<Plan>
  ): Promise<Assembly[]> {
    const assemblyHashes = await this.getOnlyLatestReferencingObjsHash(
      planIdHash,
      'Assembly'
    );

    console.log(`[AssemblyPlan] Found ${assemblyHashes.length} Assemblies for Plan ${planIdHash.substring(0, 8)}...`);

    const assemblies: Assembly[] = [];
    for (const hash of assemblyHashes) {
      const assembly = await this.getObject(hash);
      if (assembly && assembly.$type$ === 'Assembly') {
        assemblies.push(assembly as Assembly);
      }
    }

    return assemblies;
  }

  /**
   * Find Assemblies by multiple criteria (AND logic)
   *
   * @param criteria - Query criteria
   * @returns Array of Assembly objects matching ALL criteria
   */
  async findAssemblies(criteria: {
    storyIdHash?: SHA256IdHash<Story>;
    ownerId?: SHA256IdHash;
    planIdHash?: SHA256IdHash<Plan>;
  }): Promise<Assembly[]> {
    // Query each dimension
    const results: Assembly[][] = [];

    if (criteria.storyIdHash) {
      results.push(await this.findAssembliesByStory(criteria.storyIdHash));
    }

    if (criteria.ownerId) {
      results.push(await this.findAssembliesByOwner(criteria.ownerId));
    }

    if (criteria.planIdHash) {
      results.push(await this.findAssembliesByPlan(criteria.planIdHash));
    }

    if (results.length === 0) {
      return [];
    }

    // Intersect results (find Assemblies in ALL result sets)
    let intersection = results[0];
    for (let i = 1; i < results.length; i++) {
      const currentSet = new Set(results[i].map(a => a.storyRef));
      intersection = intersection.filter(a => currentSet.has(a.storyRef));
    }

    return intersection;
  }
}
```

#### 5. Wire Up in lama.cube

```typescript
// lama.cube/main/ipc/plans/assembly.ts
import { AssemblyPlan } from '@assembly/core';
import { getAllEntries, getOnlyLatestReferencingObjsHash } from '@refinio/one.core/lib/reverse-map-query.js';
import { getObject } from '@refinio/one.core/lib/storage-unversioned-objects.js';

// Create AssemblyPlan instance
const assemblyPlan = new AssemblyPlan({
  getAllEntries,
  getOnlyLatestReferencingObjsHash,
  getObject
});

// Export IPC handlers
export const assemblyPlans = {
  async findAssembliesByStory(event: any, storyIdHash: string) {
    return await assemblyPlan.findAssembliesByStory(storyIdHash);
  },

  async findAssembliesByOwner(event: any, ownerId: string) {
    return await assemblyPlan.findAssembliesByOwner(ownerId);
  },

  async findAssembliesByPlan(event: any, planIdHash: string) {
    return await assemblyPlan.findAssembliesByPlan(planIdHash);
  },

  async findAssemblies(event: any, criteria: any) {
    return await assemblyPlan.findAssemblies(criteria);
  }
};
```

---

## Conclusion

ONE.core's reverse map system provides:
- ✅ Automatic indexing (no manual management)
- ✅ Type-safe queries (TypeScript validation)
- ✅ Fast lookups (file-based indices)
- ✅ Simple API (4 core functions)

This is the **foundation** for Assembly queries and the **first phase** of the query architecture.

**Next**: cube.core dimensional queries for advanced OLAP analytics.
