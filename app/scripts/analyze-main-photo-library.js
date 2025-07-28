import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../..');

const MAIN_LIBRARY_PATH = path.join(projectRoot, 'Website Photos, Spicebush Montessori School 2');
const OUTPUT_FILE = path.join(projectRoot, 'app/journal/2025-07-26-main-photo-library-analysis.md');

async function analyzeMainPhotoLibrary() {
  console.log('🔍 Analyzing Main Photo Library\n');
  console.log(`Library path: ${MAIN_LIBRARY_PATH}\n`);
  
  const analysis = {
    totalFiles: 0,
    imageFiles: 0,
    duplicates: [],
    formats: {},
    dimensions: [],
    quality: {
      high: [],    // 1920px+ width
      medium: [],  // 1280-1919px width
      low: []      // <1280px width
    },
    subjects: {
      classroom: [],
      outdoor: [],
      materials: [],
      children: [],
      teachers: [],
      events: [],
      unknown: []
    },
    recommendations: []
  };
  
  try {
    // Get all files
    const files = await fs.readdir(MAIN_LIBRARY_PATH);
    analysis.totalFiles = files.length;
    
    // Filter image files
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.heic', '.webp'];
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return imageExtensions.includes(ext);
    });
    
    analysis.imageFiles = imageFiles.length;
    console.log(`Found ${imageFiles.length} image files\n`);
    
    // Analyze each image
    for (let i = 0; i < imageFiles.length; i++) {
      const filename = imageFiles[i];
      const filepath = path.join(MAIN_LIBRARY_PATH, filename);
      
      process.stdout.write(`\rAnalyzing: ${i + 1}/${imageFiles.length} - ${filename.substring(0, 30)}...`);
      
      // Get file format
      const ext = path.extname(filename).toLowerCase();
      analysis.formats[ext] = (analysis.formats[ext] || 0) + 1;
      
      // Check for duplicates (simple name-based check)
      const baseName = path.basename(filename, ext);
      const duplicatePattern = new RegExp(`${baseName.replace(/[\(\)]/g, '\\$&')}.*\\.(jpg|jpeg|png|heic|webp)`, 'i');
      const possibleDuplicates = imageFiles.filter(f => duplicatePattern.test(f) && f !== filename);
      if (possibleDuplicates.length > 0) {
        analysis.duplicates.push({
          file: filename,
          possibleDuplicates
        });
      }
      
      // Categorize by subject (based on filename patterns)
      const lowerName = filename.toLowerCase();
      if (lowerName.includes('img_') || lowerName.includes('fullsize')) {
        // Try to categorize based on common patterns
        if (hasOutdoorKeywords(lowerName)) {
          analysis.subjects.outdoor.push(filename);
        } else if (hasMaterialKeywords(lowerName)) {
          analysis.subjects.materials.push(filename);
        } else if (hasChildrenKeywords(lowerName)) {
          analysis.subjects.children.push(filename);
        } else {
          analysis.subjects.unknown.push(filename);
        }
      }
      
      // For PNG files, get dimensions
      if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
        try {
          const metadata = await sharp(filepath).metadata();
          const { width, height } = metadata;
          
          analysis.dimensions.push({
            filename,
            width,
            height,
            aspectRatio: (width / height).toFixed(2)
          });
          
          // Categorize by quality
          if (width >= 1920) {
            analysis.quality.high.push({ filename, width, height });
          } else if (width >= 1280) {
            analysis.quality.medium.push({ filename, width, height });
          } else {
            analysis.quality.low.push({ filename, width, height });
          }
        } catch (error) {
          // Skip files that can't be analyzed
        }
      }
    }
    
    console.log('\n\n✅ Analysis complete!\n');
    
    // Generate recommendations
    generateRecommendations(analysis);
    
    // Write report
    await writeReport(analysis);
    
    // Display summary
    displaySummary(analysis);
    
  } catch (error) {
    console.error('❌ Error analyzing library:', error);
  }
}

function hasOutdoorKeywords(filename) {
  const keywords = ['playground', 'outdoor', 'garden', 'nature', 'tree', 'leaf', 'autumn'];
  return keywords.some(keyword => filename.includes(keyword));
}

function hasMaterialKeywords(filename) {
  const keywords = ['material', 'work', 'activity', 'montessori', 'pink', 'tower', 'bead', 'block'];
  return keywords.some(keyword => filename.includes(keyword));
}

function hasChildrenKeywords(filename) {
  const keywords = ['child', 'student', 'group', 'class', 'together'];
  return keywords.some(keyword => filename.includes(keyword));
}

function generateRecommendations(analysis) {
  // High-quality images recommendation
  if (analysis.quality.high.length > 0) {
    analysis.recommendations.push({
      priority: 'HIGH',
      category: 'High-Quality Images',
      count: analysis.quality.high.length,
      action: 'Prioritize these for website use',
      examples: analysis.quality.high.slice(0, 5).map(img => img.filename)
    });
  }
  
  // Duplicate removal recommendation
  if (analysis.duplicates.length > 0) {
    analysis.recommendations.push({
      priority: 'MEDIUM',
      category: 'Duplicate Images',
      count: analysis.duplicates.length,
      action: 'Review and remove duplicates to save space',
      examples: analysis.duplicates.slice(0, 5).map(dup => dup.file)
    });
  }
  
  // Format conversion recommendation
  const heicCount = analysis.formats['.heic'] || 0;
  if (heicCount > 0) {
    analysis.recommendations.push({
      priority: 'HIGH',
      category: 'HEIC Format Images',
      count: heicCount,
      action: 'Convert to JPG/PNG for web compatibility',
      note: 'HEIC files are not web-compatible'
    });
  }
  
  // Subject diversity recommendation
  const subjectCounts = Object.entries(analysis.subjects)
    .filter(([key]) => key !== 'unknown')
    .map(([key, items]) => ({ category: key, count: items.length }))
    .sort((a, b) => b.count - a.count);
    
  analysis.recommendations.push({
    priority: 'MEDIUM',
    category: 'Subject Coverage',
    distribution: subjectCounts,
    action: 'Ensure balanced representation across categories'
  });
}

async function writeReport(analysis) {
  const report = `# Main Photo Library Analysis

**Date**: ${new Date().toISOString().split('T')[0]}
**Total Files**: ${analysis.totalFiles}
**Image Files**: ${analysis.imageFiles}

## 📊 Format Distribution

${Object.entries(analysis.formats)
  .sort((a, b) => b[1] - a[1])
  .map(([format, count]) => `- **${format}**: ${count} files`)
  .join('\n')}

## 📐 Quality Analysis

### High Quality (1920px+ width)
- **Count**: ${analysis.quality.high.length} images
- **Percentage**: ${((analysis.quality.high.length / analysis.imageFiles) * 100).toFixed(1)}%

### Medium Quality (1280-1919px width)
- **Count**: ${analysis.quality.medium.length} images
- **Percentage**: ${((analysis.quality.medium.length / analysis.imageFiles) * 100).toFixed(1)}%

### Low Quality (<1280px width)
- **Count**: ${analysis.quality.low.length} images
- **Percentage**: ${((analysis.quality.low.length / analysis.imageFiles) * 100).toFixed(1)}%

## 🔍 Duplicate Analysis

Found ${analysis.duplicates.length} potential duplicate sets.

${analysis.duplicates.slice(0, 10).map(dup => 
  `### ${dup.file}\nPossible duplicates: ${dup.possibleDuplicates.join(', ')}`
).join('\n\n')}

## 🎯 Recommendations

${analysis.recommendations.map(rec => `
### ${rec.priority} Priority: ${rec.category}
- **Action**: ${rec.action}
${rec.count ? `- **Count**: ${rec.count}` : ''}
${rec.note ? `- **Note**: ${rec.note}` : ''}
${rec.examples ? `- **Examples**: ${rec.examples.join(', ')}` : ''}
${rec.distribution ? `- **Distribution**: \n${rec.distribution.map(d => `  - ${d.category}: ${d.count}`).join('\n')}` : ''}
`).join('\n')}

## 📸 Top Candidates for Website Use

### High-Quality PNG Images
${analysis.quality.high
  .filter(img => img.filename.endsWith('.png'))
  .slice(0, 20)
  .map(img => `- ${img.filename} (${img.width}x${img.height})`)
  .join('\n')}

### High-Quality JPG Images
${analysis.quality.high
  .filter(img => img.filename.endsWith('.jpg') || img.filename.endsWith('.jpeg'))
  .slice(0, 20)
  .map(img => `- ${img.filename} (${img.width}x${img.height})`)
  .join('\n')}

## 🚀 Next Steps

1. **Remove Duplicates**: Clean up ${analysis.duplicates.length} duplicate image sets
2. **Convert HEIC**: Process ${analysis.formats['.heic'] || 0} HEIC files to web formats
3. **Select Best Images**: Choose 50-75 from high-quality candidates
4. **Organize by Category**: Sort selected images into appropriate categories
5. **Apply Optimization**: Use existing photo optimization system

---

*Generated by Main Photo Library Analysis Script*`;

  await fs.writeFile(OUTPUT_FILE, report);
  console.log(`\n📄 Detailed report written to: ${OUTPUT_FILE}`);
}

function displaySummary(analysis) {
  console.log('\n📊 SUMMARY');
  console.log('==========');
  console.log(`Total files: ${analysis.totalFiles}`);
  console.log(`Image files: ${analysis.imageFiles}`);
  console.log(`Duplicate sets: ${analysis.duplicates.length}`);
  console.log('\nFormat breakdown:');
  Object.entries(analysis.formats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([format, count]) => {
      console.log(`  ${format}: ${count} (${((count / analysis.imageFiles) * 100).toFixed(1)}%)`);
    });
  console.log('\nQuality distribution:');
  console.log(`  High (1920px+): ${analysis.quality.high.length}`);
  console.log(`  Medium (1280-1919px): ${analysis.quality.medium.length}`);
  console.log(`  Low (<1280px): ${analysis.quality.low.length}`);
  console.log('\n✅ Analysis complete! Check the journal for detailed report.');
}

analyzeMainPhotoLibrary();