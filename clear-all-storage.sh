#!/bin/bash
# Clear all ONE.core storage for fresh start

echo "Clearing all ONE.core storage..."

# Clear ONE.core main storage (Topics, Groups, HashGroups, etc.)
echo "Clearing OneDB directory..."
rm -rf OneDB

# Preserve memory directory (subjects, keywords, summaries, HTML exports)
echo "Preserving memory directory (analysis artifacts)..."

# Clear browser storage (Electron stores it in userData)
echo "Clearing browser storage..."
rm -rf ~/Library/Application\ Support/lama/IndexedDB
rm -rf ~/Library/Application\ Support/lama/Local\ Storage
rm -rf ~/Library/Application\ Support/lama/Session\ Storage

echo "✅ All storage cleared. Memory preserved. Ready for fresh start."