// Export local modules (platform-specific)
// NOTE: CoreModule removed - lama.cube renderer is UI-only, no ONE.core models
export { AIModule } from './AIModule';
export { ConnectionModule } from './ConnectionModule';
export { TrustModule } from './TrustModule';

// Re-export shared modules from lama.core
export { ChatModule } from '@refinio/lama.core/modules';
