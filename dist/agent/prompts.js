"use strict";
/**
 * Production-Grade Prompts for DevOps Log Analysis
 * Structured for deterministic outputs and JSON responses
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CODE_FIX_SYSTEM_PROMPT = exports.LOG_ANALYSIS_SYSTEM_PROMPT = exports.SYSTEM_PROMPT = void 0;
exports.buildLogPrompt = buildLogPrompt;
exports.buildEnhancedLogPrompt = buildEnhancedLogPrompt;
exports.buildCodeFixPrompt = buildCodeFixPrompt;
exports.buildClassificationPrompt = buildClassificationPrompt;
exports.buildReflectionPrompt = buildReflectionPrompt;
exports.buildChatPrompt = buildChatPrompt;
exports.buildConversationPrompt = buildConversationPrompt;
// ============================================================================
// SYSTEM PROMPTS - Core Identity
// ============================================================================
exports.SYSTEM_PROMPT = `You are a senior DevOps SRE and build system expert with 15+ years of experience.

Your responsibilities:
- Identify root cause of build/runtime errors
- Classify error type accurately
- Provide minimal reproducible fix
- Avoid hallucinations
- If uncertain, state assumptions clearly

Output MUST be valid JSON.
No markdown code blocks.
No explanations outside JSON.
Always respond with properly formatted JSON only.`;
exports.LOG_ANALYSIS_SYSTEM_PROMPT = `You are an expert DevOps log analyst specializing in:
- CI/CD pipeline failures
- Build system errors
- Runtime exceptions
- Infrastructure issues
- Dependency conflicts
- Environment configuration problems

Your analysis must be:
1. Precise - identify the exact error
2. Actionable - provide clear fix steps
3. Structured - always return valid JSON
4. Honest - acknowledge uncertainty when present

CRITICAL: Your response must be ONLY valid JSON, no other text.`;
exports.CODE_FIX_SYSTEM_PROMPT = `You are an expert software engineer specializing in bug fixes and code repair.

Your responsibilities:
- Analyze code errors and their context
- Generate minimal, targeted fixes
- Ensure fixes don't break existing functionality
- Follow best practices and coding standards

Output MUST be valid JSON with the fix details.
No markdown, no explanations outside JSON.`;
/**
 * Build log analysis prompt
 */
function buildLogPrompt(logText) {
    return [
        {
            role: "system",
            content: exports.LOG_ANALYSIS_SYSTEM_PROMPT
        },
        {
            role: "user",
            content: `Analyze the following CI/build/runtime log and identify the root cause.

Log:
\`\`\`
${logText}
\`\`\`

Return JSON with this exact structure:
{
    "error_type": "Specific error type (e.g., ModuleNotFoundError, TypeError, BuildFailure)",
    "error_category": "build|runtime|infrastructure|dependency|configuration|code|unknown",
    "root_cause": "Clear explanation of what caused this error",
    "confidence": 85,
    "suggested_fix": "Brief description of the fix",
    "step_by_step_fix": [
        "Step 1: Description",
        "Step 2: Description",
        "Step 3: Description"
    ],
    "is_environment_issue": false,
    "is_dependency_issue": false,
    "is_code_issue": true,
    "is_configuration_issue": false,
    "affected_files": ["file1.py", "file2.js"],
    "severity": "high",
    "related_errors": ["Related error 1", "Related error 2"]
}

Analyze now and return ONLY the JSON:`
        }
    ];
}
/**
 * Build enhanced log analysis prompt with reasoning scaffold
 */
function buildEnhancedLogPrompt(logText) {
    return [
        {
            role: "system",
            content: exports.LOG_ANALYSIS_SYSTEM_PROMPT
        },
        {
            role: "user",
            content: `Analyze this log using systematic reasoning.

REASONING STEPS:
1. Extract error signal - Find the primary error message
2. Identify failure layer - Is it build, runtime, infrastructure, dependency, or code?
3. Evaluate dependency context - Check for version conflicts, missing packages
4. Check for environment mismatch - Path issues, env vars, permissions
5. Produce final structured result

Log to analyze:
\`\`\`
${logText}
\`\`\`

Return ONLY valid JSON:
{
    "error_type": "",
    "error_category": "",
    "root_cause": "",
    "confidence": 0,
    "suggested_fix": "",
    "step_by_step_fix": [],
    "is_environment_issue": false,
    "is_dependency_issue": false,
    "is_code_issue": false,
    "is_configuration_issue": false,
    "affected_files": [],
    "severity": "medium",
    "related_errors": [],
    "reasoning_trace": {
        "error_signal": "What is the main error",
        "failure_layer": "Where did it fail",
        "dependency_analysis": "Dependency issues found",
        "environment_analysis": "Environment issues found"
    }
}`
        }
    ];
}
/**
 * Build code fix prompt
 */
function buildCodeFixPrompt(code, errorMessage, language = "python") {
    return [
        {
            role: "system",
            content: exports.CODE_FIX_SYSTEM_PROMPT
        },
        {
            role: "user",
            content: `Fix the following ${language} code that produces this error:

Error: ${errorMessage}

Code:
\`\`\`${language}
${code}
\`\`\`

Return JSON with this structure:
{
    "fix_description": "Brief description of the fix",
    "fixed_code": "The corrected code",
    "explanation": "Why this fix works",
    "changes_made": ["Change 1", "Change 2"],
    "potential_side_effects": ["Possible issue 1"],
    "test_suggestions": ["Test case 1", "Test case 2"]
}

Return ONLY the JSON:`
        }
    ];
}
/**
 * Build classification prompt
 */
function buildClassificationPrompt(errorContext) {
    return [
        {
            role: "system",
            content: exports.SYSTEM_PROMPT
        },
        {
            role: "user",
            content: `Classify this error for triage:

${errorContext}

Return JSON:
{
    "category": "build|test|deploy|runtime|infrastructure",
    "subcategory": "Specific category",
    "priority": "p0|p1|p2|p3",
    "is_flaky": false,
    "is_reproducible": true,
    "estimated_fix_time": "30 minutes",
    "tags": ["tag1", "tag2"]
}

Return ONLY the JSON:`
        }
    ];
}
// ============================================================================
// MULTI-STEP REASONING PROMPT
// ============================================================================
/**
 * Build self-reflection prompt for low confidence results
 */
function buildReflectionPrompt(logText, initialAnalysis) {
    return [
        {
            role: "system",
            content: `You are a senior DevOps engineer performing a second-pass analysis.
Your task is to verify and improve upon an initial analysis.
Be critical and thorough. Challenge assumptions.
Output ONLY valid JSON.`
        },
        {
            role: "user",
            content: `Initial analysis of a log:
${initialAnalysis}

Original log:
\`\`\`
${logText}
\`\`\`

Perform a deeper analysis. Consider:
1. Are there multiple errors or just one?
2. Is the root cause correctly identified?
3. Are there hidden dependencies or environment issues?
4. Is the fix complete and safe?

Return improved JSON analysis:
{
    "error_type": "",
    "error_category": "",
    "root_cause": "",
    "confidence": 0,
    "suggested_fix": "",
    "step_by_step_fix": [],
    "is_environment_issue": false,
    "is_dependency_issue": false,
    "is_code_issue": false,
    "is_configuration_issue": false,
    "affected_files": [],
    "severity": "medium",
    "related_errors": [],
    "analysis_improvements": ["What was improved from initial analysis"]
}`
        }
    ];
}
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
/**
 * Build a generic chat prompt
 */
function buildChatPrompt(systemPrompt, userMessage, context) {
    const messages = [
        {
            role: "system",
            content: systemPrompt
        }
    ];
    if (context) {
        messages.push({
            role: "user",
            content: `Context:\n${context}\n\nQuestion:\n${userMessage}`
        });
    }
    else {
        messages.push({
            role: "user",
            content: userMessage
        });
    }
    return messages;
}
/**
 * Build conversation history prompt
 */
function buildConversationPrompt(systemPrompt, history, newMessage) {
    return [
        {
            role: "system",
            content: systemPrompt
        },
        ...history,
        {
            role: "user",
            content: newMessage
        }
    ];
}
exports.default = {
    SYSTEM_PROMPT: exports.SYSTEM_PROMPT,
    LOG_ANALYSIS_SYSTEM_PROMPT: exports.LOG_ANALYSIS_SYSTEM_PROMPT,
    CODE_FIX_SYSTEM_PROMPT: exports.CODE_FIX_SYSTEM_PROMPT,
    buildLogPrompt,
    buildEnhancedLogPrompt,
    buildCodeFixPrompt,
    buildClassificationPrompt,
    buildReflectionPrompt,
    buildChatPrompt,
    buildConversationPrompt
};
//# sourceMappingURL=prompts.js.map