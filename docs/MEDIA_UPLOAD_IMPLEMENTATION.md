# Media Upload Implementation - Local File Storage

## Summary

The media upload system uses local filesystem storage on the Hostinger server instead of AWS S3. Files are uploaded to `/var/www/juntatribo/uploads` and served as static assets.

## Changes Made

### Backend Changes

1. **Created FileSystemService** (`apps/api/src/filesystem/filesystem.service.ts`)
   - Replaces S3Service with local file operations
   - Uses Node.js `fs.promises` for async file operations
   - Automatic directory creation
   - Cleanup of empty directories after file deletion

2. **Created FileSystemModule** (`apps/api/src/filesystem/filesystem.module.ts`)
   - Exports FileSystemService for use in other modules

3. **Updated MediaController** (`apps/api/src/trips/media.controller.ts`)
   - Changed from S3Service to FileSystemService
   - Same upload/delete logic, different storage backend

4. **Updated TripsModule** (`apps/api/src/trips/trips.module.ts`)
   - Replaced S3Module import with FileSystemModule

5. **Updated TripsService** (`apps/api/src/trips/trips.service.ts`)
   - Removed S3Service dependency (no longer needed)

6. **Updated main.ts** (`apps/api/src/main.ts`)
   - Added static file serving for `/uploads` directory
   - Serves files from UPLOAD_DIR environment variable
   - Fails fast if UPLOAD_DIR is not set

7. **Updated .gitignore**
   - Added `uploads/` to exclude local uploaded files from git

### Environment Variables

**Required variables:**
```bash
# Local Development
UPLOAD_DIR=/Users/sandman/projects/picamula/uploads
UPLOAD_BASE_URL=http://localhost:8001/uploads

# Production (Hostinger)
UPLOAD_DIR=/var/www/juntatribo/uploads
UPLOAD_BASE_URL=https://www.juntatribo.com/uploads
```

**Legacy AWS variables (can be removed):**
- AWS_REGION
- AWS_BUCKET_NAME  
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY

## Directory Structure

### Production (Hostinger)
```
/var/www/juntatribo/uploads/trips/{tripId}/{images|videos}/{timestamp}-{filename}
```

Accessible at: `https://www.juntatribo.com/uploads/trips/...`

### Local Development
```
/Users/sandman/projects/picamula/uploads/trips/{tripId}/{images|videos}/{timestamp}-{filename}
```

Accessible at: `http://localhost:8001/uploads/trips/...`

## File Upload Flow

1. **Client-side compression** (Frontend)
   - Images: Compressed using Canvas API (max 1920x1080, 85% quality)
   - Videos: Compressed using FFmpeg.wasm (H.264, 2Mbps bitrate)

2. **Upload to server** (Backend)
   - Multer receives the compressed file
   - File validation (type, size)
   - Generate unique filename: `{timestamp}-{sanitized-filename}`
   - Save to filesystem: `UPLOAD_DIR/trips/{tripId}/{images|videos}/{filename}`

3. **Database record** (Backend)
   - Create MediaFile entity with file metadata
   - Store relative path (key) and full URL

4. **Serve files** (Backend)
   - NestJS serves static files from `UPLOAD_DIR` at `/uploads` route
   - URLs: `{UPLOAD_BASE_URL}/trips/{tripId}/{images|videos}/{filename}`

## File Deletion Flow

1. **Transaction started** (Database)
2. **Delete from database** (within transaction)
3. **Commit transaction**
4. **Delete from filesystem** (best effort, outside transaction)
   - If filesystem delete fails, orphaned file remains but DB is consistent
   - Empty parent directories are automatically cleaned up

## Features

- File naming convention: `{timestamp}-{sanitized-filename}`
- Directory organization: `trips/{tripId}/images/` and `trips/{tripId}/videos/`
- Upload size limits: 20MB images, 100MB videos (after client-side compression)
- Transactional delete (DB first, then filesystem)
- Frontend compression (client-side before upload)
- Automatic directory creation and cleanup
- Media gallery with lightbox viewer
- Delete functionality (owner only)

## Benefits

✅ **No AWS costs** - Free file storage on your server  
✅ **Simpler deployment** - No AWS credentials needed  
✅ **Faster uploads** - Direct to your server (no S3 API calls)  
✅ **Full control** - Files stored on your infrastructure  
✅ **Easier debugging** - Can directly inspect files on disk  

## Testing

1. **Restart backend:**
   ```bash
   npm run pm2:restart
   # or for development:
   npm run dev
   ```

2. **Upload a test image/video** via the trip edit page

3. **Verify files appear:**
   - Local: `/Users/sandman/projects/picamula/uploads/trips/`
   - Production: `/var/www/juntatribo/uploads/trips/`

4. **Verify URLs work:**
   - Local: `http://localhost:8001/uploads/trips/{id}/images/{file}.jpg`
   - Production: `https://www.juntatribo.com/uploads/trips/{id}/images/{file}.jpg`

5. **Test delete** - Delete a file and verify it's removed from disk

## Important Notes

- **UPLOAD_DIR is required** - App will fail to start if not set
- **Production location** - Files must be in `/var/www/juntatribo/uploads` (not in app directory)
- **App location** - App code is in `/root/juntatribo/picamula`
- **Web-accessible** - `/var/www/` is standard for web-accessible static files
- **Backups** - Set up backup strategy for `/var/www/juntatribo/uploads/`

## Next Steps

- ⚠️ Set up backup strategy for `/var/www/juntatribo/uploads/`
- ⚠️ Consider adding file size monitoring
- ⚠️ Optional: Add nginx caching for static files
- ⚠️ Optional: Add cleanup job for orphaned files
