import { Worker } from 'worker_threads';
import os from 'os';
import type { WorkerPlatform, WorkerHandle } from '@refinio/worker.core';

export class NodeWorkerPlatform implements WorkerPlatform {
  readonly maxConcurrency: number;
  private workerRegistry: Map<string, string>;

  constructor(workerRegistry: Record<string, string>, maxConcurrency?: number) {
    this.workerRegistry = new Map(Object.entries(workerRegistry));
    this.maxConcurrency = maxConcurrency ?? Math.min(os.cpus().length - 1, 4);
  }

  spawn(jobType: string): WorkerHandle {
    const workerPath = this.workerRegistry.get(jobType);
    if (!workerPath) {
      throw new Error(`No worker registered for job type: ${jobType}`);
    }

    const worker = new Worker(workerPath, {
      workerData: { jobType },
    });

    return {
      postMessage: (msg: unknown) => worker.postMessage(msg),
      onMessage: (cb: (msg: unknown) => void) => { worker.on('message', cb); },
      onError: (cb: (err: Error) => void) => { worker.on('error', cb); },
      onExit: (cb: (code: number) => void) => { worker.on('exit', cb); },
      terminate: () => { worker.terminate(); },
    };
  }

  registerWorker(jobType: string, workerPath: string): void {
    this.workerRegistry.set(jobType, workerPath);
  }
}
