/**
 * Invitation URL Parser
 * 
 * Consolidated utility for parsing invitation URLs following the one.leute reference implementation.
 * Based on one.leute/src/utils/pairing.ts pattern.
 * 
 * Replaces duplicate logic from:
 * - InviteManager.extractInvitationFromHash()
 * - NetworkSettingsService.parseInvitationUrl()
 */

// NO ONE.CORE IMPORTS IN BROWSER - Use simple types instead
export type InvitationMode = 'IoM' | 'IoP';
export type InviteType = 'commserver' | 'webrtc';

export interface Invitation {
  token: string;
  publicKey: string;
  url: string;
}

export interface ParsedInvitation {
  type: InviteType;
  mode: InvitationMode | undefined;
  invitation: Invitation | undefined;
  error?: string;
}

export interface ParsedWebRTCInvitation {
  type: 'webrtc';
  signalType: 'offer' | 'answer';
  sessionId: string;
  error?: string;
}

/**
 * Detect invite type from URL
 */
export function detectInviteType(url: string): InviteType | null {
  // WebRTC format: https://lama.one/webrtc#... (base64url encoded)
  if (url.includes('/webrtc#')) {
    return 'webrtc';
  }
  // CommServer format: https://edda.one/invites/invite.../?invited=true#...
  if (url.includes('invites/invitePartner/') || url.includes('invites/inviteDevice/')) {
    return 'commserver';
  }
  // Try to parse hash to detect format
  const hashIndex = url.indexOf('#');
  if (hashIndex !== -1) {
    const fragment = url.substring(hashIndex + 1);
    // CommServer uses URL-encoded JSON, WebRTC uses base64url
    try {
      const decoded = decodeURIComponent(fragment);
      const parsed = JSON.parse(decoded);
      if (parsed.token && parsed.url) {
        return 'commserver';
      }
    } catch {
      // Not URL-encoded JSON, try base64url (WebRTC)
      try {
        const webrtcData = decodeBase64url(fragment);
        if (webrtcData && webrtcData.signal && webrtcData.sessionId) {
          return 'webrtc';
        }
      } catch {
        // Not valid either
      }
    }
  }
  return null;
}

/**
 * Parse WebRTC invitation URL
 */
export function parseWebRTCInvitationUrl(url: string): ParsedWebRTCInvitation {
  try {
    const hashIndex = url.indexOf('#');
    if (hashIndex === -1) {
      return { type: 'webrtc', signalType: 'offer', sessionId: '', error: 'No hash fragment in URL' };
    }

    const fragment = url.substring(hashIndex + 1);
    const data = decodeBase64url(fragment);

    if (!data || !data.signal || !data.sessionId) {
      return { type: 'webrtc', signalType: 'offer', sessionId: '', error: 'Invalid WebRTC invitation format' };
    }

    return {
      type: 'webrtc',
      signalType: data.signal.type === 'answer' ? 'answer' : 'offer',
      sessionId: data.sessionId,
      error: undefined
    };
  } catch (error) {
    return {
      type: 'webrtc',
      signalType: 'offer',
      sessionId: '',
      error: error instanceof Error ? error.message : 'Failed to parse WebRTC URL'
    };
  }
}

/**
 * Decode base64url to JSON object
 */
function decodeBase64url(base64: string): any {
  // Handle base64url
  let normalized = base64.replace(/-/g, '+').replace(/_/g, '/');
  while (normalized.length % 4) {
    normalized += '=';
  }
  return JSON.parse(atob(normalized));
}

/**
 * Parse invitation URL following the one.leute pattern
 *
 * @param invitationLink URL in format: https://edda.one/invites/invitePartner/?invited=true#[encoded-json]
 * @returns Parsed invitation with mode detection
 */
export function parseInvitationUrl(invitationLink: string): ParsedInvitation {
  try {
    // 1. Detect invitation mode based on URL pattern (from one.leute)
    let mode: InvitationMode | undefined;

    if (invitationLink.includes('invites/inviteDevice/?invited=true')) {
      mode = 'IoM';  // Instance of Machine (device)
    } else if (invitationLink.includes('invites/invitePartner/?invited=true')) {
      mode = 'IoP';  // Instance of Person (partner)
    }

    // 2. Extract and parse invitation data (from one.leute pattern)
    const invitation = getPairingInformation(invitationLink);

    if (!invitation) {
      return {
        type: 'commserver',
        mode,
        invitation: undefined,
        error: 'Failed to extract valid invitation data from URL'
      };
    }

    return {
      type: 'commserver',
      mode,
      invitation,
      error: undefined
    };

  } catch (error) {
    return {
      type: 'commserver',
      mode: undefined,
      invitation: undefined,
      error: error instanceof Error ? error.message : 'Unknown parsing error'
    };
  }
}

/**
 * Extract pairing information from invitation URL
 * Simple validation without ONE.core dependency
 * 
 * @param invitationLink URL containing invitation data in hash fragment
 * @returns Invitation object if valid, undefined otherwise
 */
function getPairingInformation(invitationLink: string): Invitation | undefined {
  try {
    const invitation = JSON.parse(
      decodeURIComponent(invitationLink.split('#')[1])
    ) as Invitation;
    
    // Simple validation - check required fields exist
    if (invitation && 
        typeof invitation.token === 'string' &&
        typeof invitation.publicKey === 'string' &&
        typeof invitation.url === 'string') {
      return invitation;
    }
    
    return undefined;
  } catch (_e) {
    return undefined;
  }
}

/**
 * Legacy compatibility function for existing InviteManager usage
 * Maps to the new parseInvitationUrl function
 * 
 * @param url Invitation URL
 * @returns Invitation data or null (legacy format)
 */
export function extractInvitationFromHash(url: string): any | null {
  const result = parseInvitationUrl(url);
  
  if (result.invitation) {
    // Return in the format expected by existing code
    return {
      token: result.invitation.token,
      publicKey: result.invitation.publicKey,
      url: result.invitation.url
    };
  }
  
  return null;
}

/**
 * Check if a URL is a valid invitation URL
 * 
 * @param url URL to check
 * @returns true if URL contains valid invitation data
 */
export function isValidInvitationUrl(url: string): boolean {
  const result = parseInvitationUrl(url);
  return result.invitation !== undefined && !result.error;
}

/**
 * Get invitation mode from URL without full parsing
 * 
 * @param url Invitation URL
 * @returns Invitation mode or undefined
 */
export function getInvitationMode(url: string): InvitationMode | undefined {
  if (url.includes('invites/inviteDevice/?invited=true')) {
    return 'IoM';
  } else if (url.includes('invites/invitePartner/?invited=true')) {
    return 'IoP';
  }
  return undefined;
} 