/**
 * CubeManager - Integration layer for CubeStorage and Assembly system
 *
 * Manages:
 * - CubeStorage initialization
 * - Assembly storage in Cube
 * - Plan storage in Cube
 * - Instance lifecycle coordination
 */

import {CubeStorage} from '@cube/cube.core';
import {AssemblyHandler} from '@assembly/core';
import type {
    Assembly,
    Plan,
    Supply,
    Demand,
    Story
} from '@assembly/core';
import type {SHA256Hash, SHA256IdHash} from '@refinio/one.core/lib/util/type-checks.js';

export interface CubeManagerDependencies {
    /** ONE.core instance */
    oneCore: any;
    /** Function to store versioned objects */
    storeVersionedObject: (obj: any) => Promise<{
        hash: SHA256Hash<any>;
        idHash: SHA256IdHash<any>;
        versionHash: SHA256Hash<any>;
    }>;
    /** Function to get objects by ID hash */
    getObjectByIdHash: (idHash: SHA256IdHash<any>) => Promise<any>;
    /** Function to get objects by hash */
    getObject: (hash: SHA256Hash<any>) => Promise<any>;
}

/**
 * CubeManager - Coordinates CubeStorage with Assembly system
 */
export class CubeManager {
    private cubeStorage: CubeStorage;
    private assemblyHandler: AssemblyHandler;
    private oneCore: any;

    constructor(deps: CubeManagerDependencies) {
        this.oneCore = deps.oneCore;

        // Initialize CubeStorage
        this.cubeStorage = new CubeStorage({
            oneCore: deps.oneCore,
            storeVersionedObject: deps.storeVersionedObject,
            getObjectByIdHash: deps.getObjectByIdHash,
            getObject: deps.getObject
        });

        // Initialize AssemblyHandler
        this.assemblyHandler = new AssemblyHandler({
            oneCore: deps.oneCore,
            storeVersionedObject: deps.storeVersionedObject,
            getObjectByIdHash: deps.getObjectByIdHash,
            getObject: deps.getObject
        });
    }

    /**
     * Initialize the CubeManager
     */
    async init(): Promise<void> {
        // CubeStorage and AssemblyHandler don't need init currently
        console.log('[CubeManager] Initialized');
    }

    // ==================== CubeStorage Operations ====================

    /**
     * Get the CubeStorage instance
     */
    getCubeStorage(): CubeStorage {
        return this.cubeStorage;
    }

    /**
     * Store an Assembly in the Cube
     * TODO: Implement when dimensional metadata is ready
     */
    async storeAssembly(assembly: Assembly): Promise<void> {
        // await this.cubeStorage.store(assemblyHash, metadata);
        // For now, just stored via ONE.core through AssemblyHandler
    }

    /**
     * Store a Plan in the Cube
     * TODO: Implement when dimensional metadata is ready
     */
    async storePlan(plan: Plan): Promise<void> {
        // await this.cubeStorage.store(planHash, metadata);
        // For now, just stored via ONE.core through AssemblyHandler
    }

    /**
     * Store a Supply in the Cube
     * TODO: Implement when dimensional metadata is ready
     */
    async storeSupply(supply: Supply): Promise<void> {
        // await this.cubeStorage.store(supplyHash, metadata);
        // For now, just stored via ONE.core through AssemblyHandler
    }

    /**
     * Store a Demand in the Cube
     * TODO: Implement when dimensional metadata is ready
     */
    async storeDemand(demand: Demand): Promise<void> {
        // await this.cubeStorage.store(demandHash, metadata);
        // For now, just stored via ONE.core through AssemblyHandler
    }

    /**
     * Store a Story in the Cube
     * TODO: Implement when dimensional metadata is ready
     */
    async storeStory(story: Story): Promise<void> {
        // await this.cubeStorage.store(storyHash, metadata);
        // For now, just stored via ONE.core through AssemblyHandler
    }

    // ==================== AssemblyHandler Operations ====================

    /**
     * Get the AssemblyHandler instance
     */
    getAssemblyHandler(): AssemblyHandler {
        return this.assemblyHandler;
    }

    /**
     * Create a Supply
     */
    async createSupply(params: any) {
        const result = await this.assemblyHandler.createSupply(params);

        // Store in Cube
        await this.storeSupply(result.supply);

        return result;
    }

    /**
     * Create a Demand
     */
    async createDemand(params: any) {
        const result = await this.assemblyHandler.createDemand(params);

        // Store in Cube
        await this.storeDemand(result.demand);

        return result;
    }

    /**
     * Create an Assembly
     */
    async createAssembly(params: any) {
        const result = await this.assemblyHandler.createAssembly(params);

        // Store in Cube
        await this.storeAssembly(result.assembly);

        return result;
    }

    /**
     * Create a Plan (learned from Assemblies)
     */
    async createPlan(params: any) {
        const result = await this.assemblyHandler.createPlan(params);

        // Store in Cube
        await this.storePlan(result.plan);

        return result;
    }

    /**
     * Create a Story (audit trail)
     */
    async createStory(params: any) {
        const result = await this.assemblyHandler.createStory(params);

        // Store in Cube
        await this.storeStory(result.story);

        return result;
    }

    /**
     * Add child Assembly to parent
     */
    async addChildAssembly(parentIdHash: SHA256IdHash<Assembly>, childVersionHash: string) {
        const result = await this.assemblyHandler.addChildAssembly(parentIdHash, childVersionHash);

        // Update in Cube
        await this.storeAssembly(result.assembly);

        return result;
    }

    /**
     * Create Instance as special Assembly
     *
     * Instance IS an Assembly where:
     * - Supply = Previous Instance version
     * - Demand = Pending logical steps
     * - Children = All Assemblies + Plans generated
     */
    async createInstanceAssembly(params: {
        previousInstanceVersion: SHA256IdHash<Supply>;
        pendingSteps: SHA256IdHash<Demand>;
        instanceVersion: string;
        children?: string[];
        metadata?: Map<string, string>;
    }) {
        const result = await this.assemblyHandler.createInstanceAssembly(params);

        // Store in Cube
        await this.storeAssembly(result.assembly);

        return result;
    }

    // ==================== Query Operations ====================

    /**
     * Query Assemblies from Cube
     */
    async queryAssemblies(query: any): Promise<Assembly[]> {
        const results = await this.cubeStorage.query(query);
        return results.objects as Assembly[];
    }

    /**
     * Query Plans from Cube
     */
    async queryPlans(query: any): Promise<Plan[]> {
        const results = await this.cubeStorage.query(query);
        return results.objects as Plan[];
    }

    /**
     * Get Assembly by ID hash
     */
    async getAssembly(idHash: SHA256IdHash<Assembly>): Promise<Assembly> {
        return await this.assemblyHandler.getAssembly(idHash);
    }

    /**
     * Get Plan by ID hash
     */
    async getPlan(idHash: SHA256IdHash<Plan>): Promise<Plan> {
        return await this.assemblyHandler.getPlan(idHash);
    }
}

export default CubeManager;
