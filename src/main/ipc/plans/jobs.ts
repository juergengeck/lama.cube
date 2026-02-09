/**
 * Jobs IPC Handlers
 * Expose JobManager operations to the renderer process.
 */

import type { IpcMainInvokeEvent } from 'electron';
import { BrowserWindow } from 'electron';
import type { JobManager, JobDefinition, JobInfo, JobStatus } from '@refinio/worker.core';

let jobManagerInstance: JobManager | null = null;

export function setJobManager(jm: JobManager): void {
  jobManagerInstance = jm;
}

function getJobManager(): JobManager {
  if (!jobManagerInstance) {
    throw new Error('JobManager not initialized');
  }
  return jobManagerInstance;
}

function broadcastToWindows(channel: string, data: unknown): void {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, data);
    }
  }
}

const jobPlans = {
  async submit(_event: IpcMainInvokeEvent, definition: JobDefinition): Promise<{ jobId: string }> {
    if (!definition?.type || typeof definition.type !== 'string') {
      throw new Error('Invalid job definition: type is required');
    }

    const handle = getJobManager().submit(definition);

    // Forward progress to renderer
    const unsubProgress = handle.subscribe((progress) => {
      broadcastToWindows('job:progress', {
        jobId: handle.id,
        jobType: handle.type,
        data: progress,
      });
    });

    // Forward status changes to renderer
    const unsubStatus = handle.subscribeStatus((status) => {
      broadcastToWindows('job:status', {
        jobId: handle.id,
        jobType: handle.type,
        status,
        error: status === 'failed' || status === 'cancelled' ? handle.toInfo().error : undefined,
      });
    });

    // Clean up subscriptions when job completes
    handle.result.finally(() => {
      unsubProgress();
      unsubStatus();
    });

    return { jobId: handle.id };
  },

  async cancel(_event: IpcMainInvokeEvent, jobId: string): Promise<{ success: boolean }> {
    const handle = getJobManager().getJob(jobId);
    if (!handle) {
      return { success: false };
    }
    handle.cancel();
    return { success: true };
  },

  async list(_event: IpcMainInvokeEvent, filter?: { status?: JobStatus[] }): Promise<JobInfo[]> {
    return getJobManager().listJobs(filter);
  },

  async getJob(_event: IpcMainInvokeEvent, jobId: string): Promise<JobInfo | null> {
    const handle = getJobManager().getJob(jobId);
    return handle ? handle.toInfo() : null;
  },
};

export default jobPlans;
