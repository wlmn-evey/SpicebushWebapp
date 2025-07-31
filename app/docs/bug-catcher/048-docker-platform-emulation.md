# Bug #048: Docker Platform Emulation Causing Performance Issues

## Date: 2025-07-30

## Description
The Docker configuration specifies `platform: linux/amd64` while running on an ARM64 host system. This forces QEMU emulation for all processes, causing:
- 22-27 second page load times (should be <2 seconds)
- All HTTP requests timing out
- Excessive CPU usage from emulation overhead

## Root Cause
The docker-compose.yml file has:
```yaml
app:
  platform: linux/amd64
```

When running on ARM64 hardware (like Apple Silicon Macs), this forces x86_64 emulation through QEMU, which is extremely slow.

## Evidence
Process listing shows QEMU emulation:
```
{npm run dev --h} /usr/bin/qemu-x86_64 /usr/local/bin/node node /usr/local/bin/npm run dev
{node} /usr/bin/qemu-x86_64 /usr/local/bin/node node /app/node_modules/.bin/astro dev
```

## Impact
- Severity: **Critical**
- Makes development impossible on ARM64 machines
- All page requests timeout
- Database queries timeout due to slow emulation

## Solution
Remove the platform specification or use multi-architecture images:
1. Remove `platform: linux/amd64` from docker-compose.yml
2. Let Docker use native architecture
3. Or specify `platform: linux/arm64` for ARM machines