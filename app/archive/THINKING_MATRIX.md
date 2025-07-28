# Thinking Matrix: Systematic Problem-Solving Framework

*Purpose: Ensure minimal viable changes that achieve necessary results without sacrificing safety or functionality*

## Core Principle: MVP (Minimum Viable Change)

Every action should follow the **Minimum Viable Change** principle:
- ✅ Solves the immediate problem
- ✅ Maintains system safety and functionality
- ✅ Avoids scope creep and unnecessary complexity
- ✅ Preserves existing working systems
- ✅ Can be validated and tested quickly

## Phase 1: BREAKDOWN (Understanding the Problem)

### 🔍 Problem Analysis Matrix

| Question | Tool/Method | Output | Safety Check |
|----------|-------------|--------|--------------|
| **What exactly needs to change?** | Read user request literally | Specific requirement | Is this the minimum needed? |
| **What systems are involved?** | DEPENDENCY_MAP.md lookup | Affected components | Check impact zones (High/Med/Low) |
| **What are the constraints?** | Read existing code/config | Current limitations | Identify breaking change risks |
| **What would "done" look like?** | Define success criteria | Measurable outcome | Ensure scope is contained |

### 🚫 Rabbit Hole Prevention Checklist

Before proceeding, ask:
- [ ] Am I solving the stated problem or a different one?
- [ ] Am I adding features not requested?
- [ ] Am I refactoring unrelated code?
- [ ] Am I over-engineering the solution?
- [ ] Can this be done in fewer steps?

## Phase 2: TRACK (Planning and Resource Allocation)

### 📋 Task Decomposition Framework

| Task Size | Characteristics | Approach | Tools |
|-----------|----------------|----------|-------|
| **Trivial** (1-2 actions) | Single file, no dependencies | Direct action | Read → Edit/Write |
| **Simple** (3-5 actions) | Few files, clear dependencies | Linear workflow | TodoWrite → Sequential actions |
| **Complex** (6+ actions) | Multiple systems, unclear scope | Break into Simple tasks | TodoWrite → Analysis → Subtasks |

### 🎯 Planning Decision Tree

```
Is the change trivial? (Single file, obvious fix)
├─ YES → Execute immediately
└─ NO → Continue to analysis

Does it affect HIGH IMPACT components? (DEPENDENCY_MAP.md)
├─ YES → Mandatory: Full analysis + testing plan
└─ NO → Continue to scope check

Can it be completed in <5 actions?
├─ YES → Create TodoWrite + proceed
└─ NO → Break into smaller changes
```

### 📝 Mandatory TodoWrite Criteria

Use TodoWrite when:
- Task requires >3 distinct actions
- Multiple files will be modified
- Any HIGH IMPACT component is involved
- User provides multiple requirements
- Change affects authentication, database, or core functionality

## Phase 3: ANALYZE (Understanding Current State)

### 🔬 Analysis Tool Selection Matrix

| Need | Primary Tool | Secondary Tool | When to Use |
|------|-------------|----------------|-------------|
| **Code Structure** | Glob + Read | Grep | Understanding existing implementation |
| **Dependencies** | DEPENDENCY_MAP.md | Grep for imports | Before modifying any component |
| **Database Schema** | Read migrations | Supabase dashboard | Before database changes |
| **Component Usage** | Grep for component name | Task for complex search | Before component changes |
| **Configuration** | Read config files | Glob for similar patterns | Before environment changes |

### 🔍 Analysis Depth Guidelines

| Impact Level | Analysis Required | Tools | Time Limit |
|--------------|------------------|-------|------------|
| **LOW** | Basic file reading | Read, Glob | 2-3 tool calls |
| **MEDIUM** | Dependency check + file analysis | Read, Grep, DEPENDENCY_MAP | 5-7 tool calls |
| **HIGH** | Full system analysis | Task agent, multiple tools | 10+ tool calls, thorough investigation |

## Phase 4: PLAN (Solution Design)

### 🎯 Solution Selection Framework

| Approach | When to Use | Pros | Cons | Safety Level |
|----------|-------------|------|------|--------------|
| **Direct Edit** | Single file, obvious change | Fast, simple | Limited scope | HIGH |
| **Multi-file Edit** | Related changes, clear dependencies | Efficient, atomic | Requires careful sequencing | MEDIUM |
| **Component Creation** | New functionality needed | Clean separation | Adds complexity | MEDIUM |
| **Architecture Change** | Fundamental restructuring needed | Long-term benefits | High risk, extensive testing | LOW |

### 📋 Pre-Action Validation

Before implementing any solution:
1. **Scope Check**: Does this solve exactly what was requested?
2. **Dependency Check**: Have I consulted DEPENDENCY_MAP.md for impact?
3. **Safety Check**: Can this break existing functionality?
4. **Test Plan**: How will I verify this works?
5. **Rollback Plan**: How can this be undone if needed?

## Phase 5: ACT (Implementation)

### ⚡ Execution Priority Matrix

| Priority | Action Type | Characteristics | Approach |
|----------|-------------|----------------|----------|
| **P0** | Safety-critical fixes | Auth, security, data loss | Immediate, minimal change |
| **P1** | Functionality restoration | Broken features, critical bugs | Fast implementation |
| **P2** | Feature implementation | New functionality, enhancements | Measured approach |
| **P3** | Optimization | Performance, code quality | Defer if scope unclear |

### 🛠️ Implementation Patterns

#### Pattern 1: Single File Change
```
1. Read existing file
2. Identify exact change location
3. Edit with minimal modification
4. Verify change is correct
```

#### Pattern 2: Multi-Component Change
```
1. Update TodoWrite with plan
2. Start with lowest-risk component
3. Test each change before next
4. Update dependency map if needed
```

#### Pattern 3: New Feature Addition
```
1. Check if existing pattern can be extended
2. Create minimal new component if needed
3. Integrate with existing system
4. Update tests and documentation
```

### 🚨 Stop/Escalate Conditions

Stop immediately and reassess if:
- Change affects >5 files unexpectedly
- Tests start failing for unclear reasons
- Dependency relationships become unclear
- Scope expands beyond original request
- Safety concerns arise

## Quality Gates

### ✅ Before Starting Work
- [ ] Problem is clearly understood
- [ ] DEPENDENCY_MAP.md consulted for impact
- [ ] Solution approach selected and justified
- [ ] TodoWrite created if complexity warrants

### ✅ During Implementation  
- [ ] Each change is minimal and focused
- [ ] Dependencies are handled in correct order
- [ ] Testing happens after each significant change
- [ ] TodoWrite is updated with progress

### ✅ Before Completion
- [ ] Original problem is solved
- [ ] No unintended side effects introduced
- [ ] Code follows linting policies
- [ ] Documentation updated if needed

## Anti-Patterns to Avoid

### 🚫 Scope Creep Indicators
- "While I'm here, I should also..."
- "This would be better if I also..."
- "Let me just clean up this other thing..."
- Adding features not explicitly requested

### 🚫 Over-Engineering Signals
- Creating abstractions for single use
- Adding configuration for static requirements
- Building for hypothetical future needs
- Optimizing before measuring performance issues

### 🚫 Rabbit Hole Warning Signs
- Analysis taking longer than implementation would
- Finding "interesting" problems not related to request
- Wanting to refactor unrelated code
- Discovering potential improvements everywhere

## MCP Integration Guidelines

### Tool Selection Decision Tree
```
Need to search/find something?
├─ Known file/location → Read, Glob
├─ Complex search → Grep
└─ Open-ended exploration → Task

Need to modify code?
├─ Single change → Edit
├─ Multiple related changes → MultiEdit
└─ New file needed → Write

Need to understand system?
├─ Existing documentation → Read
├─ Code patterns → Grep, Glob
└─ Complex analysis → Task

Need to run commands?
├─ Simple command → Bash
├─ Testing → npm scripts via Bash
└─ Complex operations → Multiple Bash calls
```

### MCP Efficiency Rules
1. **Batch related operations** when possible
2. **Use most specific tool** for the job
3. **Avoid redundant tool calls** (don't re-read files)
4. **Leverage Task agent** for complex searches only
5. **Keep tool usage focused** on immediate need

## Success Metrics

A successful change should:
- ✅ Solve the stated problem completely
- ✅ Require minimal modifications to existing code
- ✅ Pass all existing tests and linting
- ✅ Maintain or improve system safety
- ✅ Be easily understood by future maintainers
- ✅ Be reversible if needed

Remember: **The best code is the code you don't have to write.**