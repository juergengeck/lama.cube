import type { IpcMainInvokeEvent } from 'electron'
import { TransportPlanImpl } from '@refinio/transport.node'
import type { WebRTCInviteResult } from '@refinio/transport.core'

let transportPlan: TransportPlanImpl | null = null

// Store pending invites by session ID for answer completion
const pendingInvites = new Map<string, WebRTCInviteResult>()

export function initTransportPlan(): void {
  transportPlan = new TransportPlanImpl()
}

export function getTransportPlan(): TransportPlanImpl {
  if (!transportPlan) {
    throw new Error('Transport plan not initialized')
  }
  return transportPlan
}

export async function shutdownTransportPlan(): Promise<void> {
  if (transportPlan) {
    // Cancel all pending invites
    for (const invite of pendingInvites.values()) {
      invite.cancel()
    }
    pendingInvites.clear()
    await transportPlan.shutdown()
    transportPlan = null
  }
}

/**
 * Create WebRTC invite - returns URL and session ID
 */
export async function createWebRTCInvite(
  event: IpcMainInvokeEvent,
  params?: { baseUrl?: string }
): Promise<{ success: true; url: string; sessionId: string } | { success: false; error: string }> {
  console.log('[Transport] createWebRTCInvite called with params:', params)
  try {
    const plan = getTransportPlan()
    console.log('[Transport] Got transport plan, calling createWebRTCInvite...')
    const result = await plan.createWebRTCInvite(params)
    console.log('[Transport] createWebRTCInvite result:', { url: result.url?.substring(0, 50), sessionId: result.sessionId })

    // Store for later answer completion
    pendingInvites.set(result.sessionId, result)

    return {
      success: true,
      url: result.url,
      sessionId: result.sessionId
    }
  } catch (error) {
    console.error('[Transport] createWebRTCInvite failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Complete WebRTC invite with answer URL
 */
export async function completeWebRTCInvite(
  event: IpcMainInvokeEvent,
  params: { sessionId: string; answerUrl: string }
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const invite = pendingInvites.get(params.sessionId)
    if (!invite) {
      return { success: false, error: 'Invite not found or expired' }
    }

    const connection = await invite.completeWithAnswer(params.answerUrl)
    pendingInvites.delete(params.sessionId)

    console.log('[Transport] WebRTC connection established:', params.sessionId)

    return { success: true }
  } catch (error) {
    console.error('[Transport] completeWebRTCInvite failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Accept WebRTC invite from offer URL
 */
export async function acceptWebRTCInvite(
  event: IpcMainInvokeEvent,
  params: { offerUrl: string }
): Promise<{ success: true; answerUrl: string } | { success: false; error: string }> {
  try {
    const plan = getTransportPlan()
    const result = await plan.acceptWebRTCInvite(params.offerUrl)

    console.log('[Transport] WebRTC invite accepted, answer URL generated')

    return {
      success: true,
      answerUrl: result.answerUrl
    }
  } catch (error) {
    console.error('[Transport] acceptWebRTCInvite failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Cancel pending invite
 */
export async function cancelWebRTCInvite(
  event: IpcMainInvokeEvent,
  params: { sessionId: string }
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const invite = pendingInvites.get(params.sessionId)
    if (invite) {
      invite.cancel()
      pendingInvites.delete(params.sessionId)
    }
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
