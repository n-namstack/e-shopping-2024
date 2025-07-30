# Database Organization

This directory contains all SQL files organized by purpose and functionality.

## 📁 Directory Structure

### `/schema` - Core Database Structure
Contains the main database schema and setup files:
- **`supabaseSchema.sql`** - Main database schema definition
- **`quick-setup.sql`** - Quick database setup script
- **`get-db-structure.sql`** - Script to view current database structure
- **`check-table-structure.sql`** - Utility to check table structures

### `/migrations` - Database Migrations
Contains all database migration files in chronological order:
- **Timestamped migrations** (20240320000000_*) - Supabase migrations
- **Feature additions** - Payment timing, dual roles, product views
- **Database enhancements** - Performance and feature improvements
- **Seller stats migrations** - Analytics and statistics updates

### `/functions` - Database Functions
Contains stored procedures and functions:
- **`delete-user-function*.sql`** - User account deletion functions (various versions)
- **`restore_functions.sql`** - Function restoration utilities

### `/fixes` - Bug Fixes and Repairs
Contains scripts to fix database issues:
- **`fix-orphaned-records-and-constraints.sql`** - Orphaned data cleanup
- **`fix-analytics-database.sql`** - Analytics table fixes
- **`fix-rls-policies*.sql`** - Row Level Security policy fixes
- **`fix-payments-status.sql`** - Payment status corrections
- **`complete-fix-all-issues.sql`** - Comprehensive fix script
- **`quick-fix-profile.sql`** - Profile-specific fixes

### `/cleanup` - Data Cleanup Scripts
Contains scripts for data maintenance:
- **`cleanup-duplicate-profiles.sql`** - Remove duplicate user profiles
- **`cleanup-user-data*.sql`** - User data cleanup (various strategies)
- **`sync-auth-profiles*.sql`** - Sync auth users with profiles table

### `/policies` - Security and Policies
Contains RLS policies and security configurations:
- **`shop_storage_policies.sql`** - Storage bucket policies for shops
- **`setup-storage-bucket.sql`** - Storage bucket configuration

### `/analytics` - Performance and Analytics
Contains analytics and performance-related scripts:
- **`indexing_strategy.sql`** - Database indexing optimization
- **`optimized_salary_view_fixed.sql`** - Salary analytics optimization
- **`data_quality_diagnostic.sql`** - Data quality analysis
- **`debug_payment_status.sql`** - Payment debugging tools

### `/archive` - Deprecated Files
Contains old or deprecated SQL files that are no longer actively used.

## 🚀 Usage Guidelines

### For Development:
1. **Schema changes** → Add to `/migrations`
2. **Bug fixes** → Add to `/fixes` 
3. **New functions** → Add to `/functions`
4. **Data cleanup** → Add to `/cleanup`
5. **Performance improvements** → Add to `/analytics`

### Naming Conventions:
- **Migrations**: `YYYYMMDD_description.sql` or descriptive names
- **Fixes**: `fix-[issue-description].sql`
- **Functions**: `[function-name]-function.sql`
- **Cleanup**: `cleanup-[data-type].sql`

### Execution Order:
1. **Schema** files first (database structure)
2. **Migrations** in chronological order
3. **Functions** after schema is ready
4. **Policies** after tables exist
5. **Fixes** as needed
6. **Cleanup** for maintenance

## 📋 Quick Reference

### Most Important Files:
- **`schema/supabaseSchema.sql`** - Main database schema
- **`functions/delete-user-function.sql`** - User deletion functionality
- **`cleanup/sync-auth-profiles-safe.sql`** - Profile sync solution
- **`fixes/complete-fix-all-issues.sql`** - Comprehensive fixes

### Common Tasks:
```bash
# View database structure
psql -f database/schema/get-db-structure.sql

# Fix profile sync issues
psql -f database/cleanup/sync-auth-profiles-safe.sql

# Clean duplicate profiles
psql -f database/cleanup/cleanup-duplicate-profiles.sql

# Apply comprehensive fixes
psql -f database/fixes/complete-fix-all-issues.sql
```

## ⚠️ Important Notes

- Always backup your database before running any scripts
- Test scripts in development environment first
- Follow the execution order for dependencies
- Some fixes may require specific Supabase setup
- Archive old files instead of deleting them

## 🔗 Related Documentation

- See `/docs` folder for detailed implementation guides
- Check `ACCOUNT_DELETION_*.md` for deletion strategy
- Review `SOCIAL_LOGIN_PROFILE_FIX.md` for auth issues
- Consult `APP_STORE_COMPLIANCE_FIXES.md` for compliance

---

*Last updated: July 30, 2024*
*Total files organized: 53 SQL files* 