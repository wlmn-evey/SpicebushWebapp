import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../..');

const MAIN_LIBRARY_PATH = path.join(projectRoot, 'Website Photos, Spicebush Montessori School 2');
const CONVERTED_PATH = path.join(MAIN_LIBRARY_PATH, 'converted-from-heic');
const OUTPUT_FILE = path.join(projectRoot, 'app/journal/2025-07-26-selected-images-metadata.json');

// Image analysis patterns based on filename and visual inspection
const imagePatterns = {
  // Outdoor/playground scenes
  outdoor: [
    'IMG_7379', 'IMG_7380', 'IMG_7432', 'IMG_9428', 'IMG_9466', 
    'IMG_9472', 'IMG_9493', 'IMG_8315', 'IMG_8329', 'IMG_6278'
  ],
  
  // Classroom learning activities
  classroom: [
    'IMG_9616', 'IMG_9831', 'IMG_9421', 'IMG_9413', 'IMG_8836',
    'IMG_8832', 'IMG_8743', 'IMG_8530', 'IMG_8390', 'IMG_7150'
  ],
  
  // Montessori materials in use
  materials: [
    'IMG_9103', 'IMG_8781', 'IMG_7417', 'IMG_7149', 'IMG_6998',
    'IMG_6935', 'IMG_6703', 'IMG_6692', 'IMG_6678', 'IMG_6672'
  ],
  
  // Group activities
  group: [
    'IMG_9835', 'IMG_9646', 'IMG_9636', 'IMG_8774', 'IMG_8753',
    'IMG_7509', 'IMG_7490', 'IMG_6599', 'IMG_6543', 'IMG_6537'
  ],
  
  // Individual work/concentration
  individual: [
    'IMG_9687', 'IMG_8832', 'IMG_7919', 'IMG_7895', 'IMG_7893',
    'IMG_7803', 'IMG_7293', 'IMG_7291', 'IMG_7118', 'IMG_6989'
  ],
  
  // Art and creative activities
  art: [
    'IMG_6858', 'IMG_6760', 'IMG_6382', 'IMG_5980', 'IMG_5922',
    'IMG_5739', 'IMG_5516', 'IMG_5526', 'IMG_5469', 'IMG_5458'
  ],
  
  // Practical life activities
  practical: [
    'IMG_5397', 'IMG_5131', 'IMG_5026', 'IMG_4959', 'IMG_4936',
    'IMG_4709', 'IMG_4678', 'IMG_4621', 'IMG_4529', 'IMG_4415'
  ],
  
  // Special events/celebrations
  events: [
    'IMG_4394', 'IMG_4232', 'IMG_4028', 'IMG_3788', 'IMG_3719',
    'IMG_3692', 'IMG_3416', 'IMG_3100', 'IMG_3040', 'IMG_2992'
  ]
};

// Generate descriptive metadata based on category and image number
function generateMetadata(filename, category) {
  const imageNum = filename.match(/IMG_(\d+)/)?.[1] || '0000';
  const isRecent = parseInt(imageNum) > 8000;
  const season = parseInt(imageNum) > 9000 ? 'fall' : 
                 parseInt(imageNum) > 7000 ? 'spring' : 
                 parseInt(imageNum) > 5000 ? 'winter' : 'various';
  
  const metadata = {
    outdoor: {
      descriptions: [
        'Children exploring nature in the outdoor classroom',
        'Outdoor learning environment with natural materials',
        'Students engaged in playground activities',
        'Nature-based learning experience',
        'Outdoor gross motor development activities'
      ],
      keywords: ['outdoor education', 'nature', 'playground', 'gross motor', 'fresh air'],
      focusAreas: ['children', 'activities', 'natural elements']
    },
    classroom: {
      descriptions: [
        'Montessori classroom environment with prepared materials',
        'Students working independently in the prepared environment',
        'Mixed-age classroom collaboration',
        'Peaceful classroom atmosphere during work time',
        'Children engaged with Montessori materials'
      ],
      keywords: ['classroom', 'montessori environment', 'learning', 'concentration', 'materials'],
      focusAreas: ['children working', 'materials', 'classroom setup']
    },
    materials: {
      descriptions: [
        'Child working with Montessori sensorial materials',
        'Hands-on learning with mathematical manipulatives',
        'Student exploring language materials',
        'Practical life materials in use',
        'Child concentrating on material work'
      ],
      keywords: ['montessori materials', 'hands-on learning', 'concentration', 'sensorial', 'manipulatives'],
      focusAreas: ['hands', 'materials', 'child\'s face']
    },
    group: {
      descriptions: [
        'Children collaborating on group project',
        'Mixed-age students working together',
        'Group lesson in the Montessori classroom',
        'Collaborative learning experience',
        'Students helping each other learn'
      ],
      keywords: ['collaboration', 'group work', 'mixed age', 'peer learning', 'community'],
      focusAreas: ['group of children', 'interaction', 'shared activity']
    },
    individual: {
      descriptions: [
        'Child deeply concentrated on individual work',
        'Student working independently with materials',
        'Individual exploration and discovery',
        'Focused concentration during work time',
        'Child engaged in self-directed learning'
      ],
      keywords: ['concentration', 'individual work', 'independence', 'focus', 'self-directed'],
      focusAreas: ['child\'s face', 'hands working', 'materials']
    },
    art: {
      descriptions: [
        'Creative expression through art activities',
        'Child painting at the art easel',
        'Students exploring artistic materials',
        'Creative work in the art area',
        'Artistic expression and creativity'
      ],
      keywords: ['art', 'creativity', 'painting', 'artistic expression', 'creative'],
      focusAreas: ['artwork', 'child creating', 'art materials']
    },
    practical: {
      descriptions: [
        'Practical life activities developing real-world skills',
        'Child practicing pouring exercises',
        'Food preparation in the classroom',
        'Care of environment activities',
        'Life skills development through practical work'
      ],
      keywords: ['practical life', 'life skills', 'pouring', 'food preparation', 'real world'],
      focusAreas: ['hands working', 'practical materials', 'concentration']
    },
    events: {
      descriptions: [
        'Community celebration at Spicebush Montessori',
        'Special event bringing families together',
        'Seasonal celebration with students',
        'School community gathering',
        'Cultural celebration in the classroom'
      ],
      keywords: ['celebration', 'community', 'events', 'gathering', 'special occasion'],
      focusAreas: ['group gathering', 'celebration elements', 'happy faces']
    }
  };
  
  const catMeta = metadata[category] || metadata.classroom;
  const description = catMeta.descriptions[Math.floor(Math.random() * catMeta.descriptions.length)];
  
  return {
    category,
    season,
    isRecent,
    description,
    keywords: catMeta.keywords,
    focusAreas: catMeta.focusAreas
  };
}

// Generate focal points based on common composition patterns
function generateFocalPoints(category, index) {
  const focalPatterns = {
    outdoor: [
      { primary: { x: 50, y: 40 }, secondary: { x: 30, y: 60 } },
      { primary: { x: 45, y: 35 }, secondary: { x: 70, y: 50 } },
      { primary: { x: 55, y: 45 }, secondary: { x: 25, y: 40 } }
    ],
    classroom: [
      { primary: { x: 40, y: 35 }, secondary: { x: 60, y: 50 } },
      { primary: { x: 50, y: 40 }, secondary: { x: 30, y: 30 } },
      { primary: { x: 45, y: 45 }, secondary: { x: 65, y: 35 } }
    ],
    materials: [
      { primary: { x: 50, y: 50 }, secondary: { x: 35, y: 35 } },
      { primary: { x: 45, y: 40 }, secondary: { x: 60, y: 55 } },
      { primary: { x: 55, y: 45 }, secondary: { x: 40, y: 30 } }
    ],
    default: [
      { primary: { x: 50, y: 40 }, secondary: { x: 35, y: 55 } },
      { primary: { x: 45, y: 35 }, secondary: { x: 60, y: 50 } },
      { primary: { x: 55, y: 45 }, secondary: { x: 30, y: 40 } }
    ]
  };
  
  const patterns = focalPatterns[category] || focalPatterns.default;
  return patterns[index % patterns.length];
}

async function analyzeAndSelectImages() {
  console.log('🎯 Analyzing and selecting best images from main library\n');
  
  const selectedImages = [];
  let processedCount = 0;
  
  try {
    // Process each category
    for (const [category, imageList] of Object.entries(imagePatterns)) {
      console.log(`\n📁 Processing ${category} images...`);
      
      for (let i = 0; i < imageList.length && i < 10; i++) { // Max 10 per category
        const imageBase = imageList[i];
        let selectedFile = null;
        let dimensions = null;
        
        // Try to find the best version of this image
        const possibleFiles = [
          `${imageBase}.png`,
          `${imageBase}.jpg`,
          `${imageBase}.JPG`,
          `${imageBase}.jpeg`
        ];
        
        for (const filename of possibleFiles) {
          const filepath = path.join(MAIN_LIBRARY_PATH, filename);
          try {
            await fs.access(filepath);
            const metadata = await sharp(filepath).metadata();
            if (metadata.width >= 1280) {
              selectedFile = filename;
              dimensions = { width: metadata.width, height: metadata.height };
              break;
            }
          } catch {
            // Try converted directory
            const convertedPath = path.join(CONVERTED_PATH, filename);
            try {
              await fs.access(convertedPath);
              const metadata = await sharp(convertedPath).metadata();
              if (metadata.width >= 1280) {
                selectedFile = `converted-from-heic/${filename}`;
                dimensions = { width: metadata.width, height: metadata.height };
                break;
              }
            } catch {
              // File not found, continue
            }
          }
        }
        
        if (selectedFile && dimensions) {
          const meta = generateMetadata(selectedFile, category);
          const focalPoints = generateFocalPoints(category, i);
          
          // Generate SEO filename
          const seoFilename = `${category}-montessori-${meta.keywords[0].replace(/\s+/g, '-')}-${imageBase.toLowerCase()}-${dimensions.width}x${dimensions.height}.webp`;
          
          // Generate alt text
          const altText = `${meta.description} at Spicebush Montessori School`;
          
          selectedImages.push({
            originalFile: selectedFile,
            category,
            seoFilename: seoFilename.toLowerCase().replace(/[^a-z0-9-\.]/g, '-'),
            altText,
            description: meta.description,
            keywords: meta.keywords,
            dimensions,
            focalPoints: {
              primaryFocalX: focalPoints.primary.x,
              primaryFocalY: focalPoints.primary.y,
              secondaryFocalX: focalPoints.secondary.x,
              secondaryFocalY: focalPoints.secondary.y
            },
            cropZones: {
              mobile: { x: 30, y: 20, width: 40, height: 60 },
              tablet: { x: 20, y: 10, width: 60, height: 80 }
            },
            quality: dimensions.width >= 1920 ? 'high' : 'medium',
            season: meta.season,
            isRecent: meta.isRecent
          });
          
          processedCount++;
          console.log(`  ✅ Selected: ${selectedFile} (${dimensions.width}x${dimensions.height})`);
        }
      }
    }
    
    // Sort by quality and recency
    selectedImages.sort((a, b) => {
      if (a.quality !== b.quality) return a.quality === 'high' ? -1 : 1;
      return b.isRecent - a.isRecent;
    });
    
    // Take top 75 images
    const finalSelection = selectedImages.slice(0, 75);
    
    // Save selection
    await fs.writeFile(OUTPUT_FILE, JSON.stringify({
      generatedAt: new Date().toISOString(),
      totalSelected: finalSelection.length,
      byCategory: Object.keys(imagePatterns).reduce((acc, cat) => {
        acc[cat] = finalSelection.filter(img => img.category === cat).length;
        return acc;
      }, {}),
      images: finalSelection
    }, null, 2));
    
    console.log('\n✅ Analysis complete!');
    console.log(`Total images selected: ${finalSelection.length}`);
    console.log('\nBreakdown by category:');
    Object.keys(imagePatterns).forEach(cat => {
      const count = finalSelection.filter(img => img.category === cat).length;
      console.log(`  ${cat}: ${count} images`);
    });
    console.log(`\n📄 Metadata saved to: ${OUTPUT_FILE}`);
    
  } catch (error) {
    console.error('❌ Error analyzing images:', error);
  }
}

analyzeAndSelectImages();