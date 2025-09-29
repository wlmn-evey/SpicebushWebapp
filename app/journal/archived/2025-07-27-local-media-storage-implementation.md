# Local Media Storage Implementation

Date: 2025-07-27
Type: Feature Implementation
Focus: Local Storage with Cloud Migration Path

## Summary

Implemented a local file storage solution for media uploads that bypasses the failing Supabase storage container. The solution is designed with a clear migration path to Google Cloud Storage (or other providers) when ready for production.

## Implementation Details

### Storage Strategy

Created a provider-based storage system that allows easy switching between:
- **Local Storage** (current implementation)
- **Google Cloud Storage** (future production)
- **Cloudflare R2** (alternative option)
- **Backblaze B2** (budget option)

### Cost Comparison

| Provider | Storage Cost | Bandwidth Cost | Notes |
|----------|-------------|----------------|-------|
| AWS S3 | $0.023/GB/mo | $0.09/GB | Most expensive |
| Google Cloud | $0.020/GB/mo | $0.12/GB | Better storage pricing |
| Cloudflare R2 | $0.015/GB/mo | $0 (FREE!) | Best value - no egress fees |
| Backblaze B2 | $0.005/GB/mo | $0.01/GB | Cheapest storage |
| Local (current) | $0 | $0 | Development only |

### Files Created

1. **`/src/lib/media-storage.ts`**
   - Storage provider interface
   - Local file system implementation
   - Placeholder for Google Cloud Storage
   - File validation and security

2. **`/src/pages/api/media/upload.ts`**
   - API endpoint for media uploads
   - Admin authentication required
   - File validation
   - Returns public URL

3. **Database Migration**
   - Added `storage_path` column to media table
   - Added `mimetype` column for file types

### How It Works

1. **Upload Flow**:
   - User uploads file through CMS
   - CMS backend sends to `/api/media/upload`
   - API validates admin auth and file type
   - File saved to `public/uploads/` with unique name
   - Record saved to database
   - Public URL returned

2. **Security**:
   - Admin authentication required
   - File type validation (images + PDF only)
   - 10MB file size limit
   - Unique filenames prevent overwrites

3. **Storage Location**:
   - Files stored in `/public/uploads/`
   - Served directly by Astro
   - No additional routing needed

### Testing Results

```bash
# Upload test file
curl -X POST http://localhost:4321/api/media/upload \
  -H "Cookie: sbms-admin-auth=bypass" \
  -F "file=@test-image.webp"

# Result: File uploaded to /uploads/1753649428914-5e11af38.webp
# Accessible at: http://localhost:4321/uploads/1753649428914-5e11af38.webp
```

### Migration Path

When ready for production:

1. **For Google Cloud Storage**:
   ```typescript
   // Update STORAGE_PROVIDER env var
   STORAGE_PROVIDER=gcs
   GCS_BUCKET_NAME=spicebush-media
   GCS_PROJECT_ID=your-project
   GCS_KEY_FILE=./service-account.json
   ```

2. **Implement GoogleCloudStorage class**:
   - Use `@google-cloud/storage` SDK
   - Upload to bucket
   - Return public URL

3. **Migrate existing files**:
   - Script to upload local files to cloud
   - Update database URLs
   - Remove local files

### Benefits of This Approach

1. **No Dependencies**: Works without Supabase storage
2. **Cost Effective**: Free for development, cheap for production
3. **Flexible**: Easy to switch providers
4. **Simple**: Just files in a folder
5. **Migration Ready**: Clear path to cloud storage

### Next Steps

1. Test CMS media library functionality
2. Add image optimization on upload
3. Implement file deletion
4. Add CDN support for production
5. Create migration script for existing media

### Recommendations

For production, I recommend **Cloudflare R2** because:
- Zero egress fees (huge savings)
- S3-compatible API
- Built-in CDN
- Great for a school website with parents accessing photos

Alternatively, **Google Cloud Storage** offers:
- Good pricing
- Excellent reliability
- Easy integration with other Google services
- Free tier includes 5GB