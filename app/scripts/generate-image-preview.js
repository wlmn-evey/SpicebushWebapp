import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../..');

const MAIN_LIBRARY_PATH = path.join(projectRoot, 'Website Photos, Spicebush Montessori School 2');
const OUTPUT_FILE = path.join(projectRoot, 'app/image-preview-gallery.html');

async function generateImagePreview() {
  console.log('📸 Generating Image Preview Gallery\n');
  
  try {
    const files = await fs.readdir(MAIN_LIBRARY_PATH);
    
    // Filter for PNG and JPG files (web-viewable)
    const webImages = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png'].includes(ext);
    });
    
    // Sort by quality (assuming higher numbers are newer/better)
    webImages.sort((a, b) => {
      const numA = parseInt(a.match(/\d+/) || '0');
      const numB = parseInt(b.match(/\d+/) || '0');
      return numB - numA;
    });
    
    console.log(`Found ${webImages.length} web-viewable images`);
    
    // Generate HTML preview
    const html = `<!DOCTYPE html>
<html>
<head>
    <title>Spicebush Photo Library Preview</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: #f5f5f5;
        }
        h1 {
            text-align: center;
            color: #2E4A3B;
        }
        .stats {
            background: white;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .controls {
            background: white;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .filter-btn {
            margin: 5px;
            padding: 8px 16px;
            border: 2px solid #2E4A3B;
            background: white;
            color: #2E4A3B;
            border-radius: 4px;
            cursor: pointer;
        }
        .filter-btn.active {
            background: #2E4A3B;
            color: white;
        }
        .gallery {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .image-card {
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: transform 0.2s;
        }
        .image-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }
        .image-container {
            position: relative;
            padding-bottom: 75%;
            overflow: hidden;
            background: #f0f0f0;
        }
        .image-container img {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            max-width: 100%;
            max-height: 100%;
            width: auto;
            height: auto;
        }
        .image-info {
            padding: 15px;
        }
        .filename {
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
            font-size: 14px;
            word-break: break-all;
        }
        .quality-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            margin-right: 5px;
        }
        .quality-high {
            background: #4CAF50;
            color: white;
        }
        .quality-medium {
            background: #FF9800;
            color: white;
        }
        .quality-low {
            background: #f44336;
            color: white;
        }
        .category-select {
            padding: 10px;
            margin: 10px 0;
            width: 100%;
            max-width: 300px;
        }
        .selected {
            border: 3px solid #4CAF50;
        }
        .selection-counter {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #2E4A3B;
            color: white;
            padding: 15px 25px;
            border-radius: 50px;
            font-weight: bold;
            z-index: 1000;
        }
    </style>
</head>
<body>
    <h1>Spicebush Montessori Photo Library</h1>
    
    <div class="stats">
        <h2>Library Statistics</h2>
        <p>Total web-viewable images: ${webImages.length}</p>
        <p>Formats: JPG, PNG (HEIC files not shown - need conversion)</p>
        <p>Click images to select for website use</p>
    </div>
    
    <div class="controls">
        <h3>Quick Filters</h3>
        <button class="filter-btn" onclick="filterByPattern('IMG_9')">Recent (9000s)</button>
        <button class="filter-btn" onclick="filterByPattern('IMG_8')">8000s</button>
        <button class="filter-btn" onclick="filterByPattern('IMG_7')">7000s</button>
        <button class="filter-btn" onclick="filterByPattern('IMG_6')">6000s</button>
        <button class="filter-btn" onclick="filterByPattern('IMG_5')">5000s</button>
        <button class="filter-btn" onclick="showAll()">Show All</button>
        
        <h3>Categorize Selected</h3>
        <select class="category-select" id="categorySelect">
            <option value="">Select category...</option>
            <option value="classroom-learning">Classroom Learning</option>
            <option value="outdoor-activities">Outdoor Activities</option>
            <option value="montessori-materials">Montessori Materials</option>
            <option value="group-activities">Group Activities</option>
            <option value="individual-work">Individual Work</option>
            <option value="teachers-staff">Teachers & Staff</option>
            <option value="events-celebrations">Events & Celebrations</option>
            <option value="practical-life">Practical Life</option>
            <option value="art-creative">Art & Creative</option>
            <option value="seasonal">Seasonal</option>
        </select>
        <button onclick="categorizeSelected()">Categorize Selected</button>
        <button onclick="exportSelections()">Export Selections</button>
    </div>
    
    <div class="gallery" id="gallery">
        ${webImages.map((filename, index) => {
          const filePath = `file://${MAIN_LIBRARY_PATH}/${filename}`;
          const fileNumber = filename.match(/\d+/) || ['0'];
          const isHigh = parseInt(fileNumber[0]) > 8000 ? 'quality-high' : 
                        parseInt(fileNumber[0]) > 5000 ? 'quality-medium' : 'quality-low';
          
          return `
            <div class="image-card" data-filename="${filename}" data-index="${index}" onclick="toggleSelection(this)">
                <div class="image-container">
                    <img src="${filePath}" alt="${filename}" loading="lazy">
                </div>
                <div class="image-info">
                    <div class="filename">${filename}</div>
                    <span class="quality-badge ${isHigh}">
                        ${isHigh === 'quality-high' ? 'Recent' : 
                          isHigh === 'quality-medium' ? 'Medium' : 'Older'}
                    </span>
                    <div class="category" data-category=""></div>
                </div>
            </div>
          `;
        }).join('')}
    </div>
    
    <div class="selection-counter" id="counter">0 selected</div>
    
    <script>
        let selections = new Set();
        let categorizations = {};
        
        function toggleSelection(card) {
            const filename = card.dataset.filename;
            if (selections.has(filename)) {
                selections.delete(filename);
                card.classList.remove('selected');
            } else {
                selections.add(filename);
                card.classList.add('selected');
            }
            updateCounter();
        }
        
        function updateCounter() {
            document.getElementById('counter').textContent = selections.size + ' selected';
        }
        
        function filterByPattern(pattern) {
            const cards = document.querySelectorAll('.image-card');
            cards.forEach(card => {
                if (card.dataset.filename.includes(pattern)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        }
        
        function showAll() {
            const cards = document.querySelectorAll('.image-card');
            cards.forEach(card => {
                card.style.display = 'block';
            });
        }
        
        function categorizeSelected() {
            const category = document.getElementById('categorySelect').value;
            if (!category) {
                alert('Please select a category');
                return;
            }
            
            selections.forEach(filename => {
                categorizations[filename] = category;
                const card = document.querySelector(\`[data-filename="\${filename}"]\`);
                const categoryDiv = card.querySelector('.category');
                categoryDiv.textContent = 'Category: ' + category;
                categoryDiv.style.color = '#4CAF50';
            });
            
            alert(\`Categorized \${selections.size} images as "\${category}"\`);
        }
        
        function exportSelections() {
            const output = {
                totalSelected: selections.size,
                selections: Array.from(selections),
                categorizations: categorizations,
                timestamp: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(output, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'spicebush-photo-selections.json';
            a.click();
        }
    </script>
</body>
</html>`;
    
    await fs.writeFile(OUTPUT_FILE, html);
    console.log(`\n✅ Preview gallery generated!`);
    console.log(`📄 File: ${OUTPUT_FILE}`);
    console.log('\n🌐 Open this file in your browser to view and categorize images');
    
  } catch (error) {
    console.error('❌ Error generating preview:', error);
  }
}

generateImagePreview();