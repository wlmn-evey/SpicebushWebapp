#!/usr/bin/env tsx

/**
 * Thinking Matrix Validation Framework
 * 
 * This script provides runtime validation and guidance for following
 * the thinking matrix principles during problem-solving.
 */

interface ProblemContext {
  description: string;
  filesInvolved: string[];
  complexity: 'trivial' | 'simple' | 'complex';
  impactLevel: 'low' | 'medium' | 'high';
  safetyRisk: 'low' | 'medium' | 'high';
}

interface Solution {
  approach: string;
  steps: string[];
  toolsNeeded: string[];
  riskAssessment: string;
}

class ThinkingMatrixValidator {
  
  /**
   * Analyze a problem and provide thinking matrix guidance
   */
  analyzeProblem(description: string): ProblemContext {
    console.log('🧠 THINKING MATRIX: Problem Analysis');
    console.log('=====================================\n');
    
    const context: ProblemContext = {
      description,
      filesInvolved: this.extractFilesFromDescription(description),
      complexity: this.assessComplexity(description),
      impactLevel: this.assessImpactLevel(description),
      safetyRisk: this.assessSafetyRisk(description)
    };

    this.displayAnalysis(context);
    return context;
  }

  /**
   * Recommend solution approach based on problem context
   */
  recommendSolution(context: ProblemContext): Solution {
    console.log('\n🎯 THINKING MATRIX: Solution Recommendation');
    console.log('==========================================\n');

    const solution = this.generateSolutionGuidance(context);
    this.displaySolution(solution);
    this.showQualityGates(context);
    
    return solution;
  }

  /**
   * Validate if current approach follows thinking matrix
   */
  validateApproach(context: ProblemContext, proposedSteps: string[]): boolean {
    console.log('\n✅ THINKING MATRIX: Approach Validation');
    console.log('======================================\n');

    const violations = this.findViolations(context, proposedSteps);
    
    if (violations.length === 0) {
      console.log('✅ Approach follows thinking matrix principles');
      return true;
    } else {
      console.log('⚠️  Approach violations detected:');
      violations.forEach(violation => console.log(`   - ${violation}`));
      console.log('\n💡 Consider revising approach to follow MVP principle');
      return false;
    }
  }

  private extractFilesFromDescription(description: string): string[] {
    const filePattern = /\b[\w-]+\.(astro|ts|js|tsx|jsx|md)\b/g;
    const matches = description.match(filePattern) || [];
    return [...new Set(matches)];
  }

  private assessComplexity(description: string): 'trivial' | 'simple' | 'complex' {
    const complexityIndicators = {
      trivial: ['fix typo', 'update text', 'change color', 'add comment', 'fix spelling'],
      simple: ['add component', 'update style', 'modify function', 'create page', 'add button'],
      complex: ['refactor', 'restructure', 'migrate', 'implement system', 'integrate', 'authentication', 'database']
    };

    const lower = description.toLowerCase();
    
    if (complexityIndicators.complex.some(indicator => lower.includes(indicator))) {
      return 'complex';
    }
    if (complexityIndicators.simple.some(indicator => lower.includes(indicator))) {
      return 'simple';
    }
    return 'trivial';
  }

  private assessImpactLevel(description: string): 'low' | 'medium' | 'high' {
    const highImpactKeywords = ['auth', 'login', 'database', 'supabase', 'header', 'layout', 'navigation', 'tuition', 'security'];
    const mediumImpactKeywords = ['component', 'page', 'style', 'admin', 'form', 'calculator', 'image'];
    
    const lower = description.toLowerCase();
    
    if (highImpactKeywords.some(keyword => lower.includes(keyword))) {
      return 'high';
    }
    if (mediumImpactKeywords.some(keyword => lower.includes(keyword))) {
      return 'medium';
    }
    return 'low';
  }

  private assessSafetyRisk(description: string): 'low' | 'medium' | 'high' {
    const highRiskKeywords = ['delete', 'remove', 'migrate', 'change database', 'auth', 'security', 'user data'];
    const mediumRiskKeywords = ['modify', 'update', 'refactor', 'move', 'replace'];
    
    const lower = description.toLowerCase();
    
    if (highRiskKeywords.some(keyword => lower.includes(keyword))) {
      return 'high';
    }
    if (mediumRiskKeywords.some(keyword => lower.includes(keyword))) {
      return 'medium';
    }
    return 'low';
  }

  private displayAnalysis(context: ProblemContext): void {
    console.log(`📝 Problem: ${context.description}`);
    console.log(`📊 Complexity: ${this.colorizeComplexity(context.complexity)}`);
    console.log(`🎯 Impact Level: ${this.colorizeImpact(context.impactLevel)}`);
    console.log(`⚠️  Safety Risk: ${this.colorizeSafety(context.safetyRisk)}`);
    
    if (context.filesInvolved.length > 0) {
      console.log(`📁 Files Involved: ${context.filesInvolved.join(', ')}`);
    }

    // Show warnings
    if (context.impactLevel === 'high') {
      console.log('\n🚨 HIGH IMPACT: Consult DEPENDENCY_MAP.md before proceeding');
    }
    if (context.safetyRisk === 'high') {
      console.log('🚨 HIGH RISK: Extra caution required - backup and test thoroughly');
    }
    if (context.complexity === 'complex') {
      console.log('🚨 COMPLEX: Use TodoWrite to track progress and break into smaller tasks');
    }
  }

  private colorizeComplexity(complexity: string): string {
    switch (complexity) {
      case 'trivial': return `🟢 ${complexity.toUpperCase()}`;
      case 'simple': return `🟡 ${complexity.toUpperCase()}`;
      case 'complex': return `🔴 ${complexity.toUpperCase()}`;
      default: return complexity.toUpperCase();
    }
  }

  private colorizeImpact(impact: string): string {
    switch (impact) {
      case 'low': return `🟢 ${impact.toUpperCase()}`;
      case 'medium': return `🟡 ${impact.toUpperCase()}`;
      case 'high': return `🔴 ${impact.toUpperCase()}`;
      default: return impact.toUpperCase();
    }
  }

  private colorizeSafety(safety: string): string {
    switch (safety) {
      case 'low': return `🟢 ${safety.toUpperCase()}`;
      case 'medium': return `🟡 ${safety.toUpperCase()}`;
      case 'high': return `🔴 ${safety.toUpperCase()}`;
      default: return safety.toUpperCase();
    }
  }

  private generateSolutionGuidance(context: ProblemContext): Solution {
    const guidance = this.getSolutionTemplate(context);
    return guidance;
  }

  private getSolutionTemplate(context: ProblemContext): Solution {
    if (context.complexity === 'trivial') {
      return {
        approach: 'Direct Implementation',
        steps: [
          'Read relevant file(s)',
          'Make minimal targeted change',
          'Verify change is correct'
        ],
        toolsNeeded: ['Read', 'Edit'],
        riskAssessment: 'Low risk - proceed with confidence'
      };
    }

    if (context.complexity === 'simple') {
      const steps = [
        'Create TodoWrite to track progress',
        'Analyze current state with appropriate tools',
        'Make changes in logical sequence',
        'Test each change before proceeding',
        'Update TodoWrite as you progress'
      ];

      // Add impact-specific steps
      if (context.impactLevel === 'high') {
        steps.splice(1, 0, 'Consult DEPENDENCY_MAP.md for impact assessment');
      }

      return {
        approach: 'Planned Implementation',
        steps,
        toolsNeeded: ['TodoWrite', 'Read', 'Edit/MultiEdit', 'Bash for testing'],
        riskAssessment: context.safetyRisk === 'high' ? 
          'Medium-High risk - thorough testing required' : 
          'Medium risk - standard validation sufficient'
      };
    }

    // Complex
    const steps = [
      'Create detailed TodoWrite with analysis phase',
      'Consult DEPENDENCY_MAP.md for impact assessment',
      'Use Task agent for comprehensive analysis if needed',
      'Break into smaller, safer changes',
      'Implement incrementally with testing at each step',
      'Update documentation and dependency map if needed'
    ];

    if (context.safetyRisk === 'high') {
      steps.splice(2, 0, 'Create backup/rollback plan');
    }

    return {
      approach: 'Systematic Analysis & Implementation',
      steps,
      toolsNeeded: ['TodoWrite', 'Task', 'Multiple Read/Grep', 'DEPENDENCY_MAP.md', 'Full testing suite'],
      riskAssessment: 'High complexity - requires careful planning and validation'
    };
  }

  private displaySolution(solution: Solution): void {
    console.log(`🎯 Recommended Approach: ${solution.approach}`);
    console.log(`⚠️  Risk Assessment: ${solution.riskAssessment}\n`);
    
    console.log('📋 Recommended Steps:');
    solution.steps.forEach((step, index) => {
      console.log(`   ${index + 1}. ${step}`);
    });
    
    console.log(`\n🛠️  Tools Needed: ${solution.toolsNeeded.join(', ')}`);
  }

  private showQualityGates(context: ProblemContext): void {
    console.log('\n🚪 Quality Gates - Check Before Proceeding:');
    console.log('   □ Problem is clearly understood');
    console.log('   □ Solution approach is minimal and focused');
    
    if (context.impactLevel !== 'low') {
      console.log('   □ DEPENDENCY_MAP.md consulted for impact');
    }
    
    if (context.complexity !== 'trivial') {
      console.log('   □ TodoWrite created to track progress');
    }
    
    if (context.safetyRisk !== 'low') {
      console.log('   □ Backup/rollback plan considered');
      console.log('   □ Testing strategy defined');
    }
    
    console.log('   □ Scope limited to original request only');
    
    // Add Spicebush-specific checks
    console.log('\n🏫 Spicebush-Specific Checks:');
    console.log('   □ Aligns with SPICES values (Social justice, Peace, Inclusion, Community, Environment, Simplicity)');
    console.log('   □ Supports accessibility and multilingual requirements');
    console.log('   □ Maintains Montessori philosophy alignment');
    console.log('   □ Does not compromise family privacy or child safety');
  }

  private findViolations(context: ProblemContext, steps: string[]): string[] {
    const violations: string[] = [];

    // Check for scope creep indicators
    const scopeCreepWords = ['also', 'while', 'improve', 'refactor', 'clean up', 'optimize', 'enhance'];
    const stepsText = steps.join(' ').toLowerCase();
    
    if (scopeCreepWords.some(word => stepsText.includes(word))) {
      violations.push('Potential scope creep detected - focus on original problem only');
    }

    // Check for over-engineering
    if (context.complexity === 'trivial' && steps.length > 3) {
      violations.push('Over-engineering detected - trivial problems should have ≤3 steps');
    }

    if (context.complexity === 'simple' && steps.length > 6) {
      violations.push('Over-engineering detected - simple problems should have ≤6 steps');
    }

    // Check for missing safety measures
    if (context.safetyRisk === 'high' && !stepsText.includes('test')) {
      violations.push('High-risk change without testing plan');
    }

    if (context.impactLevel === 'high' && !stepsText.includes('dependency')) {
      violations.push('High-impact change without dependency analysis');
    }

    // Check for missing TodoWrite when needed
    if (context.complexity !== 'trivial' && !stepsText.includes('todowrite') && !stepsText.includes('todo')) {
      violations.push('Complex task without progress tracking (TodoWrite missing)');
    }

    // Check for Spicebush-specific violations
    if (stepsText.includes('delete') || stepsText.includes('remove')) {
      violations.push('Destructive operations detected - ensure no impact on enrolled families');
    }

    return violations;
  }

  /**
   * Interactive mode for step-by-step problem solving
   */
  async interactiveAnalysis(description: string): Promise<void> {
    console.log('🎯 THINKING MATRIX: Interactive Analysis Mode');
    console.log('============================================\n');

    const context = this.analyzeProblem(description);
    const solution = this.recommendSolution(context);

    console.log('\n📝 MVP Checklist - Answer each question:');
    console.log('==========================================');
    
    const questions = [
      'Is this solving exactly what was requested?',
      'Am I adding any features not explicitly asked for?',
      'Can this be done in fewer steps?',
      'Will this maintain existing functionality?',
      'Is this the minimal change that achieves the goal?'
    ];

    questions.forEach((question, index) => {
      console.log(`${index + 1}. ${question}`);
    });

    console.log('\n🔄 If any answer is "No", reconsider your approach.');
    console.log('💡 Remember: The best code is the code you don\'t have to write!');
  }
}

// Command-line interface
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
🧠 Thinking Matrix Validator

Usage:
  npm run thinking-check "problem description"
  npm run thinking-check "problem description" --interactive
  
Examples:
  npm run thinking-check "Add a new button to the header"
  npm run thinking-check "Refactor the authentication system"
  npm run thinking-check "Fix typo in About page"
  npm run thinking-check "Implement Instagram integration" --interactive

This tool analyzes problems and provides guidance following
the Thinking Matrix principles for minimum viable changes.

Flags:
  --help        Show this help message
  --interactive Use interactive analysis mode with step-by-step guidance
`);
    return;
  }

  const interactive = args.includes('--interactive');
  const problemDescription = args.filter(arg => !arg.startsWith('--')).join(' ');
  
  if (!problemDescription) {
    console.error('❌ Error: Please provide a problem description');
    console.log('Example: npm run thinking-check "Add contact form validation"');
    return;
  }

  const validator = new ThinkingMatrixValidator();
  
  if (interactive) {
    validator.interactiveAnalysis(problemDescription);
  } else {
    const context = validator.analyzeProblem(problemDescription);
    const solution = validator.recommendSolution(context);
    
    console.log('\n💡 Remember: The best code is the code you don\'t have to write!');
    console.log('📚 For details, see: THINKING_MATRIX.md');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { ThinkingMatrixValidator, type ProblemContext, type Solution };