#!/usr/bin/env tsx

/**
 * /refine Command Implementation
 * 
 * This script provides the functionality for the /refine command that analyzes
 * the entire codebase and optimizes it for effectiveness and understanding.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';

interface RefineOptions {
  dryRun?: boolean;
  verbose?: boolean;
  scope?: 'all' | 'components' | 'pages' | 'lib' | 'styles';
}

interface AnalysisResult {
  unusedFiles: string[];
  duplicateCode: Array<{ files: string[]; similarity: number }>;
  complexComponents: Array<{ file: string; complexity: number; suggestions: string[] }>;
  unusedImports: Array<{ file: string; imports: string[] }>;
  optimizationOpportunities: Array<{ file: string; type: string; description: string }>;
  informationFlow: Array<{ from: string; to: string; relationship: string }>;
}

class CodeRefiner {
  private srcPath: string;
  private excludePatterns: RegExp[];

  constructor(projectRoot: string = process.cwd()) {
    this.srcPath = join(projectRoot, 'src');
    this.excludePatterns = [
      /node_modules/,
      /\.astro\//,
      /dist\//,
      /\.git\//,
      /coverage\//
    ];
  }

  /**
   * Main refine execution
   */
  async refine(options: RefineOptions = {}): Promise<AnalysisResult> {
    console.log('🔍 Starting codebase refinement analysis...\n');

    const analysis: AnalysisResult = {
      unusedFiles: [],
      duplicateCode: [],
      complexComponents: [],
      unusedImports: [],
      optimizationOpportunities: [],
      informationFlow: []
    };

    // Step 1: Analyze file usage and dependencies
    console.log('📊 Analyzing file dependencies...');
    const fileMap = await this.buildDependencyMap();
    analysis.unusedFiles = this.findUnusedFiles(fileMap);
    analysis.informationFlow = this.mapInformationFlow(fileMap);

    // Step 2: Find unused imports
    console.log('🧹 Detecting unused imports...');
    analysis.unusedImports = await this.findUnusedImports();

    // Step 3: Identify complex components
    console.log('🔀 Analyzing component complexity...');
    analysis.complexComponents = await this.analyzeComplexity();

    // Step 4: Find duplicate code
    console.log('🔄 Detecting code duplication...');
    analysis.duplicateCode = await this.findDuplicateCode();

    // Step 5: Identify optimization opportunities
    console.log('⚡ Finding optimization opportunities...');
    analysis.optimizationOpportunities = await this.findOptimizations();

    // Step 6: Generate report and apply fixes
    console.log('📝 Generating refinement report...');
    await this.generateReport(analysis);

    if (!options.dryRun) {
      console.log('🔧 Applying safe optimizations...');
      await this.applySafeOptimizations(analysis);
    }

    console.log('✅ Refinement analysis complete!\n');
    return analysis;
  }

  /**
   * Build dependency map of all files
   */
  private async buildDependencyMap(): Promise<Map<string, string[]>> {
    const fileMap = new Map<string, string[]>();
    const files = this.getAllSourceFiles();

    for (const file of files) {
      const dependencies = this.extractImports(file);
      fileMap.set(file, dependencies);
    }

    return fileMap;
  }

  /**
   * Get all source files in the project
   */
  private getAllSourceFiles(): string[] {
    const files: string[] = [];

    const walk = (dir: string) => {
      const items = readdirSync(dir);
      
      for (const item of items) {
        const fullPath = join(dir, item);
        
        if (this.excludePatterns.some(pattern => pattern.test(fullPath))) {
          continue;
        }

        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          walk(fullPath);
        } else if (this.isSourceFile(fullPath)) {
          files.push(fullPath);
        }
      }
    };

    walk(this.srcPath);
    return files;
  }

  /**
   * Check if file is a source file we care about
   */
  private isSourceFile(file: string): boolean {
    const ext = extname(file);
    return ['.astro', '.ts', '.js', '.tsx', '.jsx'].includes(ext);
  }

  /**
   * Extract import statements from a file
   */
  private extractImports(file: string): string[] {
    try {
      const content = readFileSync(file, 'utf-8');
      const importRegex = /import.*?from\s+['"]([^'"]+)['"]/g;
      const imports: string[] = [];
      let match;

      while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1]);
      }

      return imports;
    } catch (error) {
      console.warn(`Warning: Could not read file ${file}`);
      return [];
    }
  }

  /**
   * Find files that aren't imported anywhere
   */
  private findUnusedFiles(fileMap: Map<string, string[]>): string[] {
    const allFiles = Array.from(fileMap.keys());
    const importedFiles = new Set<string>();

    // Collect all imported files
    for (const [file, imports] of fileMap) {
      for (const imp of imports) {
        // Resolve relative imports
        if (imp.startsWith('.')) {
          const resolved = this.resolveImport(file, imp);
          if (resolved) {
            importedFiles.add(resolved);
          }
        }
      }
    }

    // Find files that are never imported (excluding pages and layouts)
    return allFiles.filter(file => {
      const relativePath = relative(this.srcPath, file);
      const isPage = relativePath.startsWith('pages/');
      const isLayout = relativePath.includes('Layout.astro');
      const isImported = importedFiles.has(file);
      
      return !isPage && !isLayout && !isImported;
    });
  }

  /**
   * Resolve relative import to absolute path
   */
  private resolveImport(fromFile: string, importPath: string): string | null {
    const extensions = ['.astro', '.ts', '.js', '.tsx', '.jsx'];
    const basePath = join(fromFile, '..', importPath);

    // Try with different extensions
    for (const ext of extensions) {
      const fullPath = basePath + ext;
      if (existsSync(fullPath)) {
        return fullPath;
      }
    }

    // Try as directory with index file
    for (const ext of extensions) {
      const indexPath = join(basePath, 'index' + ext);
      if (existsSync(indexPath)) {
        return indexPath;
      }
    }

    return null;
  }

  /**
   * Map information flow between components
   */
  private mapInformationFlow(fileMap: Map<string, string[]>): Array<{ from: string; to: string; relationship: string }> {
    const flow: Array<{ from: string; to: string; relationship: string }> = [];

    for (const [file, imports] of fileMap) {
      const fileName = relative(this.srcPath, file);
      
      for (const imp of imports) {
        if (imp.startsWith('.')) {
          const resolved = this.resolveImport(file, imp);
          if (resolved) {
            const targetName = relative(this.srcPath, resolved);
            let relationship = 'imports';
            
            // Classify relationship types
            if (fileName.startsWith('pages/') && targetName.startsWith('components/')) {
              relationship = 'page_uses_component';
            } else if (targetName.startsWith('lib/')) {
              relationship = 'uses_utility';
            } else if (targetName.includes('Layout')) {
              relationship = 'uses_layout';
            }
            
            flow.push({
              from: fileName,
              to: targetName,
              relationship
            });
          }
        }
      }
    }

    return flow;
  }

  /**
   * Find unused imports in files
   */
  private async findUnusedImports(): Promise<Array<{ file: string; imports: string[] }>> {
    // This would require more sophisticated AST parsing
    // For now, return empty array and implement later
    return [];
  }

  /**
   * Analyze component complexity
   */
  private async analyzeComplexity(): Promise<Array<{ file: string; complexity: number; suggestions: string[] }>> {
    const complexComponents: Array<{ file: string; complexity: number; suggestions: string[] }> = [];
    const files = this.getAllSourceFiles();

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const complexity = this.calculateComplexity(content);
        const suggestions = this.generateComplexitySuggestions(content, file);

        if (complexity > 15 || suggestions.length > 0) {
          complexComponents.push({
            file: relative(this.srcPath, file),
            complexity,
            suggestions
          });
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    return complexComponents;
  }

  /**
   * Calculate cyclomatic complexity
   */
  private calculateComplexity(content: string): number {
    // Simple complexity calculation based on control structures
    const patterns = [
      /if\s*\(/g,
      /else\s*if/g,
      /for\s*\(/g,
      /while\s*\(/g,
      /switch\s*\(/g,
      /case\s+/g,
      /catch\s*\(/g,
      /\?\s*.*?\s*:/g, // ternary operators
    ];

    let complexity = 1; // Base complexity

    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  /**
   * Generate suggestions to reduce complexity
   */
  private generateComplexitySuggestions(content: string, file: string): string[] {
    const suggestions: string[] = [];
    const lines = content.split('\n');

    // Check for long files
    if (lines.length > 200) {
      suggestions.push('Consider breaking this large file into smaller components');
    }

    // Check for deeply nested structures
    let maxIndentation = 0;
    for (const line of lines) {
      const indentation = line.match(/^\s*/)?.[0].length || 0;
      maxIndentation = Math.max(maxIndentation, indentation);
    }

    if (maxIndentation > 24) { // 6 levels of 4-space indentation
      suggestions.push('Reduce nesting depth by extracting functions or using early returns');
    }

    // Check for repeated patterns
    if (content.includes('lucide-astro') && (content.match(/import.*lucide-astro/g) || []).length > 5) {
      suggestions.push('Consider creating an icon component to reduce import repetition');
    }

    // Check for large prop interfaces (Astro components)
    if (file.endsWith('.astro') && content.includes('interface Props') && content.match(/\w+\??\s*:/g)?.length > 10) {
      suggestions.push('Consider breaking down large prop interfaces into smaller, focused interfaces');
    }

    return suggestions;
  }

  /**
   * Find duplicate code patterns
   */
  private async findDuplicateCode(): Promise<Array<{ files: string[]; similarity: number }>> {
    // This would require more sophisticated analysis
    // For now, return simple pattern matching
    const duplicates: Array<{ files: string[]; similarity: number }> = [];
    const files = this.getAllSourceFiles();
    const contentMap = new Map<string, string>();

    // Read all files
    for (const file of files) {
      try {
        contentMap.set(file, readFileSync(file, 'utf-8'));
      } catch (error) {
        // Skip unreadable files
      }
    }

    // Simple duplicate detection (would be enhanced with AST analysis)
    const normalizedContent = new Map<string, string[]>();
    
    for (const [file, content] of contentMap) {
      const normalized = content
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
        .replace(/\/\/.*$/gm, '') // Remove line comments
        .trim();
      
      if (normalized.length > 100) { // Only consider substantial content
        if (!normalizedContent.has(normalized)) {
          normalizedContent.set(normalized, []);
        }
        normalizedContent.get(normalized)!.push(relative(this.srcPath, file));
      }
    }

    // Find files with identical content
    for (const [content, files] of normalizedContent) {
      if (files.length > 1) {
        duplicates.push({
          files,
          similarity: 100
        });
      }
    }

    return duplicates;
  }

  /**
   * Find optimization opportunities
   */
  private async findOptimizations(): Promise<Array<{ file: string; type: string; description: string }>> {
    const optimizations: Array<{ file: string; type: string; description: string }> = [];
    const files = this.getAllSourceFiles();

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const relativePath = relative(this.srcPath, file);

        // Check for console.log in production files
        if (content.includes('console.log') && !file.includes('test')) {
          optimizations.push({
            file: relativePath,
            type: 'performance',
            description: 'Remove console.log statements for production'
          });
        }

        // Check for unused CSS classes (basic check)
        if (file.endsWith('.astro') && content.includes('class=')) {
          const unusedClasses = this.findUnusedTailwindClasses(content);
          if (unusedClasses.length > 0) {
            optimizations.push({
              file: relativePath,
              type: 'cleanup',
              description: `Potential unused Tailwind classes: ${unusedClasses.join(', ')}`
            });
          }
        }

        // Check for inline styles that could be Tailwind
        if (content.includes('style=')) {
          optimizations.push({
            file: relativePath,
            type: 'consistency',
            description: 'Consider converting inline styles to Tailwind classes'
          });
        }

        // Check for hardcoded strings that could be constants
        const hardcodedStrings = content.match(/"[^"]{20,}"/g);
        if (hardcodedStrings && hardcodedStrings.length > 3) {
          optimizations.push({
            file: relativePath,
            type: 'maintainability',
            description: 'Consider extracting long strings to constants'
          });
        }

      } catch (error) {
        // Skip unreadable files
      }
    }

    return optimizations;
  }

  /**
   * Basic check for potentially unused Tailwind classes
   */
  private findUnusedTailwindClasses(content: string): string[] {
    // This is a simplified check - would need more sophisticated analysis
    const unusedClasses: string[] = [];
    
    // Check for classes that might be typos or unused
    const classMatches = content.match(/class="([^"]*)"/g);
    if (classMatches) {
      for (const match of classMatches) {
        const classes = match.replace(/class="([^"]*)"/, '$1').split(/\s+/);
        for (const cls of classes) {
          // Check for potential typos in common Tailwind patterns
          if (cls.match(/^(w|h|p|m|text|bg|border)-\d+$/) && cls.includes('99')) {
            unusedClasses.push(cls);
          }
        }
      }
    }

    return [...new Set(unusedClasses)];
  }

  /**
   * Generate refinement report
   */
  private async generateReport(analysis: AnalysisResult): Promise<void> {
    const reportPath = join(process.cwd(), 'REFINEMENT_REPORT.md');
    
    const report = `# Codebase Refinement Report

*Generated: ${new Date().toISOString()}*

## Summary

- **Unused Files**: ${analysis.unusedFiles.length}
- **Complex Components**: ${analysis.complexComponents.length}
- **Duplicate Code**: ${analysis.duplicateCode.length}
- **Optimization Opportunities**: ${analysis.optimizationOpportunities.length}

## Unused Files

${analysis.unusedFiles.length > 0 
  ? analysis.unusedFiles.map(file => `- \`${file}\``).join('\n')
  : 'No unused files detected.'
}

## Complex Components

${analysis.complexComponents.map(comp => `
### \`${comp.file}\`
- **Complexity**: ${comp.complexity}
- **Suggestions**:
${comp.suggestions.map(s => `  - ${s}`).join('\n')}
`).join('\n')}

## Duplicate Code

${analysis.duplicateCode.map(dup => `
### ${dup.similarity}% Similar
- Files: ${dup.files.map(f => `\`${f}\``).join(', ')}
`).join('\n')}

## Optimization Opportunities

${analysis.optimizationOpportunities.map(opt => `
### \`${opt.file}\`
- **Type**: ${opt.type}
- **Description**: ${opt.description}
`).join('\n')}

## Information Flow

${analysis.informationFlow.slice(0, 10).map(flow => `
- \`${flow.from}\` ${flow.relationship} \`${flow.to}\`
`).join('\n')}

${analysis.informationFlow.length > 10 ? `\n*... and ${analysis.informationFlow.length - 10} more relationships*` : ''}
`;

    writeFileSync(reportPath, report);
    console.log(`📄 Report saved to: ${reportPath}`);
  }

  /**
   * Apply safe optimizations
   */
  private async applySafeOptimizations(analysis: AnalysisResult): Promise<void> {
    let changesApplied = 0;

    // Remove console.log statements (safe in most cases)
    for (const opt of analysis.optimizationOpportunities) {
      if (opt.type === 'performance' && opt.description.includes('console.log')) {
        const filePath = join(this.srcPath, opt.file);
        try {
          let content = readFileSync(filePath, 'utf-8');
          const originalContent = content;
          
          // Remove console.log statements
          content = content.replace(/console\.log\([^)]*\);?\s*/g, '');
          
          if (content !== originalContent) {
            writeFileSync(filePath, content);
            console.log(`  ✅ Removed console.log from ${opt.file}`);
            changesApplied++;
          }
        } catch (error) {
          console.warn(`  ⚠️  Could not process ${opt.file}: ${error}`);
        }
      }
    }

    console.log(`🎯 Applied ${changesApplied} safe optimizations`);
  }
}

// Command-line interface
async function main() {
  const args = process.argv.slice(2);
  const options: RefineOptions = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    scope: 'all'
  };

  if (args.includes('--help')) {
    console.log(`
Usage: npm run refine [options]

Options:
  --dry-run     Analyze only, don't apply changes
  --verbose     Show detailed output
  --help        Show this help message

Examples:
  npm run refine                    # Run full refinement
  npm run refine --dry-run          # Analyze only
  npm run refine --verbose          # Detailed output
`);
    return;
  }

  const refiner = new CodeRefiner();
  await refiner.refine(options);
}

// Run if called directly (ES module compatible)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { CodeRefiner, type RefineOptions, type AnalysisResult };