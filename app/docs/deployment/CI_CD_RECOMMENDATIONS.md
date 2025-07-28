# CI/CD Recommendations for Spicebush Montessori

This document outlines recommended CI/CD strategies for automated testing, building, and deployment of the Spicebush Montessori website.

## Recommended Approach: GitHub Actions + Netlify

For a static Astro site, the combination of GitHub Actions for CI and Netlify for CD provides the best balance of simplicity, cost-effectiveness, and features.

## GitHub Actions Configuration

### Basic CI Pipeline

Create `.github/workflows/ci.yml`:

```yaml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linters
      run: |
        npm run lint
        npm run format:check
    
    - name: Type check
      run: npm run typecheck
    
    - name: Run tests
      run: npm run test:ci
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/coverage-final.json

  build:
    runs-on: ubuntu-latest
    needs: lint-and-test
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build application
      env:
        PUBLIC_SUPABASE_URL: ${{ secrets.PUBLIC_SUPABASE_URL }}
        PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.PUBLIC_SUPABASE_ANON_KEY }}
      run: npm run build
    
    - name: Upload build artifacts
      uses: actions/upload-artifact@v3
      with:
        name: dist
        path: dist/
        retention-days: 7

  accessibility:
    runs-on: ubuntu-latest
    needs: build
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Download build artifacts
      uses: actions/download-artifact@v3
      with:
        name: dist
        path: dist/
    
    - name: Run accessibility tests
      uses: a11ywatch/github-action@v1.15.0
      with:
        WEBSITE_URL: file://${{ github.workspace }}/dist/index.html
        SUBDOMAINS: false
        TLD: false

  security-scan:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Run security audit
      run: npm audit --audit-level=moderate
    
    - name: Run Snyk security scan
      uses: snyk/actions/node@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

### Deployment Pipeline

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy-netlify:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build for production
      env:
        PUBLIC_SUPABASE_URL: ${{ secrets.PUBLIC_SUPABASE_URL }}
        PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.PUBLIC_SUPABASE_ANON_KEY }}
        PUBLIC_STRIPE_PUBLISHABLE_KEY: ${{ secrets.PUBLIC_STRIPE_PUBLISHABLE_KEY }}
      run: npm run build
    
    - name: Deploy to Netlify
      uses: nwtgck/actions-netlify@v2.0
      with:
        publish-dir: './dist'
        production-branch: main
        github-token: ${{ secrets.GITHUB_TOKEN }}
        deploy-message: "Deploy from GitHub Actions"
        enable-pull-request-comment: true
        enable-commit-comment: true
        overwrites-pull-request-comment: true
      env:
        NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
        NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}

  deploy-docker:
    runs-on: ubuntu-latest
    if: github.event_name == 'workflow_dispatch'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3
    
    - name: Login to Container Registry
      uses: docker/login-action@v3
      with:
        registry: ${{ secrets.REGISTRY_URL }}
        username: ${{ secrets.REGISTRY_USERNAME }}
        password: ${{ secrets.REGISTRY_PASSWORD }}
    
    - name: Build and push Docker image
      uses: docker/build-push-action@v5
      with:
        context: .
        push: true
        tags: |
          ${{ secrets.REGISTRY_URL }}/spicebush-montessori:latest
          ${{ secrets.REGISTRY_URL }}/spicebush-montessori:${{ github.sha }}
        build-args: |
          PUBLIC_SUPABASE_URL=${{ secrets.PUBLIC_SUPABASE_URL }}
          PUBLIC_SUPABASE_ANON_KEY=${{ secrets.PUBLIC_SUPABASE_ANON_KEY }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
```

## Netlify Configuration

### Automatic Deployments

1. **Connect GitHub Repository**:
   - Link your GitHub repo in Netlify
   - Enable automatic deploys for the main branch

2. **Build Settings**:
   ```
   Build command: npm run build
   Publish directory: dist
   ```

3. **Environment Variables**:
   - Set all `PUBLIC_*` variables in Netlify UI
   - These will be available during build

### Deploy Previews

Netlify automatically creates deploy previews for pull requests:

```yaml
# netlify.toml
[context.deploy-preview]
  environment = { NODE_ENV = "development" }
  command = "npm run build:preview"
```

### Branch Deploys

Deploy different branches to different URLs:

```yaml
# netlify.toml
[context.branch-deploy]
  environment = { NODE_ENV = "staging" }

[context.staging]
  environment = { 
    PUBLIC_SUPABASE_URL = "staging-url",
    NODE_ENV = "staging"
  }
```

## Alternative CI/CD Platforms

### 1. Vercel

**Pros**: 
- Zero-config deployments
- Excellent preview deployments
- Built-in analytics

**Configuration**:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "astro"
}
```

### 2. GitLab CI/CD

**.gitlab-ci.yml**:
```yaml
stages:
  - test
  - build
  - deploy

test:
  stage: test
  image: node:20
  script:
    - npm ci
    - npm run test:ci
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

build:
  stage: build
  image: node:20
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/

deploy:
  stage: deploy
  image: alpine
  script:
    - npm install -g netlify-cli
    - netlify deploy --prod --dir=dist
  only:
    - main
```

### 3. CircleCI

**.circleci/config.yml**:
```yaml
version: 2.1

orbs:
  node: circleci/node@5.0

jobs:
  test:
    docker:
      - image: cimg/node:20.0
    steps:
      - checkout
      - node/install-packages
      - run:
          name: Run tests
          command: npm run test:ci
      - store_test_results:
          path: test-results

  build-and-deploy:
    docker:
      - image: cimg/node:20.0
    steps:
      - checkout
      - node/install-packages
      - run:
          name: Build application
          command: npm run build
      - run:
          name: Deploy to Netlify
          command: |
            npm install -g netlify-cli
            netlify deploy --prod --dir=dist

workflows:
  version: 2
  test-build-deploy:
    jobs:
      - test
      - build-and-deploy:
          requires:
            - test
          filters:
            branches:
              only: main
```

## Best Practices

### 1. Environment Management

```yaml
# Use GitHub Environments for different stages
deploy-staging:
  environment: staging
  # ...

deploy-production:
  environment: production
  # ...
```

### 2. Secret Management

- Use GitHub Secrets for sensitive data
- Rotate secrets regularly
- Use least-privilege principles
- Never log secrets

### 3. Build Optimization

```yaml
# Cache dependencies
- uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}

# Use Docker layer caching
- uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

### 4. Deployment Safety

```yaml
# Add manual approval for production
deploy-production:
  environment:
    name: production
    url: https://spicebushmontessori.org
  # Requires manual approval
```

### 5. Monitoring Integration

```yaml
# Notify on deployment
- name: Notify deployment
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'Deployment to production completed'
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

## Rollback Strategy

### Automated Rollback

```yaml
rollback:
  runs-on: ubuntu-latest
  if: failure()
  steps:
    - name: Rollback Netlify deployment
      run: |
        netlify rollback --alias=production
```

### Manual Rollback

1. **Netlify**: Use the UI or CLI
2. **Docker**: Deploy previous image tag
3. **Git**: Revert commit and redeploy

## Monitoring and Alerts

### 1. Build Status

- GitHub Actions status badges
- Slack/Discord notifications
- Email alerts for failures

### 2. Deployment Tracking

```yaml
- name: Create deployment
  uses: actions/github-script@v6
  with:
    script: |
      const deployment = await github.rest.repos.createDeployment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        ref: context.sha,
        environment: 'production',
        auto_merge: false,
        required_contexts: []
      });
```

### 3. Performance Monitoring

- Lighthouse CI in pipeline
- Web Vitals tracking
- Uptime monitoring

## Cost Optimization

### Free Tier Options

1. **GitHub Actions**: 2,000 minutes/month
2. **Netlify**: 300 build minutes/month
3. **Vercel**: 6,000 build minutes/month

### Optimization Tips

1. Cache aggressively
2. Use conditional builds
3. Parallelize where possible
4. Clean up old artifacts

## Security Considerations

### 1. Dependency Scanning

```yaml
- name: Dependency Review
  uses: actions/dependency-review-action@v3
```

### 2. SAST Scanning

```yaml
- name: CodeQL Analysis
  uses: github/codeql-action/analyze@v2
```

### 3. Container Scanning

```yaml
- name: Scan Docker image
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: 'spicebush-montessori:latest'
```

## Recommended Setup for Spicebush

1. **Primary**: GitHub Actions + Netlify
   - Simple, cost-effective
   - Great for static sites
   - Excellent preview deployments

2. **Backup**: Docker images to registry
   - For flexibility
   - Easy migration option
   - Self-hosting capability

3. **Monitoring**: 
   - Sentry for error tracking
   - Google Analytics for usage
   - Uptime Robot for availability

This setup provides a robust, scalable CI/CD pipeline suitable for the Spicebush Montessori website's needs.