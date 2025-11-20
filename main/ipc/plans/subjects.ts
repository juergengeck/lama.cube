/**
 * IPC Handler for Subjects
 * Thin adapter that delegates to lama.core SubjectsPlan
 */

import { SubjectsPlan } from '@lama/core/plans/SubjectsPlan.js';
import type { IpcMainInvokeEvent } from 'electron';
import type { Subject } from '@lama/core/one-ai/types/Subject.js';
import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';

// Initialize plan (TopicAnalysisModel will be injected later)
const subjectsPlan = new SubjectsPlan();

interface GetSubjectsParams {
  topicId: string;
}

interface GetSubjectByIdParams {
  subjectIdHash: SHA256IdHash<Subject>;
}

interface IpcResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  subject?: Subject;
  subjects?: Subject[];
}

/**
 * Subject IPC handlers
 */
const subjectPlans = {
  /**
   * Get all subjects for a topic
   */
  'subjects:getForTopic': async (event: IpcMainInvokeEvent, { topicId }: GetSubjectsParams): Promise<IpcResponse> => {
    const response = await subjectsPlan.getSubjects({ topicId });
    return { success: response.success, subjects: response.subjects, error: response.error };
  },

  /**
   * Get a specific subject by ID hash
   */
  'subjects:getById': async (event: IpcMainInvokeEvent, { subjectIdHash }: GetSubjectByIdParams): Promise<IpcResponse> => {
    const response = await subjectsPlan.getSubjectById({ subjectIdHash });
    return { success: response.success, subject: response.subject, error: response.error };
  },

  /**
   * Get all subjects across all topics
   */
  'subjects:getAll': async (event: IpcMainInvokeEvent): Promise<IpcResponse> => {
    const response = await subjectsPlan.getAllSubjects();
    return { success: response.success, subjects: response.subjects, error: response.error };
  }
}

export { subjectPlans, subjectsPlan }