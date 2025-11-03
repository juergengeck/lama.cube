#!/bin/bash
# Clear all ONE.core storage for fresh start

echo "Clearing all ONE.core storage..."

# CRITICAL: Preserve memories before clearing
MEMORY_BACKUP="/tmp/lama-memory-backup-$(date +%s)"
if [ -d "OneDB/memory-storage" ]; then
  echo "⚠️  BACKING UP MEMORIES to $MEMORY_BACKUP"
  cp -r OneDB/memory-storage "$MEMORY_BACKUP"
  echo "   Memory backup complete. Restore with: cp -r $MEMORY_BACKUP OneDB/memory-storage"
fi

# Clear ONE.core storage (all instances)
echo "Clearing OneDB directory..."
rm -rf OneDB

# Restore memories
if [ -d "$MEMORY_BACKUP" ]; then
  echo "✅ RESTORING MEMORIES"
  mkdir -p OneDB
  cp -r "$MEMORY_BACKUP" OneDB/memory-storage
  echo "   Memories restored to OneDB/memory-storage"
fi

# Clear browser storage (Electron stores it in userData)
echo "Clearing browser storage..."
rm -rf ~/Library/Application\ Support/lama/IndexedDB
rm -rf ~/Library/Application\ Support/lama/Local\ Storage
rm -rf ~/Library/Application\ Support/lama/Session\ Storage

echo "All storage cleared. Memories preserved. Ready for fresh start."