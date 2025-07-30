# Photo Management System - Test Suite Documentation

## Overview

This document provides comprehensive documentation for the photo management system test suite, including setup instructions, execution procedures, and maintenance guidelines.

## Test Suite Architecture

### Test Types and Coverage

#### 1. Unit Tests
**Location**: `/src/test/unit/`
- `media-storage.test.ts` - Core media storage functionality
- `image-upload-component.test.ts` - Client-side upload component logic

**Coverage Areas**:
- File validation (type, size, dimensions)
- Storage provider management
- Media upload processing
- Error handling scenarios
- UI state management

#### 2. Integration Tests
**Location**: `/src/test/integration/`
- `photo-upload.test.ts` - Form validation and database integration
- `photo-management-full-workflow.test.ts` - Complete system workflow

**Coverage Areas**:
- Database operations
- API endpoint integration
- Authentication workflows
- File system operations
- Performance optimization integration

#### 3. End-to-End Tests
**Location**: `/e2e/`
- `admin-photo-management.spec.ts` - Gallery management functionality
- `admin-photo-upload.spec.ts` - Upload interface testing
- `photo-management-comprehensive.spec.ts` - Complete E2E workflows

**Coverage Areas**:
- Complete user workflows
- Cross-browser compatibility
- Mobile responsiveness
- Performance monitoring
- Error recovery scenarios

#### 4. Performance Tests
**Location**: `/src/test/performance/`
- `photo-management.perf.test.ts` - Performance benchmarks and monitoring

**Coverage Areas**:
- Upload performance
- Gallery loading speed
- Database query optimization
- Memory management
- Caching efficiency

#### 5. Manual Testing
**Location**: `/docs/testing/`
- `photo-management-manual-test-procedures.md` - Human testing procedures

**Coverage Areas**:
- User experience validation
- Accessibility compliance
- Real-world usage scenarios
- Cross-device compatibility

## Test Setup and Configuration

### Prerequisites

#### Development Environment
```bash
# Node.js and npm
node --version  # Should be >= 18.0.0
npm --version   # Should be >= 9.0.0

# Install dependencies
npm install

# Install test dependencies
npm install --save-dev @playwright/test vitest @testing-library/react
```

#### Test Database Setup
```bash
# Set up test database (if using separate test DB)
export DATABASE_URL="postgresql://test_user:test_pass@localhost:5432/spicebush_test"

# Run migrations for test database
npm run db:migrate:test
```

#### Environment Variables
Create `.env.test` file:
```env
# Database
DATABASE_URL=postgresql://test_user:test_pass@localhost:5432/spicebush_test

# Authentication
AUTH_SECRET=test-secret-key
ADMIN_EMAIL=admin@test.local

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./test-uploads

# API URLs
API_BASE_URL=http://localhost:3000
```

### Test File Structure
```
app/
├── src/
│   └── test/
│       ├── setup.ts                    # Test configuration
│       ├── unit/                       # Unit tests
│       │   ├── media-storage.test.ts
│       │   └── image-upload-component.test.ts
│       ├── integration/                # Integration tests
│       │   ├── photo-upload.test.ts
│       │   └── photo-management-full-workflow.test.ts
│       └── performance/                # Performance tests
│           └── photo-management.perf.test.ts
├── e2e/                               # End-to-end tests
│   ├── admin-photo-management.spec.ts
│   ├── admin-photo-upload.spec.ts
│   └── photo-management-comprehensive.spec.ts
├── docs/testing/                      # Test documentation
│   ├── photo-management-manual-test-procedures.md
│   └── photo-management-test-suite-documentation.md
└── test-data/                         # Test assets
    ├── images/
    │   ├── valid-small.jpg
    │   ├── valid-medium.jpg
    │   ├── valid-large.jpg
    │   └── invalid-oversized.jpg
    └── fixtures/
        └── mock-photos.json
```

## Running Tests

### Unit Tests
```bash
# Run all unit tests
npm run test:unit

# Run specific unit test file
npm run test:unit -- media-storage.test.ts

# Run with coverage
npm run test:unit:coverage

# Watch mode for development
npm run test:unit:watch
```

### Integration Tests
```bash
# Run all integration tests
npm run test:integration

# Run specific integration test
npm run test:integration -- photo-upload.test.ts

# Run with detailed output
npm run test:integration -- --verbose
```

### End-to-End Tests
```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run all E2E tests
npm run test:e2e

# Run specific E2E test
npm run test:e2e -- admin-photo-upload.spec.ts

# Run in headed mode (see browser)
npm run test:e2e -- --headed

# Run on specific browser
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=firefox
npm run test:e2e -- --project=webkit

# Run mobile tests
npm run test:e2e -- --project=mobile-chrome
```

### Performance Tests
```bash
# Run performance tests
npm run test:performance

# Run with performance profiling
npm run test:performance:profile

# Generate performance report
npm run test:performance:report
```

### All Tests
```bash
# Run complete test suite
npm run test:all

# Run with coverage report
npm run test:all:coverage

# Run in CI mode (no watch, exit on completion)
npm run test:ci
```

## Test Data Management

### Test Image Assets
Store test images in `/test-data/images/`:

```bash
# Create test images
test-data/
└── images/
    ├── classroom-small.jpg      # < 1MB, valid
    ├── classroom-medium.jpg     # 2-3MB, valid
    ├── classroom-large.jpg      # 8-9MB, valid (near limit)
    ├── outdoor-activity.png     # Valid PNG
    ├── art-project.webp         # Valid WebP
    ├── animation-demo.gif       # Valid GIF
    ├── too-large.jpg           # > 10MB, should be rejected
    ├── too-small.jpg           # < 200x200px, should be rejected
    ├── invalid-format.txt      # Wrong file type
    └── corrupted.jpg           # Corrupted file for error testing
```

### Mock Data
Use structured mock data for consistent testing:

```json
// test-data/fixtures/mock-photos.json
[
  {
    "id": "test-photo-1",
    "title": "Classroom Activities",
    "description": "Children engaged in hands-on learning",
    "filename": "classroom-1.jpg",
    "url": "/uploads/classroom-1.jpg",
    "size": 2048000,
    "mimetype": "image/jpeg",
    "tags": ["classroom", "children", "learning"],
    "uploaded_at": "2024-01-15T10:30:00Z",
    "uploaded_by": "admin@spicebush.org"
  }
]
```

## CI/CD Integration

### GitHub Actions Configuration
Create `.github/workflows/test-photo-management.yml`:

```yaml
name: Photo Management Tests

on:
  push:
    branches: [ main, develop ]
    paths:
      - 'src/pages/admin/photos/**'
      - 'src/lib/media-storage.ts'
      - 'src/components/forms/ImageUpload.astro'
      - 'e2e/admin-photo-*.spec.ts'
      - 'src/test/**/*photo*.test.ts'
  pull_request:
    branches: [ main ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
        
      - name: Run unit tests
        run: npm run test:unit:coverage
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: spicebush_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
          
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Setup test database
        run: npm run db:migrate:test
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/spicebush_test
          
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/spicebush_test

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
        
      - name: Start application
        run: npm run build && npm run preview &
        
      - name: Wait for server
        run: npx wait-on http://localhost:3000
        
      - name: Run E2E tests
        run: npm run test:e2e
        
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### Test Quality Gates
Set up quality requirements:

```json
// package.json
{
  "scripts": {
    "test:quality-gate": "npm run test:coverage && npm run test:e2e:critical"
  },
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 85,
        "lines": 85,
        "statements": 85
      },
      "src/lib/media-storage.ts": {
        "branches": 90,
        "functions": 95,
        "lines": 95,
        "statements": 95
      }
    }
  }
}
```

## Test Maintenance Guidelines

### Regular Maintenance Tasks

#### Weekly
- [ ] Review test execution times and optimize slow tests
- [ ] Update test data files if needed
- [ ] Check for and fix any flaky tests
- [ ] Review test coverage reports

#### Monthly
- [ ] Update browser versions for E2E tests
- [ ] Review and update test documentation
- [ ] Analyze and optimize performance benchmarks
- [ ] Update mock data to reflect current system state

#### Quarterly
- [ ] Review entire test suite architecture
- [ ] Update testing dependencies
- [ ] Conduct comprehensive manual testing
- [ ] Review and update testing procedures

### Adding New Tests

#### When to Add Tests
1. **New Features**: Every new feature should have corresponding tests
2. **Bug Fixes**: Add regression tests for every bug fix
3. **Performance Changes**: Update performance benchmarks
4. **UI Changes**: Update E2E tests for interface modifications

#### Test Writing Guidelines

**Unit Tests**:
```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
  });

  it('should describe expected behavior clearly', async () => {
    // Arrange
    const input = createTestData();
    
    // Act
    const result = await functionUnderTest(input);
    
    // Assert
    expect(result).toMatchExpectedOutcome();
  });
});
```

**Integration Tests**:
```typescript
describe('Feature Integration', () => {
  it('should handle complete workflow', async () => {
    // Test real integration between components
    // Use actual database/API calls where appropriate
    // Verify end-to-end behavior
  });
});
```

**E2E Tests**:
```typescript
test('User can complete task successfully', async ({ page }) => {
  // Test from user perspective
  // Use realistic scenarios
  // Verify user-visible outcomes
});
```

### Debugging Test Failures

#### Unit Test Failures
1. Check mock setup and return values
2. Verify test data matches expected format
3. Review async/await usage
4. Check for race conditions

#### Integration Test Failures
1. Verify database state before test
2. Check API endpoint responses
3. Review authentication setup
4. Verify environment variables

#### E2E Test Failures
1. Run in headed mode to see browser behavior
2. Check network requests in dev tools
3. Verify element selectors are still valid
4. Review timing issues (add proper waits)

### Performance Test Monitoring

#### Key Metrics to Track
- **Upload Speed**: Time to upload files of various sizes
- **Gallery Load Time**: Time to display photo galleries
- **Database Query Performance**: Query execution times
- **Memory Usage**: Memory consumption during operations
- **Error Rates**: Frequency of failures

#### Performance Regression Detection
```bash
# Run performance comparison
npm run test:performance:compare

# Generate performance trend report
npm run test:performance:trends

# Set up performance alerts
npm run test:performance:alerts
```

## Troubleshooting Common Issues

### Test Environment Issues

#### Database Connection Failures
```bash
# Check database status
pg_isready -h localhost -p 5432

# Reset test database
npm run db:reset:test

# Check connection string
echo $DATABASE_URL
```

#### File Upload Test Failures
```bash
# Check upload directory permissions
ls -la ./test-uploads/

# Clean up test files
npm run test:cleanup

# Verify file size limits
du -h test-data/images/*
```

#### Browser/E2E Issues
```bash
# Update browsers
npx playwright install

# Check browser versions
npx playwright --version

# Run with debug mode
npx playwright test --debug
```

### Test Data Issues

#### Stale Mock Data
- Update mock data files regularly
- Use factories for dynamic test data
- Implement data cleanup between tests

#### Missing Test Assets
- Verify all test images exist
- Check file permissions
- Regenerate corrupted test files

## Reporting and Metrics

### Test Coverage Reports
```bash
# Generate HTML coverage report
npm run test:coverage:html

# View coverage report
open coverage/index.html
```

### Performance Reports
```bash
# Generate performance report
npm run test:performance:report

# View performance trends
npm run test:performance:dashboard
```

### Test Execution Reports
```bash
# Generate test execution report
npm run test:report

# Export results for external tools
npm run test:export:junit
```

## Integration with Development Workflow

### Pre-commit Hooks
Set up Git hooks to run tests automatically:

```bash
# Install husky for Git hooks
npm install --save-dev husky

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run test:quick"
```

### IDE Integration
Configure your IDE for optimal testing:

**VS Code Settings**:
```json
{
  "jest.autoRun": "watch",
  "jest.showCoverageOnLoad": true,
  "playwright.showTrace": true
}
```

### Code Review Guidelines
- All new code must include appropriate tests
- Test coverage should not decrease
- Tests should be readable and maintainable
- Performance tests should be updated for performance-sensitive changes

---

This documentation should be updated regularly as the test suite evolves. For questions or issues, refer to the development team or update this documentation accordingly.