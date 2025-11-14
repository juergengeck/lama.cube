# cube.core Dimensional Query Guide

Advanced OLAP-style queries for Assembly using cube.core's dimensional indexing system.

## Table of Contents

1. [cube.core Overview](#cubecore-overview)
2. [Architecture](#architecture)
3. [DimensionInstance Interface](#dimensioninstance-interface)
4. [Implementing AssemblyDimension](#implementing-assemblydimension)
5. [CubeStorage Integration](#cubestorage-integration)
6. [Multi-Dimensional Queries](#multi-dimensional-queries)
7. [Query Result Storage](#query-result-storage)
8. [Complete Implementation](#complete-implementation)

---

## cube.core Overview

###What is cube.core?

cube.core is a **multidimensional OLAP query system** built on top of ONE.core that provides:

- **Dimensional indexing** - Index objects across multiple dimensions (who/where/when/custom)
- **Multi-dimensional queries** - Query by combining multiple dimensions
- **Query result storage** - Store query executions as ONE objects
- **Cost-based optimization** - Execute queries in optimal order
- **Index enrichment** - Create indices during query execution

### Key Concepts

**Dimensions**: Axes for organizing data (e.g., who = person, where = location, when = time, assembly = supply/demand)

**DimensionValue**: A concrete value for a dimension (e.g., who = "Alice", when = "2025-01-14")

**CubeObject**: Links a data object with its dimensional values

**QueryResult**: Structured ONE object storing query criteria + results + metadata

---

## Architecture

### Component Stack

```
┌─────────────────────────────────────────────┐
│ Application (GroupPlan, AssemblyPlan)       │
│ - Business logic                             │
│ - High-level queries                         │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│ CubeStorage                                  │
│ - Multi-dimensional query orchestration     │
│ - Query result storage                       │
│ - Dimension management                       │
└──────────────────┬──────────────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
┌────────▼─────────┐  ┌──────▼──────────┐
│ AssemblyDimension│  │ TimeDimension   │
│ - Index Supply   │  │ - Index by time │
│ - Index Demand   │  │ - Range queries │
│ - Domain queries │  │                 │
└─────────┬────────┘  └────────┬────────┘
          │                    │
          └────────┬───────────┘
                   │
┌──────────────────▼──────────────────────────┐
│ ONE.core                                     │
│ - Versioned object storage                   │
│ - Reverse maps (automatic)                   │
│ - Object retrieval                           │
└──────────────────────────────────────────────┘
```

### Flow

1. **Store**: `CubeStorage.store()` → indexes object in all dimensions → creates CubeObject
2. **Query**: `CubeStorage.query()` → queries each dimension → intersects results → stores QueryResult
3. **Retrieve**: Load QueryResult → get matching CubeObjects → load original data objects

---

## DimensionInstance Interface

Every dimension must implement this interface (from `cube.core/src/types/CubeTypes.ts`):

```typescript
export interface DimensionInstance {
  /**
   * Initialize the dimension (register recipes, etc.)
   */
  init(): Promise<void>;

  /**
   * Get the dimension's hash (the Dimension object hash)
   */
  getDimensionHash(): Promise<SHA256Hash<Dimension>>;

  /**
   * Index an object with a value for this dimension
   *
   * @param objectHash - Hash of the object being indexed
   * @param value - The dimensional value (e.g., domain name, keywords)
   * @returns DimensionValue hash
   */
  index(objectHash: SHA256Hash, value: any): Promise<SHA256Hash<DimensionValue>>;

  /**
   * Query objects by this dimension
   *
   * @param criterion - Query criterion (operator + value/range/pattern)
   * @returns Array of object hashes matching the criterion
   */
  query(criterion: DimensionCriterion): Promise<SHA256Hash[]>;

  /**
   * Get dimension value hash for a specific value
   *
   * @param value - The value to look up
   * @returns DimensionValue hash
   */
  getValueHash(value: any): Promise<SHA256Hash<DimensionValue>>;
}
```

### Query Criterion

```typescript
export interface DimensionCriterion {
  operator: QueryOperator;  // 'equals' | 'range' | 'contains' | 'wildcard' | 'proximity'
  value?: any;              // For 'equals', 'contains', 'wildcard'
  start?: any;              // For 'range'
  end?: any;                // For 'range'
  center?: {lat: number; lng: number};  // For 'proximity'
  radiusMeters?: number;    // For 'proximity'
  pattern?: string;         // For 'wildcard'
}
```

---

## Implementing AssemblyDimension

### Step 1: Design the Dimension

**What to index**:
- Domain (conversation, medical, financial)
- Supply keywords
- Demand keywords
- Trust level
- Owner

**Query capabilities**:
- Find Assemblies by domain
- Find Assemblies with specific supply keywords
- Find Assemblies matching demand keywords
- Combine with other dimensions (time, person)

### Step 2: AssemblyDimension Implementation

```typescript
// assembly.core/dimensions/AssemblyDimension.ts
import type {
  DimensionInstance,
  DimensionCriterion,
  Dimension,
  DimensionValue
} from '@cube/core';
import type { SHA256Hash, SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import { storeVersionedObject } from '@refinio/one.core/lib/storage-versioned-objects.js';
import { getObject } from '@refinio/one.core/lib/storage-unversioned-objects.js';
import { getAllEntries } from '@refinio/one.core/lib/reverse-map-query.js';
import type { Assembly } from '../recipes/AssemblyRecipe.js';

/**
 * AssemblyDimension - Index and query Assemblies by domain, keywords, trust
 *
 * Supports queries like:
 * - Find all conversation Assemblies
 * - Find Assemblies with supply keyword "group"
 * - Find Assemblies with demand keyword "authentication"
 */
export class AssemblyDimension implements DimensionInstance {
  private dimensionHash?: SHA256Hash<Dimension>;
  private initialized = false;

  // In-memory indices (could be persisted as ONE objects)
  private domainIndex: Map<string, Set<SHA256Hash>> = new Map();
  private supplyKeywordIndex: Map<string, Set<SHA256Hash>> = new Map();
  private demandKeywordIndex: Map<string, Set<SHA256Hash>> = new Map();
  private ownerIndex: Map<SHA256IdHash, Set<SHA256Hash>> = new Map();

  async init(): Promise<void> {
    if (this.initialized) return;

    // Create or load Dimension object
    const dimension: Dimension = {
      $type$: 'Dimension',
      name: 'assembly',
      dataType: 'object',
      standard: false,  // Custom dimension
      shared: true      // Sync via CHUM
    };

    const result = await storeVersionedObject(dimension);
    this.dimensionHash = result.hash as SHA256Hash<Dimension>;

    console.log(`[AssemblyDimension] Initialized with hash ${this.dimensionHash.substring(0, 8)}...`);

    this.initialized = true;
  }

  async getDimensionHash(): Promise<SHA256Hash<Dimension>> {
    if (!this.dimensionHash) {
      throw new Error('AssemblyDimension not initialized');
    }
    return this.dimensionHash;
  }

  /**
   * Index an Assembly object
   *
   * Creates indices for:
   * - Domain (conversation, medical, etc.)
   * - Supply keywords
   * - Demand keywords
   * - Owner
   *
   * @param objectHash - Assembly object hash
   * @param value - Assembly metadata { domain, supply, demand, owner }
   * @returns DimensionValue hash
   */
  async index(
    objectHash: SHA256Hash,
    value: {
      domain: string;
      supplyKeywords: string[];
      demandKeywords: string[];
      owner?: SHA256IdHash;
    }
  ): Promise<SHA256Hash<DimensionValue>> {
    console.log(`[AssemblyDimension] Indexing ${objectHash.substring(0, 8)}... domain=${value.domain}`);

    // Index by domain
    if (!this.domainIndex.has(value.domain)) {
      this.domainIndex.set(value.domain, new Set());
    }
    this.domainIndex.get(value.domain)!.add(objectHash);

    // Index by supply keywords
    for (const keyword of value.supplyKeywords) {
      if (!this.supplyKeywordIndex.has(keyword)) {
        this.supplyKeywordIndex.set(keyword, new Set());
      }
      this.supplyKeywordIndex.get(keyword)!.add(objectHash);
    }

    // Index by demand keywords
    for (const keyword of value.demandKeywords) {
      if (!this.demandKeywordIndex.has(keyword)) {
        this.demandKeywordIndex.set(keyword, new Set());
      }
      this.demandKeywordIndex.get(keyword)!.add(objectHash);
    }

    // Index by owner
    if (value.owner) {
      if (!this.ownerIndex.has(value.owner)) {
        this.ownerIndex.set(value.owner, new Set());
      }
      this.ownerIndex.get(value.owner)!.add(objectHash);
    }

    // Create DimensionValue object
    const dimensionValue: DimensionValue = {
      $type$: 'DimensionValue',
      dimensionHash: await this.getDimensionHash(),
      value: value,  // Store full metadata
      created: Date.now()
    };

    const result = await storeVersionedObject(dimensionValue);
    return result.hash as SHA256Hash<DimensionValue>;
  }

  /**
   * Query Assemblies by criterion
   *
   * Supports:
   * - equals: { domain: "conversation" }
   * - contains: { supplyKeyword: "group" }
   * - wildcard: { domain: "medical-*" }
   *
   * @param criterion - Query criterion
   * @returns Array of Assembly hashes
   */
  async query(criterion: DimensionCriterion): Promise<SHA256Hash[]> {
    console.log(`[AssemblyDimension] Query operator=${criterion.operator} value=${JSON.stringify(criterion.value)}`);

    if (criterion.operator === 'equals' && criterion.value) {
      // Query by domain
      if (criterion.value.domain) {
        const hashes = this.domainIndex.get(criterion.value.domain);
        return hashes ? Array.from(hashes) : [];
      }

      // Query by owner
      if (criterion.value.owner) {
        const hashes = this.ownerIndex.get(criterion.value.owner);
        return hashes ? Array.from(hashes) : [];
      }
    }

    if (criterion.operator === 'contains' && criterion.value) {
      // Query by supply keyword
      if (criterion.value.supplyKeyword) {
        const hashes = this.supplyKeywordIndex.get(criterion.value.supplyKeyword);
        return hashes ? Array.from(hashes) : [];
      }

      // Query by demand keyword
      if (criterion.value.demandKeyword) {
        const hashes = this.demandKeywordIndex.get(criterion.value.demandKeyword);
        return hashes ? Array.from(hashes) : [];
      }
    }

    if (criterion.operator === 'wildcard' && criterion.pattern) {
      // Wildcard query on domain
      const regex = new RegExp(criterion.pattern.replace('*', '.*'));
      const matchingHashes: Set<SHA256Hash> = new Set();

      for (const [domain, hashes] of this.domainIndex.entries()) {
        if (regex.test(domain)) {
          hashes.forEach(h => matchingHashes.add(h));
        }
      }

      return Array.from(matchingHashes);
    }

    console.warn(`[AssemblyDimension] Unsupported query criterion:`, criterion);
    return [];
  }

  async getValueHash(value: any): Promise<SHA256Hash<DimensionValue>> {
    // For now, create a new DimensionValue
    // In production, might want to deduplicate
    const dimensionValue: DimensionValue = {
      $type$: 'DimensionValue',
      dimensionHash: await this.getDimensionHash(),
      value: value,
      created: Date.now()
    };

    const result = await storeVersionedObject(dimensionValue);
    return result.hash as SHA256Hash<DimensionValue>;
  }
}
```

### Step 3: Export from assembly.core

```typescript
// assembly.core/dimensions/index.ts
export { AssemblyDimension } from './AssemblyDimension.js';

// assembly.core/index.ts
export { AssemblyDimension } from './dimensions/index.js';
```

---

## CubeStorage Integration

### Step 1: Create CubeStorage Instance

```typescript
// lama.cube/main/core/cube-storage.ts
import { CubeStorage } from '@cube/core';
import { AssemblyDimension } from '@assembly/core';

let cubeStorage: CubeStorage;

export async function initializeCubeStorage(): Promise<CubeStorage> {
  if (cubeStorage) return cubeStorage;

  // Create dimensions
  const assemblyDimension = new AssemblyDimension();
  // TODO: Add TimeDimension, PersonDimension when available

  // Create CubeStorage
  cubeStorage = new CubeStorage({
    dimensions: new Map([
      ['assembly', assemblyDimension]
      // ['when', timeDimension],
      // ['who', personDimension]
    ])
  });

  // Initialize
  await cubeStorage.init();

  console.log('[CubeStorage] Initialized with dimensions:', cubeStorage.listDimensions());

  return cubeStorage;
}

export function getCubeStorage(): CubeStorage {
  if (!cubeStorage) {
    throw new Error('CubeStorage not initialized');
  }
  return cubeStorage;
}
```

### Step 2: Initialize During Startup

```typescript
// lama.cube/main/core/node-one-core.ts
import { initializeCubeStorage } from './cube-storage.js';

export async function initializeNodeOneCore() {
  // ... existing ONE.core initialization ...

  // Initialize CubeStorage
  await initializeCubeStorage();

  console.log('[NodeOneCore] CubeStorage ready');
}
```

### Step 3: Index Assemblies During Creation

Update StoryFactory to index Assemblies:

```typescript
// lama.cube/main/ipc/plans/chat.ts (in GroupPlan.createGroup)
import { getCubeStorage } from '../../core/cube-storage.js';

// After creating Assembly
const assemblyResult = await storyFactory.recordExecution(...);

// Index in CubeStorage
const cubeStorage = getCubeStorage();
await cubeStorage.store(assemblyResult.assemblyHash, {
  assembly: {
    domain: 'conversation',
    supplyKeywords: ['group', 'access-control', 'participant-management'],
    demandKeywords: ['topic', 'group', 'participants', 'access-control'],
    owner: ownerPersonId
  }
});

console.log(`[GroupPlan] Assembly indexed in CubeStorage`);
```

---

## Multi-Dimensional Queries

### Query by Single Dimension

```typescript
import { getCubeStorage } from './cube-storage.js';

// Find all conversation Assemblies
const results = await cubeStorage.query({
  assembly: {
    operator: 'equals',
    value: { domain: 'conversation' }
  }
});

console.log(`Found ${results.count} conversation Assemblies`);
```

### Query by Multiple Dimensions (AND logic)

```typescript
// Find conversation Assemblies created by specific owner
const results = await cubeStorage.query({
  assembly: {
    operator: 'equals',
    value: { domain: 'conversation', owner: personIdHash }
  }
  // when: {
  //   operator: 'range',
  //   start: yesterday,
  //   end: today
  // }
});

console.log(`Found ${results.count} results`);
```

### Query by Keywords

```typescript
// Find Assemblies with supply keyword "group"
const results = await cubeStorage.query({
  assembly: {
    operator: 'contains',
    value: { supplyKeyword: 'group' }
  }
});

// Find Assemblies with demand keyword "authentication"
const results = await cubeStorage.query({
  assembly: {
    operator: 'contains',
    value: { demandKeyword: 'authentication' }
  }
});
```

### Wildcard Queries

```typescript
// Find all medical-related Assemblies
const results = await cubeStorage.query({
  assembly: {
    operator: 'wildcard',
    pattern: 'medical-*'
  }
});
```

---

## Query Result Storage

cube.core automatically stores query results as ONE objects:

### QueryResult Object Structure

```typescript
export interface StoredQueryResult {
  $type$: 'QueryResult';
  queryCriteria: string;                    // JSON-serialized criteria (stable ID)
  resultHashes: SHA256Hash<CubeObject>[];   // Matching CubeObject hashes
  resultCount: number;                      // Number of results
  executionTime: number;                    // Duration in ms
  timestamp: number;                        // When executed
  enrichedNodes?: SHA256Hash[];             // Indices created during enrichment
  dimensionsQueried: string[];              // ['assembly', 'when', 'who']
}
```

### Benefits

1. **Query History**: Track all queries executed
2. **Result Caching**: Reuse results for identical queries
3. **Analytics**: Analyze query patterns
4. **Audit Trail**: Who queried what, when

### Accessing Query Results

```typescript
import { getCubeStorage } from './cube-storage.js';

const cubeStorage = getCubeStorage();
const queryResultStorage = cubeStorage.getQueryResultStorage();

// Get all query results
// (Would need to implement queryAllResults in QueryResultStorage)
// const allQueries = await queryResultStorage.queryAllResults();
```

---

## Complete Implementation

### Full Flow: Create Group → Index Assembly → Query

#### 1. Create Group with Assembly

```typescript
// GroupPlan.createGroup()
const groupResult = await storyFactory.recordExecution({
  name: 'createGroupTopic',
  execute: async () => {
    return await topicGroupManager.createGroupTopic(
      topicId,
      participantIds,
      topicName
    );
  },
  demand: {
    domain: 'conversation',
    keywords: ['topic', 'group', 'participants'],
    trustLevel: 'me'
  },
  supply: {
    domain: 'conversation',
    keywords: ['group', 'access-control', 'participant-management'],
    subjects: ['conversation-group'],
    ownerId: ownerPersonId
  },
  metadata: {
    topicId,
    topicName,
    participantCount: participantIds.length.toString(),
    participants: participantIds.join(',')
  }
});

// Index in CubeStorage
const cubeStorage = getCubeStorage();
await cubeStorage.store(groupResult.assemblyHash, {
  assembly: {
    domain: 'conversation',
    supplyKeywords: ['group', 'access-control', 'participant-management'],
    demandKeywords: ['topic', 'group', 'participants', 'access-control'],
    owner: ownerPersonId
  }
});
```

#### 2. Query Assemblies

```typescript
// Find all conversation groups
const conversationGroups = await cubeStorage.query({
  assembly: {
    operator: 'equals',
    value: { domain: 'conversation' }
  }
});

console.log(`Found ${conversationGroups.count} conversation groups`);

// Find groups with specific supply
const groupsWithAccessControl = await cubeStorage.query({
  assembly: {
    operator: 'contains',
    value: { supplyKeyword: 'access-control' }
  }
});

console.log(`Found ${groupsWithAccessControl.count} groups with access control`);
```

#### 3. Supply/Demand Matching

```typescript
// Find Assemblies that can satisfy a demand
async function findMatchingSupply(demandKeywords: string[]) {
  const results: Set<SHA256Hash> = new Set();

  for (const keyword of demandKeywords) {
    const matches = await cubeStorage.query({
      assembly: {
        operator: 'contains',
        value: { supplyKeyword: keyword }
      }
    });

    // Add all matching hashes
    // (would need to extract hashes from QueryResult)
  }

  return Array.from(results);
}

// Find groups that can provide "participant-management"
const matchingGroups = await findMatchingSupply(['participant-management']);
```

---

## Advantages of cube.core Approach

### vs ONE.core Reverse Maps

| Feature | Reverse Maps | cube.core |
|---------|--------------|-----------|
| Query complexity | Simple (by reference) | Complex (multi-dimensional) |
| Index management | Automatic | Custom dimension logic |
| Query result storage | Manual | Automatic (QueryResult objects) |
| Multi-dimensional | No | Yes |
| Cost optimization | No | Yes (query planning) |
| Semantic queries | Limited | Full (keywords, wildcards) |
| Setup complexity | Low | Medium |
| Performance | Fast (direct index) | Good (indexed dimensions) |

### When to Use cube.core

✅ **Use cube.core when**:
- Need multi-dimensional queries (domain + time + owner)
- Want semantic search (keywords, wildcards)
- Need query result tracking
- Building analytics/dashboards
- Want supply/demand matching

❌ **Use reverse maps when**:
- Simple lookups (by storyRef, owner)
- Performance critical path
- Minimal setup needed
- Direct object references only

---

## Next Steps

### Phase 1: Basic Implementation
1. ✅ Implement AssemblyDimension
2. ✅ Initialize CubeStorage
3. ⏳ Index Assemblies during creation
4. ⏳ Test single-dimension queries

### Phase 2: Multi-Dimensional
1. ⏳ Implement TimeDimension
2. ⏳ Implement PersonDimension (owner)
3. ⏳ Test multi-dimensional queries
4. ⏳ Benchmark performance

### Phase 3: Advanced Features
1. ⏳ Supply/Demand matching algorithm
2. ⏳ Query result caching
3. ⏳ Cost-based query optimization
4. ⏳ Index enrichment during queries

### Phase 4: Analytics
1. ⏳ Query history dashboard
2. ⏳ Assembly usage patterns
3. ⏳ Supply/Demand analytics
4. ⏳ Temporal analysis

---

## Conclusion

cube.core provides a powerful OLAP-style query system for Assemblies:

- ✅ **Multi-dimensional** - Query by domain + keywords + owner + time
- ✅ **Semantic** - Keyword-based supply/demand matching
- ✅ **Tracked** - Query results stored as ONE objects
- ✅ **Extensible** - Custom dimensions via DimensionInstance
- ✅ **Optimized** - Cost-based query planning

This is the **advanced phase** of the query architecture, complementing ONE.core reverse maps with sophisticated analytical capabilities.
