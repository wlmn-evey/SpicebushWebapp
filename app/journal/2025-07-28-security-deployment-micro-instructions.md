# Security and Deployment Micro-Instructions

## Phase 1.1: Database Security - Creating Read-Only Database User

### Current Situation
- **Security Risk**: Using postgres superuser in production
- **Location**: `/lib/content-db-direct.ts`
- **Current Password**: Hardcoded as 'your-super-secret-and-long-postgres-password'
- **Goal**: Create a read-only user with minimal privileges

### Prerequisites Check

#### Instruction 1.1.1: Verify PostgreSQL Access
**Action**: Test current database connection
**Command**: 
```bash
psql -U postgres -h localhost -d spicebush_content -c "SELECT current_user, current_database();"
```
**Expected Output**: 
```
 current_user | current_database 
--------------+------------------
 postgres     | spicebush_content
```
**Success Criteria**: Command returns without error and shows postgres user
**If Failed**: Contact senior developer - PostgreSQL may not be running or accessible

#### Instruction 1.1.2: Backup Current Working Configuration
**Action**: Create backup of current database configuration file
**Command**:
```bash
cp /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/lib/content-db-direct.ts /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/lib/content-db-direct.ts.backup
```
**Success Criteria**: File `.backup` exists
**Verification**:
```bash
ls -la /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/lib/content-db-direct.ts.backup
```

### Create Read-Only User

#### Instruction 1.1.3: Generate Secure Password
**Action**: Create a secure password for the read-only user
**Command**:
```bash
openssl rand -base64 32
```
**Expected Output**: A 32-character random string like `Kj8n2Ld9Qm3Rt5Yw7Xz1Bc4Vf6Gh0Np2`
**Success Criteria**: Password is generated and copied to clipboard/notepad
**Important**: Save this password in a secure location - you'll need it in step 1.1.5

#### Instruction 1.1.4: Create Read-Only Database User
**Action**: Create new PostgreSQL user with read-only privileges
**Command**:
```bash
psql -U postgres -h localhost -d spicebush_content
```
**Then execute these SQL commands one by one**:
```sql
-- Create the user (replace YOUR_GENERATED_PASSWORD with password from step 1.1.3)
CREATE USER spicebush_readonly WITH PASSWORD 'YOUR_GENERATED_PASSWORD';

-- Grant connection privilege
GRANT CONNECT ON DATABASE spicebush_content TO spicebush_readonly;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO spicebush_readonly;

-- Grant SELECT on all existing tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO spicebush_readonly;

-- Grant SELECT on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO spicebush_readonly;

-- Verify user was created
\du spicebush_readonly

-- Exit psql
\q
```
**Success Criteria**: Each command returns without error, and `\du` shows the new user
**Rollback**: If any command fails, run:
```sql
DROP USER IF EXISTS spicebush_readonly;
```

#### Instruction 1.1.5: Test Read-Only User Access
**Action**: Verify the new user can read but not write
**Test Read Access**:
```bash
psql -U spicebush_readonly -h localhost -d spicebush_content -c "SELECT COUNT(*) FROM articles;"
```
**Expected**: Returns a count number without error

**Test Write Restriction**:
```bash
psql -U spicebush_readonly -h localhost -d spicebush_content -c "INSERT INTO articles (title) VALUES ('test');"
```
**Expected**: ERROR: permission denied for table articles
**Success Criteria**: Read succeeds, write fails with permission error

### Update Application Configuration

#### Instruction 1.1.6: Create Environment Variable File
**Action**: Create .env.local file for secure configuration
**Command**:
```bash
touch /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/.env.local
```
**Then add content**:
```bash
echo "DB_USER=spicebush_readonly" >> /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/.env.local
echo "DB_PASSWORD=YOUR_GENERATED_PASSWORD" >> /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/.env.local
echo "DB_HOST=localhost" >> /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/.env.local
echo "DB_NAME=spicebush_content" >> /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/.env.local
```
**Important**: Replace YOUR_GENERATED_PASSWORD with the actual password from step 1.1.3
**Success Criteria**: File exists with 4 lines
**Verification**:
```bash
cat /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/.env.local | wc -l
```
Should output: 4

#### Instruction 1.1.7: Update Git Ignore
**Action**: Ensure .env.local is not committed to git
**Command**:
```bash
echo ".env.local" >> /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/.gitignore
```
**Success Criteria**: .gitignore contains .env.local
**Verification**:
```bash
grep ".env.local" /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/.gitignore
```

#### Instruction 1.1.8: Test Configuration Before Code Changes
**Action**: Verify environment variables are accessible
**Create test file**:
```bash
cat > /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/test-env.js << 'EOF'
require('dotenv').config({ path: '.env.local' });
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***hidden***' : 'NOT SET');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_NAME:', process.env.DB_NAME);
EOF
```
**Run test**:
```bash
cd /Users/eveywinters/CascadeProjects/SpicebushWebapp/app && node test-env.js
```
**Expected Output**:
```
DB_USER: spicebush_readonly
DB_PASSWORD: ***hidden***
DB_HOST: localhost
DB_NAME: spicebush_content
```
**Cleanup**:
```bash
rm /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/test-env.js
```

### Prepare for Code Update

#### Instruction 1.1.9: Document Current State
**Action**: Record current database configuration for rollback
**Command**:
```bash
grep -n "user:\|password:\|host:\|database:" /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/lib/content-db-direct.ts > /tmp/current-db-config.txt
cat /tmp/current-db-config.txt
```
**Success Criteria**: Output shows current hardcoded values with line numbers
**Save Output**: Copy this output to a safe place for potential rollback

#### Instruction 1.1.10: Final Verification Checklist
**Action**: Verify all prerequisites before code changes
**Checklist** (mark each as done):
- [ ] PostgreSQL is accessible
- [ ] Backup file created (content-db-direct.ts.backup)
- [ ] Read-only user created (spicebush_readonly)
- [ ] Password saved securely
- [ ] Read-only user can SELECT from tables
- [ ] Read-only user CANNOT INSERT/UPDATE/DELETE
- [ ] .env.local file created with credentials
- [ ] .env.local added to .gitignore
- [ ] Environment variables test passed
- [ ] Current configuration documented

**Success Criteria**: All items checked
**If Any Failed**: Do not proceed to code changes. Restore from backup if needed:
```bash
cp /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/lib/content-db-direct.ts.backup /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/lib/content-db-direct.ts
```

### Next Steps
Once all verifications pass, proceed to Phase 1.2: Update Application Code to Use Environment Variables

---

## Emergency Rollback Procedure

If anything goes wrong at any point:

1. **Restore original file**:
```bash
cp /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/lib/content-db-direct.ts.backup /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/lib/content-db-direct.ts
```

2. **Remove read-only user** (if created):
```bash
psql -U postgres -h localhost -d spicebush_content -c "DROP USER IF EXISTS spicebush_readonly;"
```

3. **Remove .env.local**:
```bash
rm /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/.env.local
```

4. **Test original configuration still works**:
```bash
cd /Users/eveywinters/CascadeProjects/SpicebushWebapp/app && npm run dev
```

5. **Document what went wrong** for senior developer review