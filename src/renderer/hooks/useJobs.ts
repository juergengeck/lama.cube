import { useState, useEffect, useCallback } from 'react'
import { lamaBridge } from '../bridge/lama-bridge.js'

interface JobInfo {
  id: string
  type: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  lastProgress?: unknown
  error?: string
  createdAt: number
  startedAt?: number
  completedAt?: number
}

interface JobProgressEvent {
  jobId: string
  jobType: string
  data: unknown
}

export function useJobs() {
  const [jobs, setJobs] = useState<JobInfo[]>([])

  const refreshJobs = useCallback(async () => {
    const list = await lamaBridge.listJobs()
    setJobs(list)
  }, [])

  useEffect(() => {
    refreshJobs()

    const unsubProgress = lamaBridge.on('job:progress', () => {
      refreshJobs()
    })

    const unsubStatus = lamaBridge.on('job:status', () => {
      refreshJobs()
    })

    return () => {
      unsubProgress()
      unsubStatus()
    }
  }, [refreshJobs])

  const submitJob = useCallback(async (type: string, payload: unknown, resumeFrom?: unknown) => {
    const result = await lamaBridge.submitJob({ type, payload, resumeFrom })
    await refreshJobs()
    return result.jobId
  }, [refreshJobs])

  const cancelJob = useCallback(async (jobId: string) => {
    await lamaBridge.cancelJob(jobId)
    await refreshJobs()
  }, [refreshJobs])

  return { jobs, submitJob, cancelJob, refreshJobs }
}

export function useJobProgress<T = unknown>(jobId: string | null) {
  const [progress, setProgress] = useState<T | null>(null)

  useEffect(() => {
    if (!jobId) return

    const unsub = lamaBridge.on('job:progress', (data: JobProgressEvent) => {
      if (data.jobId === jobId) {
        setProgress(data.data as T)
      }
    })

    return unsub
  }, [jobId])

  return progress
}
