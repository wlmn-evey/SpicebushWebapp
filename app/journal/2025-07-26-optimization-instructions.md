# Image Optimization Instructions

## Staged Images Location
/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/public/images/gallery-staging

## Categories:
- outdoor: 6 images
- classroom: 6 images
- materials: 8 images
- group: 6 images
- individual: 9 images
- art: 8 images
- practical: 8 images
- events: 7 images

## Next Steps:
1. Run the optimization script on the staged images
2. Generate WebP versions and responsive sizes
3. Move optimized images to /public/images/optimized/gallery/
4. Test with OptimizedImage component

## Command to optimize:
```bash
node scripts/optimize-gallery-images.js
```
