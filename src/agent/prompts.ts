/**
 * Production-Grade Prompts for DevOps Log Analysis
 * Structured for deterministic outputs and JSON responses
 */

import { ChatMessage } from "../ai/openrouterClient";

// ============================================================================
// SYSTEM PROMPTS - Core Identity
// ============================================================================

export const SYSTEM_PROMPT = `You are a senior DevOps SRE and build system expert with 15+ years of experience.

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

export const LOG_ANALYSIS_SYSTEM_PROMPT = `You are an expert DevOps log analyst specializing in:
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

export const CODE_FIX_SYSTEM_PROMPT = `You are an expert software engineer specializing in bug fixes and code repair.

Your responsibilities:
- Analyze code errors and their context
- Generate minimal, targeted fixes
- Ensure fixes don't break existing functionality
- Follow best practices and coding standards

Output MUST be valid JSON with the fix details.
No markdown, no explanations outside JSON.`;

// ============================================================================
// LOG ANALYSIS PROMPTS
// ============================================================================

export interface LogAnalysisResult {
    error_type: string;
    error_category: "build" | "runtime" | "infrastructure" | "dependency" | "configuration" | "code" | "unknown";
    root_cause: string;
    confidence: number;
    suggested_fix: string;
    step_by_step_fix: string[];
    is_environment_issue: boolean;
    is_dependency_issue: boolean;
    is_code_issue: boolean;
    is_configuration_issue: boolean;
    affected_files: string[];
    severity: "critical" | "high" | "medium" | "low";
    related_errors: string[];
}

/**
 * Build log analysis prompt
 */
export function buildLogPrompt(logText: string): ChatMessage[] {
    return [
        {
            role: "system",
            content: LOG_ANALYSIS_SYSTEM_PROMPT
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
export function buildEnhancedLogPrompt(logText: string): ChatMessage[] {
    return [
        {
            role: "system",
            content: LOG_ANALYSIS_SYSTEM_PROMPT
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

// ============================================================================
// CODE FIX PROMPTS
// ============================================================================

export interface CodeFixResult {
    fix_description: string;
    fixed_code: string;
    explanation: string;
    changes_made: string[];
    potential_side_effects: string[];
    test_suggestions: string[];
}

/**
 * Build code fix prompt
 */
export function buildCodeFixPrompt(
    code: string,
    errorMessage: string,
    language: string = "python"
): ChatMessage[] {
    return [
        {
            role: "system",
            content: CODE_FIX_SYSTEM_PROMPT
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

// ============================================================================
// CLASSIFICATION PROMPTS
// ============================================================================

export interface ClassificationResult {
    category: string;
    subcategory: string;
    priority: "p0" | "p1" | "p2" | "p3";
    is_flaky: boolean;
    is_reproducible: boolean;
    estimated_fix_time: string;
    tags: string[];
}

/**
 * Build classification prompt
 */
export function buildClassificationPrompt(errorContext: string): ChatMessage[] {
    return [
        {
            role: "system",
            content: SYSTEM_PROMPT
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
export function buildReflectionPrompt(
    logText: string,
    initialAnalysis: string
): ChatMessage[] {
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
export function buildChatPrompt(
    systemPrompt: string,
    userMessage: string,
    context?: string
): ChatMessage[] {
    const messages: ChatMessage[] = [
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
    } else {
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
export function buildConversationPrompt(
    systemPrompt: string,
    history: ChatMessage[],
    newMessage: string
): ChatMessage[] {
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

export default {
    SYSTEM_PROMPT,
    LOG_ANALYSIS_SYSTEM_PROMPT,
    CODE_FIX_SYSTEM_PROMPT,
    buildLogPrompt,
    buildEnhancedLogPrompt,
    buildCodeFixPrompt,
    buildClassificationPrompt,
    buildReflectionPrompt,
    buildChatPrompt,
    buildConversationPrompt
};