#!/bin/bash
# Auto-generated image cleanup script
# Review before running!

echo "🧹 Removing staging images..."

# Remove gallery-staging directory (68MB)
if [ -d "public/images/gallery-staging" ]; then
  echo "Removing gallery-staging directory..."
  rm -rf "public/images/gallery-staging"
  echo "✅ Removed gallery-staging directory"
fi

# Remove other identified large unused files
# Uncomment after manual review:

# rm "public/images/.original-backups/gallery-staging/art/art-montessori-art-img-5458-1306x1741.png"
# rm "public/images/.original-backups/gallery-staging/art/art-montessori-art-img-5469-1872x1404.png"
# rm "public/images/.original-backups/gallery-staging/art/art-montessori-art-img-5526-1563x1827.png"
# rm "public/images/.original-backups/gallery-staging/art/art-montessori-art-img-5739-1363x1783.png"
# rm "public/images/.original-backups/gallery-staging/art/art-montessori-art-img-5922-1508x1741.png"

echo "🎉 Cleanup complete!"
echo "Don't forget to:"
echo "1. Test the site to ensure no images are broken"
echo "2. Commit the changes"
echo "3. Run a full build to verify everything works"
