/**
 * TypeScript type definitions for LAMA Electron ONE.core objects
 *
 * This file extends the existing @OneObjectInterfaces with our custom ONE object types
 * following the declaration merging pattern described in ONE.core's README
 */

import type { SHA256IdHash, SHA256Hash } from '@refinio/one.core/lib/util/type-checks.js';
import type { Person } from '@refinio/one.core/lib/recipes.js';

// ################ ONE.core Type Extensions ################
// Extend OneUnversionedObjectInterfaces and OneVersionedObjectInterfaces
// in the correct module so types work with storeUnversionedObject, getObject, etc.

declare module '@refinio/one.core/lib/recipes.js' {
    interface OneUnversionedObjectInterfaces {
        // cube.core types
        Dimension: Dimension;
        QueryResult: QueryResult;
        // meaning.core types
        MeaningNode: MeaningNode;
        MeaningDimensionValue: MeaningDimensionValue;
    }

    interface OneVersionedObjectInterfaces {
        // cube.core types
        CubeObject: CubeObject;
        DimensionValue: DimensionValue;
        DimensionState: DimensionState;
        DimensionStateReference: DimensionStateReference;
    }
}

// ################ cube.core Type Definitions ################

interface CubeObject {
    $type$: 'CubeObject';
    oneObjectHash: SHA256Hash;
    dimensionValues: SHA256Hash<DimensionValue>[];
    created: number;
    creator?: SHA256IdHash;
}

interface Dimension {
    $type$: 'Dimension';
    name: string;
    dataType: 'string' | 'number' | 'boolean' | 'hash' | 'object';
    standard: boolean;
    shared: boolean;
    packageName?: string;
}

interface DimensionValue {
    $type$: 'DimensionValue';
    dimensionHash: SHA256Hash<Dimension>;
    value: unknown;
    valueHash?: SHA256Hash;
    created: number;
}

interface QueryResult {
    $type$: 'QueryResult';
    queryHash: SHA256Hash;
    resultHashes: SHA256Hash[];
    executedAt: number;
    expiresAt?: number;
}

interface DimensionState {
    $type$: 'DimensionState';
    dimensionName: string;
    stateData: string;
    serializedAt: number;
}

interface DimensionStateReference {
    $type$: 'DimensionStateReference';
    dimensionName: string;
    latestStateHash: SHA256Hash<DimensionState>;
    updatedAt: number;
}

// ################ meaning.core Type Definitions ################

interface MeaningNode {
    $type$: 'MeaningNode';
    embedding: number[];
    model: string;
    dimensions: number;
    sourceText?: string;
    contentType?: string;
}

interface MeaningDimensionValue {
    $type$: 'MeaningDimensionValue';
    dimensionHash: SHA256Hash;
    meaningNodeHash: SHA256Hash<MeaningNode>;
    created: number;
}

// ################ LAMA Application Types ################

declare module '@OneObjectInterfaces' {
    // Subject represents a distinct discussion topic within a conversation
    // References content (topics, memories) that discusses this subject
    // Forms abstraction hierarchy via parent/child relationships (computed from embeddings)
    export interface Subject {
        $type$: 'Subject';
        keywords?: SHA256IdHash<Keyword>[]; // Array of Keyword ID hashes - THIS IS THE ID PROPERTY (isId: true in recipe)
        description?: string; // LLM-generated description
        abstractionLevel?: number; // Tree depth (root = max abstract, leaves = concrete)

        // Abstraction hierarchy - parent/child relationships
        // Parent embeddings approximate centroid of children embeddings
        parent?: SHA256IdHash<Subject>; // More abstract concept this subject is an instance of
        children?: SHA256IdHash<Subject>[]; // More concrete instances of this subject

        // Embedding for computing parent/child relationships empirically
        embedding?: number[];
        embeddingModel?: string; // Model used to generate embedding

        // References - content that discusses this subject
        topics: string[];  // Array of topic/channel IDs
        memories: string[]; // Array of Memory IdHashes (from memory.core)
        // Future: documents, attachments
    }

    // Keyword extracted from message content
    export interface Keyword {
        $type$: 'Keyword';
        term: string; // ID property - normalized keyword term
        frequency: number;
        subjects: SHA256IdHash<Subject>[]; // Array of Subject IdHashes (matches recipe)
        score?: number;
        createdAt: number; // Unix timestamp
        lastSeen: number; // Unix timestamp
    }

    // Summary of a topic conversation with versioning support
    export interface Summary {
        $type$: 'Summary';
        id: string; // format: ${topicId}-v${version}
        topic: string; // reference to parent topic
        content: string;
        subjects: string[]; // Subject IDs
        keywords: string[]; // All keywords from all subjects
        version: number;
        previousVersion?: string; // Hash of previous summary
        createdAt: number;
        updatedAt: number;
        changeReason?: string;
        hash?: string;
    }

    // WordCloudSettings for visualization preferences
    export interface WordCloudSettings {
        $type$: 'WordCloudSettings';
        creator: string;
        created: number;
        modified: number;
        maxWordsPerSubject: number;
        relatedWordThreshold: number;
        minWordFrequency: number;
        showSummaryKeywords: boolean;
        fontScaleMin: number;
        fontScaleMax: number;
        colorScheme: string;
        layoutDensity: string;
    }

    // LLM object type - represents a Language Learning Model configuration
    export interface LLM {
        $type$: 'LLM';
        name: string;
        server: string;
        filename: string;
        modelType: 'local' | 'remote';
        active: boolean;
        deleted: boolean;
        creator?: string;
        created: number;
        modified: number;
        createdAt: string;
        lastUsed: string;
        lastInitialized?: number;
        usageCount?: number;
        size?: number;

        // Required LLM identification fields
        modelId: string;

        // personId being present = this is an AI contact
        personId?: SHA256IdHash<Person>;
        capabilities?: Array<'chat' | 'inference'>;

        // Per-model system prompt (different models need different prompts)
        // e.g., local models can claim privacy, cloud models cannot
        systemPrompt?: string;

        // Model parameters
        temperature?: number;
        maxTokens?: number;
        contextSize?: number;
        batchSize?: number;
        threads?: number;
        mirostat?: number;
        topK?: number;
        topP?: number;

        // Optional properties
        architecture?: string;
        contextLength?: number;
        quantization?: string;
        checksum?: string;
        provider?: string;
        downloadUrl?: string;
    }

    // GlobalLLMSettings - global settings for LLM management
    export interface GlobalLLMSettings {
        $type$: 'GlobalLLMSettings';
        name: string; // Instance ID - this is the ID field
        defaultProvider: string;
        autoSelectBestModel: boolean;
        preferredModelIds: string[];
        defaultModelId?: string;
        temperature?: number;
        maxTokens?: number;
        systemPrompt?: string;
        streamResponses?: boolean;
        autoSummarize?: boolean;
        enableMCP?: boolean;
    }

    // MessageAssertion for verifiable message credentials
    export interface MessageAssertion {
        $type$: 'MessageAssertion';
        messageId: string;
        messageHash: string;
        text: string;
        timestamp: string;
        sender: string;
        subjects?: string[];
        keywords?: string[];
        version?: number;
        assertedAt: string;
        assertionType: string;
        assertionVersion: string;
    }

    // XMLMessageAttachment - stores XML-formatted LLM messages
    export interface XMLMessageAttachment {
        $type$: 'XMLMessageAttachment';
        topicId: string;
        messageId: string;
        xmlContent?: string; // Inline XML if ≤1KB
        xmlBlob?: string; // BLOB hash if >1KB (stored as string)
        format: string; // 'llm-query' | 'llm-response'
        version: number; // Schema version (1)
        createdAt: number; // Unix timestamp
        size: number; // Byte size
    }

    // SystemPromptTemplate - per-model system prompts with XML format instructions
    export interface SystemPromptTemplate {
        $type$: 'SystemPromptTemplate';
        modelId: string; // ID field - FK to LLM
        promptText: string;
        xmlSchemaVersion: number;
        version: number;
        active: boolean;
        createdAt: number;
        updatedAt: number;
    }

    // MCPServer - Configuration for an MCP server
    export interface MCPServer {
        $type$: 'MCPServer';
        name: string; // ID field - unique server identifier
        command: string;
        args: string[];
        description: string;
        enabled: boolean;
        createdAt: number;
        updatedAt: number;
    }

    // MCPServerConfig - User's MCP configuration object
    export interface MCPServerConfig {
        $type$: 'MCPServerConfig';
        userEmail: string; // ID field - user identifier
        servers: SHA256IdHash<MCPServer>[];
        updatedAt: number;
    }

    // ProposalConfig - Configuration for proposal matching algorithm
    export interface ProposalConfig {
        $type$: 'ProposalConfig';
        userEmail: string; // ID field - user identifier
        matchWeight: number;
        recencyWeight: number;
        recencyWindow: number;
        minJaccard: number;
        maxProposals: number;
        updatedAt: number;
    }

    // UserSettings - Unified user settings (aligned with @settings/core)
    export interface UserSettings {
        $type$: 'UserSettings';

        // Metadata
        userEmail: string; // ID field - user identifier
        instanceId?: string; // Optional instance identifier for multi-device support
        updatedAt: number;

        // Core categories (required)
        ai: {
            defaultModelId?: string;
            temperature: number;
            maxTokens: number;
            defaultProvider: string;
            autoSelectBestModel: boolean;
            preferredModelIds: string[];
            systemPrompt?: string;
            streamResponses: boolean;
            autoSummarize: boolean;
            enableMCP: boolean;
            apiKeys?: Map<string, string>;
        };
        ui: {
            theme: 'dark' | 'light';
            notifications: boolean;
            wordCloud: {
                maxWordsPerSubject: number;
                relatedWordThreshold: number;
                minWordFrequency: number;
                showSummaryKeywords: boolean;
                fontScaleMin: number;
                fontScaleMax: number;
                colorScheme: string;
                layoutDensity: string;
            };
        };
        proposals: {
            matchWeight: number;
            recencyWeight: number;
            recencyWindow: number;
            minJaccard: number;
            maxProposals: number;
        };

        // Additional categories (optional - not all platforms use these)
        device?: {
            discoveryEnabled: boolean;
            discoveryPort: number;
            autoConnect: boolean;
            addOnlyConnectedDevices: boolean;
            showOfflineDevices: boolean;
            discoveryTimeout: number;
        };
        network?: {
            commServerUrl: string;
            autoReconnect: boolean;
            connectionTimeout: number;
            enableWebSocket: boolean;
            enableQUIC: boolean;
            enableBluetooth: boolean;
        };
        privacy?: {
            encryptStorage: boolean;
            requirePINOnStartup: boolean;
            autoLockTimeout: number;
            sendAnalytics: boolean;
            sendCrashReports: boolean;
        };
        chat?: {
            enterToSend: boolean;
            showReadReceipts: boolean;
            groupMessagesBy: 'none' | 'hour' | 'day';
            maxHistoryDays: number;
            autoDownloadMedia: boolean;
            maxMediaSize: number;
        };

        // Platform-specific (optional)
        electron?: {
            trayEnabled: boolean;
            autoLaunch: boolean;
            hardwareAcceleration: boolean;
        };
        ios?: {
            haptics: boolean;
            backgroundRefresh: boolean;
            vibrationEnabled: boolean;
        };
        browser?: {
            offlineMode: boolean;
        };
    }

    // AvatarPreference - Stores avatar color preference for a person
    export interface AvatarPreference {
        $type$: 'AvatarPreference';
        personId: string; // ID field - Person ID hash
        color: string; // Hex color code
        mood?: 'happy' | 'sad' | 'angry' | 'calm' | 'excited' | 'tired' | 'focused' | 'neutral'; // Current mood
        updatedAt: number; // Unix timestamp
    }

    // Memory - Synthesized knowledge document from memory.core
    export interface Memory {
        $type$: 'Memory';
        // Identity (isId: true)
        title: string;
        author: string;  // SHA256IdHash<Person>
        // Structured content
        facts: Array<{
            statement: string;
            confidence: number;
            sourceRef?: string;
        }>;
        entities: Array<{
            name: string;
            type: 'person' | 'place' | 'thing' | 'concept' | 'event';
            description?: string;
        }>;
        relationships: Array<{
            fromEntity: string;
            toEntity: string;
            relationType: string;
        }>;
        // Prose content
        prose: string;
        // Summary
        summary?: string;
        // Source subjects this memory was constructed from
        sourceSubjects: string[];
        // Related subjects - semantically linked but not sources
        relatedSubjects?: string[];
        // Semantic embedding
        embedding?: number[];
        embeddingModel?: string;
    }

    // Import AffirmationCertificate from ONE.models - it's already defined there

    // Extend ONE.core's ID object interfaces (for objects that can be retrieved by ID)
    interface OneIdObjectInterfaces {
        LLM: Pick<LLM, '$type$' | 'name' | 'server'>;
        GlobalLLMSettings: GlobalLLMSettings;
        SystemPromptTemplate: Pick<SystemPromptTemplate, '$type$' | 'modelId'>;
    }

    // Extend ONE.core's versioned object interfaces with our types
    interface OneVersionedObjectInterfaces {
        Subject: Subject;
        Keyword: Keyword;
        Summary: Summary;
        WordCloudSettings: WordCloudSettings;
        LLM: LLM;
        GlobalLLMSettings: GlobalLLMSettings;
        MessageAssertion: MessageAssertion;
        XMLMessageAttachment: XMLMessageAttachment;
        SystemPromptTemplate: SystemPromptTemplate;
        MCPServer: MCPServer;
        MCPServerConfig: MCPServerConfig;
        ProposalConfig: ProposalConfig;
        UserSettings: UserSettings;
        AvatarPreference: AvatarPreference;
        Memory: Memory;
    }
}