#!/usr/bin/env tsx

import { execSync } from 'child_process';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Color helpers
const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m${text}\x1b[0m`;
const yellow = (text: string) => `\x1b[33m${text}\x1b[0m`;
const blue = (text: string) => `\x1b[34m${text}\x1b[0m`;
const bold = (text: string) => `\x1b[1m${text}\x1b[0m`;

console.log(bold('\n🎨 CSS Manual Testing Checklist\n'));
console.log('This script will guide you through manual CSS verification.\n');

const testCategories = [
  {
    name: 'Initial Setup',
    tests: [
      {
        name: 'Dev Server Running',
        instruction: 'Is the dev server running without errors? (npm run dev)',
        autoCheck: async () => {
          try {
            const response = await fetch('http://localhost:4321');
            return response.ok;
          } catch {
            return false;
          }
        }
      },
      {
        name: 'No Console Errors',
        instruction: 'Open browser DevTools - are there any CSS-related console errors?'
      },
      {
        name: 'Network Tab Clean',
        instruction: 'In Network tab - do all CSS files load successfully (status 200)?'
      }
    ]
  },
  {
    name: 'Custom Colors',
    tests: [
      {
        name: 'Forest Canopy (#3E6D51)',
        instruction: 'Can you see forest-canopy green color in headers or buttons?'
      },
      {
        name: 'Moss Green (#5A8065)',
        instruction: 'Is moss-green visible in hover states or secondary elements?'
      },
      {
        name: 'Sunlight Gold (#F89406)',
        instruction: 'Do CTAs or highlights use the sunlight-gold color?'
      },
      {
        name: 'Stone Beige (#F7F2DC)',
        instruction: 'Are background sections using stone-beige color?'
      }
    ]
  },
  {
    name: 'Responsive Design',
    tests: [
      {
        name: 'Mobile View (375px)',
        instruction: 'Resize to mobile - does the layout adapt properly?'
      },
      {
        name: 'Tablet View (768px)',
        instruction: 'At tablet size - are elements properly spaced?'
      },
      {
        name: 'Desktop View (1920px)',
        instruction: 'On desktop - is the layout utilizing full width appropriately?'
      },
      {
        name: 'No Horizontal Scroll',
        instruction: 'At all sizes - is there no unwanted horizontal scrolling?'
      }
    ]
  },
  {
    name: 'Component Styling',
    tests: [
      {
        name: 'Navigation Menu',
        instruction: 'Does the navigation have proper styling and hover effects?'
      },
      {
        name: 'Buttons & Links',
        instruction: 'Do buttons have hover/active states with smooth transitions?'
      },
      {
        name: 'Forms',
        instruction: 'Are form inputs styled with proper borders and focus states?'
      },
      {
        name: 'Cards & Containers',
        instruction: 'Do card components have shadows and proper spacing?'
      }
    ]
  },
  {
    name: 'Page-Specific Tests',
    tests: [
      {
        name: 'Home Page Hero',
        instruction: 'Is the home page hero section properly styled?'
      },
      {
        name: 'Tuition Calculator',
        instruction: 'Visit /tuition-affordability - are the calculator cards styled?'
      },
      {
        name: 'About Page',
        instruction: 'Visit /about - are images and text properly formatted?'
      },
      {
        name: 'Contact Forms',
        instruction: 'Visit /visit - are form elements consistently styled?'
      }
    ]
  },
  {
    name: 'Performance',
    tests: [
      {
        name: 'Page Load Time',
        instruction: 'Does the page load and render CSS within 2-3 seconds?'
      },
      {
        name: 'No Flash of Unstyled Content',
        instruction: 'On refresh - is there no FOUC (flash of unstyled content)?'
      },
      {
        name: 'Smooth Interactions',
        instruction: 'Are hover effects and transitions smooth (no jank)?'
      }
    ]
  }
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let skippedTests = 0;

async function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase());
    });
  });
}

async function runTests() {
  console.log(yellow('Instructions:'));
  console.log('- Answer y/yes for PASS');
  console.log('- Answer n/no for FAIL');
  console.log('- Answer s/skip to SKIP');
  console.log('- Press Ctrl+C to exit\n');

  for (const category of testCategories) {
    console.log('\n' + bold(blue(`📁 ${category.name}`)));
    console.log('─'.repeat(40));

    for (const test of category.tests) {
      totalTests++;
      
      // Run auto-check if available
      if (test.autoCheck) {
        process.stdout.write(`  ⏳ ${test.name}: Checking automatically...`);
        const result = await test.autoCheck();
        process.stdout.write('\r');
        
        if (result) {
          console.log(`  ${green('✓')} ${test.name}: ${green('AUTO-PASSED')}`);
          passedTests++;
          continue;
        }
      }

      // Manual check
      console.log(`\n  📋 ${test.name}`);
      console.log(`     ${test.instruction}`);
      
      const answer = await askQuestion('     Result (y/n/s): ');
      
      if (answer === 'y' || answer === 'yes') {
        console.log(`     ${green('✓ PASSED')}`);
        passedTests++;
      } else if (answer === 'n' || answer === 'no') {
        console.log(`     ${red('✗ FAILED')}`);
        failedTests++;
        
        const notes = await askQuestion('     Add notes (optional): ');
        if (notes) {
          console.log(`     ${yellow('Notes:')} ${notes}`);
        }
      } else {
        console.log(`     ${yellow('⚠ SKIPPED')}`);
        skippedTests++;
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(bold('\n📊 TEST SUMMARY\n'));
  
  console.log(`  Total Tests:    ${totalTests}`);
  console.log(`  ${green('Passed:')}        ${passedTests}`);
  console.log(`  ${red('Failed:')}        ${failedTests}`);
  console.log(`  ${yellow('Skipped:')}       ${skippedTests}`);
  
  const passRate = totalTests > 0 ? (passedTests / (totalTests - skippedTests) * 100).toFixed(1) : 0;
  console.log(`\n  Pass Rate:      ${passRate}%`);
  
  console.log('\n' + '='.repeat(50));

  if (failedTests === 0 && passedTests > 0) {
    console.log(green('\n✅ All tests passed! CSS implementation is working correctly.\n'));
  } else if (failedTests > 0) {
    console.log(red(`\n❌ ${failedTests} tests failed. Please review and fix the issues.\n`));
    
    console.log(yellow('Common fixes:'));
    console.log('  1. Check postcss.config.mjs has tailwindcss and autoprefixer');
    console.log('  2. Verify @tailwind directives in global.css');
    console.log('  3. Run: npm install -D tailwindcss autoprefixer');
    console.log('  4. Restart the dev server after changes\n');
  }

  rl.close();
}

// Run automated tests first
console.log(blue('Running automated checks first...\n'));

try {
  execSync('tsx scripts/verify-css-build.ts', { stdio: 'inherit' });
  console.log(green('\n✓ Automated checks passed!\n'));
} catch (error) {
  console.log(yellow('\n⚠ Some automated checks failed. Continuing with manual tests...\n'));
}

// Start manual tests
console.log(bold('Starting manual verification...\n'));
runTests().catch(console.error);