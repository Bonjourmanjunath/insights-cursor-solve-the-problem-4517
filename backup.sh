#!/bin/bash

# 🚀 FMR Insights Navigator - Auto Backup Script
# This script automatically saves your changes to Git and GitHub

echo "🔄 Starting automatic backup..."

# Check if there are any changes
if git diff --quiet && git diff --cached --quiet; then
    echo "✅ No changes to backup - everything is up to date!"
    exit 0
fi

# Show what files have changed
echo "📝 Changes detected:"
git status --short

# Add all changes
echo "📦 Staging changes..."
git add .

# Create timestamp for commit message
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

# Commit with timestamp
echo "💾 Committing changes..."
git commit -m "🔄 Auto backup: $TIMESTAMP

- ✅ Automatic backup of all changes
- 📝 Timestamp: $TIMESTAMP
- 🔧 Files: $(git diff --cached --name-only | wc -l) files changed"

# Push to GitHub
echo "☁️ Uploading to GitHub..."
git push origin main

# Check if push was successful
if [ $? -eq 0 ]; then
    echo "✅ Backup successful!"
    echo "📊 Local backup: $(git rev-parse HEAD)"
    echo "🌐 GitHub backup: https://github.com/Bonjourmanjunath/insights"
else
    echo "❌ Backup failed! Check your internet connection."
    exit 1
fi

echo "🎉 All changes are now safely backed up!" 