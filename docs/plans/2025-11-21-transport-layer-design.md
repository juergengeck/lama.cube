# Transport Layer Architecture Design

**Date:** 2025-11-21
**Status:** Design Complete - Ready for Implementation
**Owner:** Transport Layer Team

## Executive Summary

This design establishes a platform-agnostic transport layer abstraction for Refinio ONE, enabling the system to run on multiple platforms (browser, Node.js, iOS, Linux) with different network APIs. The transport layer provides "dumb byte pipes" while `connection.core` handles QuicVC protocol, identity verification, and connection lifecycle management.

## Problem Statement

Refinio ONE must run on multiple platforms with different network capabilities:
- **Browser**: WebRTC only (no raw UDP due to security sandbox)
- **Node.js**: dgram (UDP) + werift (WebRTC)
- **iOS**: Native frameworks
- **Linux**: Native sockets + WebRTC

Currently, transport-specific code is mixed into `connection.core`, making it difficult to support multiple platforms. We need a clean abstraction to write connection logic once.

## Design Decisions

### 1. Architecture: Layer Underneath connection.core

Transport layer sits **beneath** `connection.core` as a foundation layer:

```
┌─────────────────┐
│ connection.core │  ← QuicVC protocol, identity verification, CHUM
└────────┬────────┘
         │
┌────────▼────────┐
│ transport.core  │  ← Platform abstraction (interfaces only)
└────────┬────────┘
         │
    ┌────┴────┬─────────┐
    │         │         │
┌───▼───┐ ┌──▼──┐ ┌────▼────┐
│ .node │ │.browser│ │  .ios   │
└───────┘ └─────┘ └─────────┘
```

### 2. Separation of Concerns

**Transport Layer** (transport.core, transport.node, etc.):
- Raw byte delivery (UDP, WebRTC)
- Connection establishment to addresses
- Socket/session management
- Platform-specific I/O

**Connection Layer** (connection.core):
- QuicVC protocol (INITIAL, HANDSHAKE, PROTECTED packets)
- Frame handling (VC_INIT, VC_RESPONSE, STREAM, etc.)
- Credential verification (using trust.core)
- Connection lifecycle and retry logic
- CHUM protocol integration

### 3. Identity Handling: Transport-Agnostic with Credentials

Transport layer is **identity-agnostic**:
- No `Identity` or `VerifiableCredential` parameters
- Accepts optional `TransportCredentials` (API keys, TURN credentials, rotating keys)
- Application-level identity verification happens in `connection.core`

This keeps transport "dumb" while allowing transport-specific authentication (e.g., TURN servers for WebRTC).

### 4. Migration Strategy: Extract & Adapt

Extract UDP socket handling from existing `connection.core/src/transport/QuicTransport.ts`:

**Before:**
- `QuicTransport.ts` has dgram socket + QuicVC protocol mixed together

**After:**
- `transport.node/UDPTransport.ts` - Socket handling, implements `Transport` interface
- `connection.core/QuicVCConnection.ts` - QuicVC protocol, uses `Transport` interface

### 5. Pluggable Signaling for WebRTC

WebRTC requires signaling to exchange SDP offers/ICE candidates. Support multiple mechanisms:
- **UDP Discovery**: Broadcast signaling over local network
- **CHUM**: Signaling over existing authenticated channels
- **QR Code**: Bootstrap initial connection

`SignalingChannel` interface allows mix-and-match based on availability.

### 6. Implementation Priority: Node First

1. **transport.node** - Critical path for development/testing
2. **transport.browser** - User-facing (after Node is proven)
3. **transport.ios / transport.linux** - Parallel if resources allow

### 7. Package Structure: Flat Monorepo

```
packages/
  transport.core/     # Pure interfaces/types
  transport.node/     # Node.js implementation (dgram, werift)
  transport.browser/  # Browser implementation (WebRTC only)
  connection.core/    # Uses transport.core (updated)
  trust.core/         # Crypto primitives (existing)
```

Matches existing pattern (`lama.cube`, `lama.browser`, `connection.core`, etc.).

## Core Interfaces

### Transport Interface

```typescript
// transport.core/src/Transport.ts
interface Transport {
  readonly type: 'udp' | 'webrtc' | 'websocket'

  connect(
    address: TransportAddress,
    credentials?: TransportCredentials
  ): Promise<Connection>

  listen(options?: ListenOptions): Promise<Listener>

  // Optional: Connectionless datagram support (UDP yes, WebRTC no)
  sendDatagram?(
    data: Uint8Array,
    address: TransportAddress
  ): Promise<void>
}

interface Connection extends EventEmitter {
  readonly address: TransportAddress
  readonly localAddress: TransportAddress
  readonly connected: boolean

  send(data: Uint8Array): Promise<void>
  close(): Promise<void>

  // Events: 'data', 'close', 'error'
}

interface Listener extends EventEmitter {
  readonly address: TransportAddress

  close(): Promise<void>

  // Events: 'connection', 'error'
}
```

### Signaling Interface

```typescript
// transport.core/src/SignalingChannel.ts
interface SignalingChannel {
  sendSignal(
    target: TransportAddress,
    signal: SignalingMessage
  ): Promise<void>

  onSignal(
    handler: (from: TransportAddress, signal: SignalingMessage) => void
  ): void
}

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'close'
  payload: any  // SDP string or ICE candidate object
  timestamp: number
}
```

## Integration Example

### At Startup (lama.cube)

```typescript
// Platform creates transport
const udpTransport = new UDPTransport()
await udpTransport.listen({ port: 5000 })

// Inject into connection.core
const quicvcConnection = new QuicVCConnection({
  transport: udpTransport,
  nodeOneCore: nodeOneCore,
  trustManager: trustManager
})

// Register with connection manager
connectionManager.registerTransport(quicvcConnection)
```

### Connection Establishment Flow

1. **connection.core** decides to connect to peer (discovery, pairing, etc.)
2. **connection.core** calls `transport.connect(peerAddress, credentials)`
3. **transport.node** establishes raw connection (UDP or WebRTC)
4. **connection.core** runs QuicVC handshake over the connection:
   - Sends VC_INIT frame with local credential
   - Receives VC_RESPONSE with peer credential
   - Verifies credentials using trust.core
   - Establishes PROTECTED connection
5. **connection.core** notifies higher layers (CHUM, etc.) connection is ready

### Key Separation

- **Transport layer**: "Here's a byte pipe to this address"
- **Connection layer**: "Here's an authenticated, verified connection to this Identity"

## Error Handling

Following "fail fast, no fallbacks" principle:

### Transport Layer Errors

```typescript
class TransportError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly address?: TransportAddress
  ) {
    super(message)
    this.name = 'TransportError'
  }
}

// Error codes:
// - CONNECTION_REFUSED
// - NETWORK_UNREACHABLE
// - TIMEOUT
// - ADDRESS_IN_USE
```

**No mitigation at transport layer:**
- ❌ No automatic retries
- ❌ No connection pooling
- ❌ No timeouts (caller uses Promise.race())
- ❌ No queuing (send() fails if closed)

### Connection Layer Responsibilities

`connection.core` handles:
- ✅ Retry logic with backoff
- ✅ Peer reachability tracking
- ✅ Connection fallback (UDP → WebRTC)
- ✅ QuicVC handshake timeouts

## Testing Strategy

### Unit Tests

**transport.node**:
- UDP socket creation/binding
- Send/receive with mock dgram
- Connection lifecycle (open, send, close)
- Datagram support
- Error conditions (port in use, network unreachable)

**connection.core** (updated):
- QuicVC protocol over mock Transport
- Handshake flow with mock credentials
- Credential verification integration
- Connection fallback logic

### Integration Tests

**End-to-end flows** (connection.core/test/integration/):
- Two peers establish connection via UDPTransport
- QuicVC handshake completes successfully
- CHUM messages flow over authenticated connection
- Connection survives transport errors (reconnect)

### Isolated Testing

```typescript
// Test UDP transport without connection layer
const transport = new UDPTransport()
await transport.listen({ port: 5000 })
const conn = await transport.connect({ host: 'localhost', port: 5000 })
await conn.send(Buffer.from('hello'))
```

## Migration Plan

### Phase 1: Create Abstraction (Week 1)

1. Create `transport.core` package with interfaces
2. Create `transport.node` package structure
3. Extract UDP socket code from `QuicTransport.ts` into `UDPTransport.ts`

### Phase 2: Refactor connection.core (Week 1-2)

4. Refactor `QuicTransport.ts` → `QuicVCConnection.ts`
5. Update to accept `Transport` in constructor
6. Remove direct dgram dependencies

### Phase 3: Integration (Week 2)

7. Update lama.cube to instantiate UDPTransport
8. Inject into connection.core
9. Run integration tests
10. Validate existing functionality works

### Phase 4: Cleanup (Week 2)

11. Mark old `QuicTransport.ts` deprecated
12. Update documentation
13. Remove deprecated code after validation period

### Future Phases

- **Phase 5**: Add WebRTC support to transport.node (werift)
- **Phase 6**: Implement transport.browser (WebRTC only)
- **Phase 7**: Add transport.ios and transport.linux

## File Structure

```
packages/
  transport.core/
    src/
      Transport.ts              # Transport interface
      Connection.ts             # Connection interface
      Listener.ts               # Listener interface
      SignalingChannel.ts       # Signaling abstraction
      TransportAddress.ts       # Address types
      TransportCredentials.ts   # Credential types
      errors.ts                 # Error classes
      index.ts                  # Public exports
    package.json
    tsconfig.json

  transport.node/
    src/
      UDPTransport.ts           # dgram-based implementation
      UDPConnection.ts          # UDP connection wrapper
      UDPListener.ts            # UDP listener
      WebRTCTransport.ts        # werift-based (future)
      signaling/
        UDPDiscoverySignaling.ts
      index.ts
    package.json
    tsconfig.json

  connection.core/
    src/
      QuicVCConnection.ts       # Updated (was QuicTransport.ts)
      signaling/
        CHUMSignaling.ts        # CHUM-based signaling
        QRSignaling.ts          # QR code bootstrap
      # ... rest of connection.core
```

## Dependencies

### transport.core
- No dependencies (pure interfaces)

### transport.node
- Dependencies: `transport.core`, Node.js built-ins (dgram)
- Future: `werift-webrtc` for WebRTC

### connection.core
- Dependencies: `transport.core`, `trust.core`, `@refinio/one.core`, `@refinio/one.models`

### Dependency Flow
```
connection.core → transport.core ← transport.node
      ↓                               ↓
  trust.core                    Node.js (dgram)
      ↓
@refinio/one.core
```

## Success Criteria

1. ✅ `transport.node` passes all unit tests
2. ✅ `connection.core` integration tests pass with new transport layer
3. ✅ Existing lama.cube functionality works unchanged
4. ✅ Clean separation: no platform-specific code in connection.core
5. ✅ Ready to add transport.browser without touching connection.core

## Open Questions

None - design is complete and validated.

## References

- Original architecture proposal (provided by user)
- Existing `connection.core/src/transport/QuicTransport.ts`
- `connection.core/CLAUDE.md` - Connection architecture
- QuicVC protocol documentation
- trust.core integration points

## Approvals

- [x] Architecture validated
- [x] Interface design validated
- [x] Migration strategy validated
- [x] Integration points validated
- [x] Error handling validated
- [x] Testing strategy validated

**Status: Ready for Implementation**
