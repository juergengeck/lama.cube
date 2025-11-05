# ONE.core Fundamentals

This document provides deep-dive information about ONE.core concepts, storage patterns, and best practices.

## Everything is a Hash

**CRITICAL PRINCIPLE**: In ONE, everything is content-addressed by its SHA-256 hash. This drives all architecture decisions:

- All objects are stored using their hash as the filename
- References between objects are hashes, not pointers
- Objects are **immutable** once created
- Identical objects naturally deduplicate

## Object Categories

1. **Unversioned Objects** - Immutable, no version tracking
   - `Keys` - Encryption/signing keypairs
   - `VersionNode*` - Version graph nodes

2. **Versioned Objects** - Have ID properties (`isId: true`), support versioning
   - `Person` - Identity (ID: email)
   - `Instance` - App instance (ID: name + owner)
   - `Group` - Named groups (ID: name)
   - `Recipe` - Type definitions (ID: name)
   - `Access`/`IdAccess` - Access control
   - Custom app objects with ID properties

3. **Virtual Types**
   - `BLOB` - Binary data
   - `CLOB` - UTF-8 text data

## Hash Types

**Object Hash** (`SHA256Hash<T>`): Hash of the complete object
```typescript
const objectHash = await calculateHashOfObj(person);
```

**ID Hash** (`SHA256IdHash<T>`): Hash of only ID properties
```typescript
const idHash = await calculateIdHashOfObj(person);
```

**Key Difference**: ID hashes reference ALL versions of an object, object hashes reference ONE specific version.

## Microdata Format

ONE objects are serialized as HTML5 microdata for storage:

```html
<div itemscope itemtype="//refin.io/Person">
  <span itemprop="email">user@example.com</span>
  <span itemprop="name">John Doe</span>
</div>
```

This format ensures:
- Platform-independent serialization
- Human-readable structure
- Consistent hashing across implementations

## Recipe System

Recipes define the schema for ONE object types. **CRITICAL**: Array properties must include a `rules` array, even if empty:

```typescript
// ✅ CORRECT - provides rules array
{
    itemprop: 'devices',
    itemtype: {
        type: 'array',
        item: {
            type: 'object',
            rules: []  // Required! Prevents parser crash
        }
    }
}

// ❌ INCORRECT - missing rules array crashes parser
{
    itemprop: 'devices',
    itemtype: {
        type: 'array',
        item: {
            type: 'object'
            // Missing rules causes: "Cannot read property 'forEach' of undefined"
        }
    }
}
```

## Storage Patterns

**For Versioned Objects** (have ID properties):
```typescript
// Creates version nodes AND stores object
const result = await storeVersionedObject(subject);
// Returns: { hash, idHash, versionHash }
```

**For Unversioned Objects**:
```typescript
// Stores object only (no versioning)
const hash = await storeUnversionedObject(keys);
```

**For Binary Data**:
```typescript
// Store BLOB
const result = await storeArrayBufferAsBlob(arrayBuffer);
// Returns: { hash: SHA256Hash<BLOB>, status: 'new' | 'exists' }

// Read BLOB
const data = await readBlobAsArrayBuffer(blobHash);
```

## Versioning System

Versioned objects use a DAG (Directed Acyclic Graph):

```typescript
interface VersionNode {
    depth: number;
    creationTime: number;
    data: SHA256Hash;  // Hash of actual object data
}

// Version node types:
// - VersionNodeEdge: First version
// - VersionNodeChange: Linear update (prev: hash)
// - VersionNodeMerge: Merge versions (nodes: Set<hash>)
```

**Version Map**: Maps `ID hash → Set<version hashes>`

**Retrieval**:
- `getObject(objectHash)` - Get specific version
- `getObjectByIdHash(idHash)` - Get latest version
- Requires vheads files created by `storeVersionedObject()`

## Reference Types in Recipes

```typescript
// Reference to specific object version
{
    itemprop: 'attachment',
    itemtype: {
        type: 'referenceToObj',
        allowedTypes: new Set(['Message'])
    }
}

// Reference to all versions via ID
{
    itemprop: 'owner',
    itemtype: {
        type: 'referenceToId',
        allowedTypes: new Set(['Person'])
    }
}

// Reference to BLOB
{
    itemprop: 'photo',
    itemtype: { type: 'referenceToBlob' }
}

// Collection types
{
    itemprop: 'keywords',
    itemtype: {
        type: 'bag',  // Also: array, set, map
        item: {
            type: 'referenceToId',
            allowedTypes: new Set(['Keyword'])
        }
    }
}
```

## TypeScript Type System

ONE.core uses declaration merging for extensible types:

```typescript
// Extend ONE's type system (in @OneCoreTypes.d.ts)
declare module '@OneObjectInterfaces' {
    export interface OneVersionedObjectInterfaces {
        Subject: Subject;
        Keyword: Keyword;
    }
}

// Now Subject and Keyword are recognized ONE types
```

## Common Pitfalls

1. **Using postToChannel() without storeVersionedObject()**
   - `postToChannel()` syncs objects across instances
   - `storeVersionedObject()` creates persistent vheads files
   - **Both are required** for versioned objects retrieved via ID hash

2. **Incorrect Recipe Definitions**
   - Missing `rules: []` in array item definitions crashes parser
   - Using `type: 'string'` instead of `referenceToId` breaks references
   - Forgetting `isId: true` makes objects unversioned

3. **Hash Type Confusion**
   - Don't use object hashes where ID hashes are expected
   - Keywords with Subject ID hashes must match what `storeVersionedObject()` returns

4. **ID Hash Calculation**
   - Use `calculateIdHashOfObj()` for consistent ID hashes
   - Only ID properties (marked `isId: true`) are included in ID hash

## Creating Custom Versioned Objects

```typescript
// 1. Define interface
interface Subject {
    $type$: 'Subject';
    id: string;  // ID property
    topic: SHA256IdHash<Topic>;
    keywords: SHA256IdHash<Keyword>[];
}

// 2. Extend type system
declare module '@OneObjectInterfaces' {
    export interface OneVersionedObjectInterfaces {
        Subject: Subject;
    }
}

// 3. Create recipe
const SubjectRecipe: Recipe = {
    $type$: 'Recipe',
    name: 'Subject',
    rule: [
        { itemprop: 'id', isId: true },  // Marks as versioned
        {
            itemprop: 'topic',
            itemtype: {
                type: 'referenceToId',
                allowedTypes: new Set(['Topic'])
            }
        },
        {
            itemprop: 'keywords',
            itemtype: {
                type: 'bag',
                item: {
                    type: 'referenceToId',
                    allowedTypes: new Set(['Keyword'])
                }
            }
        }
    ]
};

// 4. Register recipe (during init)
await registerRecipes([SubjectRecipe]);

// 5. Create and store objects
const subject = {
    $type$: 'Subject',
    id: 'my-subject',
    topic: topicIdHash,
    keywords: [keywordIdHash1, keywordIdHash2]
};

// CRITICAL: Store before posting to channel
const result = await storeVersionedObject(subject);
await channelManager.postToChannel(topicId, subject);
```
