/**
 * Diagnostics IPC Plans
 *
 * Provides trace download and management for debugging
 * pairing and AI sync issues.
 */

import type { IpcMainInvokeEvent } from 'electron';
import { traceService } from '@refinio/lama.core/services/trace-service.js';

const diagnosticsPlans = {
  /**
   * Get the current trace buffer as a downloadable string
   */
  'diagnostics:getTrace': async (_event: IpcMainInvokeEvent): Promise<string> => {
    return traceService.dump();
  },

  /**
   * Clear the trace buffer
   */
  'diagnostics:clearTrace': async (_event: IpcMainInvokeEvent): Promise<{ cleared: boolean }> => {
    traceService.clear();
    return { cleared: true };
  },

  /**
   * Get trace buffer size
   */
  'diagnostics:getTraceSize': async (_event: IpcMainInvokeEvent): Promise<{ size: number }> => {
    return { size: traceService.size };
  },
};

export default diagnosticsPlans;
