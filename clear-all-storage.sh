#!/bin/bash
# Clear all ONE.core storage for fresh start

echo "Clearing all ONE.core storage..."

# CRITICAL: Preserve memories before clearing
MEMORY_BACKUP="/tmp/lama-memory-backup-$(date +%s)"
if [ -d "memory" ]; then
  echo "⚠️  BACKING UP MEMORIES to $MEMORY_BACKUP"
  cp -r memory "$MEMORY_BACKUP"
  echo "   Memory backup complete. Restore with: cp -r $MEMORY_BACKUP memory"
fi

# Clear ONE.core storage (all instances)
echo "Clearing OneDB directory..."
rm -rf OneDB

# Restore memories
if [ -d "$MEMORY_BACKUP" ]; then
  echo "✅ RESTORING MEMORIES"
  cp -r "$MEMORY_BACKUP" memory
  echo "   Memories restored to memory/"
fi

# Clear browser storage (Electron stores it in userData)
echo "Clearing browser storage..."
rm -rf ~/Library/Application\ Support/lama/IndexedDB
rm -rf ~/Library/Application\ Support/lama/Local\ Storage
rm -rf ~/Library/Application\ Support/lama/Session\ Storage

echo "All storage cleared. Memories preserved. Ready for fresh start."