#!/bin/bash

# Database Quick Commands Script
# Usage: ./database/quick-commands.sh [command]

DB_DIR="$(dirname "$0")"
SUPABASE_URL=${SUPABASE_URL:-"your-supabase-url"}

echo "🗄️  Database Quick Commands"
echo "=========================="

case "$1" in
  "setup")
    echo "🚀 Setting up database schema..."
    echo "Running: schema/supabaseSchema.sql"
    # Add your database connection command here
    # psql "$SUPABASE_URL" -f "$DB_DIR/schema/supabaseSchema.sql"
    ;;
    
  "fix-profiles")
    echo "👤 Fixing profile sync issues..."
    echo "Running: cleanup/sync-auth-profiles-safe.sql"
    # psql "$SUPABASE_URL" -f "$DB_DIR/cleanup/sync-auth-profiles-safe.sql"
    ;;
    
  "clean-duplicates")
    echo "🧹 Cleaning duplicate profiles..."
    echo "Running: cleanup/cleanup-duplicate-profiles.sql"
    # psql "$SUPABASE_URL" -f "$DB_DIR/cleanup/cleanup-duplicate-profiles.sql"
    ;;
    
  "fix-all")
    echo "🔧 Running comprehensive fixes..."
    echo "Running: fixes/complete-fix-all-issues.sql"
    # psql "$SUPABASE_URL" -f "$DB_DIR/fixes/complete-fix-all-issues.sql"
    ;;
    
  "delete-user-function")
    echo "🗑️  Setting up user deletion function..."
    echo "Running: functions/delete-user-function.sql"
    # psql "$SUPABASE_URL" -f "$DB_DIR/functions/delete-user-function.sql"
    ;;
    
  "list")
    echo "📋 Available categories:"
    echo ""
    for dir in "$DB_DIR"/*/; do
      if [ -d "$dir" ]; then
        category=$(basename "$dir")
        count=$(ls -1 "$dir"/*.sql 2>/dev/null | wc -l)
        echo "  📁 $category: $count files"
      fi
    done
    ;;
    
  "help"|"")
    echo ""
    echo "Available commands:"
    echo "  setup              - Set up database schema"
    echo "  fix-profiles       - Fix profile sync issues"
    echo "  clean-duplicates   - Clean duplicate profiles"
    echo "  fix-all           - Run comprehensive fixes"
    echo "  delete-user-function - Setup user deletion"
    echo "  list              - List all categories"
    echo "  help              - Show this help"
    echo ""
    echo "📁 Directory structure:"
    echo "  schema/     - Core database structure (4 files)"
    echo "  migrations/ - Database migrations (19 files)"
    echo "  functions/  - Stored procedures (5 files)"
    echo "  fixes/      - Bug fixes (11 files)"
    echo "  cleanup/    - Data cleanup (7 files)"
    echo "  policies/   - Security policies (2 files)"
    echo "  analytics/  - Performance scripts (5 files)"
    echo "  archive/    - Deprecated files (0 files)"
    echo ""
    echo "💡 To use with Supabase:"
    echo "   1. Set SUPABASE_URL environment variable"
    echo "   2. Uncomment psql commands in this script"
    echo "   3. Run: ./database/quick-commands.sh [command]"
    ;;
    
  *)
    echo "❌ Unknown command: $1"
    echo "Run './database/quick-commands.sh help' for available commands"
    exit 1
    ;;
esac

echo ""
echo "✅ Command completed: $1" 