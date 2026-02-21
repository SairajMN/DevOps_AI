/**
 * Production-Grade Prompts for DevOps Log Analysis
 * Structured for deterministic outputs and JSON responses
 */
import { ChatMessage } from "../ai/openrouterClient";
export declare const SYSTEM_PROMPT = "You are a senior DevOps SRE and build system expert with 15+ years of experience.\n\nYour responsibilities:\n- Identify root cause of build/runtime errors\n- Classify error type accurately\n- Provide minimal reproducible fix\n- Avoid hallucinations\n- If uncertain, state assumptions clearly\n\nOutput MUST be valid JSON.\nNo markdown code blocks.\nNo explanations outside JSON.\nAlways respond with properly formatted JSON only.";
export declare const LOG_ANALYSIS_SYSTEM_PROMPT = "You are an expert DevOps log analyst specializing in:\n- CI/CD pipeline failures\n- Build system errors\n- Runtime exceptions\n- Infrastructure issues\n- Dependency conflicts\n- Environment configuration problems\n\nYour analysis must be:\n1. Precise - identify the exact error\n2. Actionable - provide clear fix steps\n3. Structured - always return valid JSON\n4. Honest - acknowledge uncertainty when present\n\nCRITICAL: Your response must be ONLY valid JSON, no other text.";
export declare const CODE_FIX_SYSTEM_PROMPT = "You are an expert software engineer specializing in bug fixes and code repair.\n\nYour responsibilities:\n- Analyze code errors and their context\n- Generate minimal, targeted fixes\n- Ensure fixes don't break existing functionality\n- Follow best practices and coding standards\n\nOutput MUST be valid JSON with the fix details.\nNo markdown, no explanations outside JSON.";
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
export declare function buildLogPrompt(logText: string): ChatMessage[];
/**
 * Build enhanced log analysis prompt with reasoning scaffold
 */
export declare function buildEnhancedLogPrompt(logText: string): ChatMessage[];
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
export declare function buildCodeFixPrompt(code: string, errorMessage: string, language?: string): ChatMessage[];
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
export declare function buildClassificationPrompt(errorContext: string): ChatMessage[];
/**
 * Build self-reflection prompt for low confidence results
 */
export declare function buildReflectionPrompt(logText: string, initialAnalysis: string): ChatMessage[];
/**
 * Build a generic chat prompt
 */
export declare function buildChatPrompt(systemPrompt: string, userMessage: string, context?: string): ChatMessage[];
/**
 * Build conversation history prompt
 */
export declare function buildConversationPrompt(systemPrompt: string, history: ChatMessage[], newMessage: string): ChatMessage[];
declare const _default: {
    SYSTEM_PROMPT: string;
    LOG_ANALYSIS_SYSTEM_PROMPT: string;
    CODE_FIX_SYSTEM_PROMPT: string;
    buildLogPrompt: typeof buildLogPrompt;
    buildEnhancedLogPrompt: typeof buildEnhancedLogPrompt;
    buildCodeFixPrompt: typeof buildCodeFixPrompt;
    buildClassificationPrompt: typeof buildClassificationPrompt;
    buildReflectionPrompt: typeof buildReflectionPrompt;
    buildChatPrompt: typeof buildChatPrompt;
    buildConversationPrompt: typeof buildConversationPrompt;
};
export default _default;
//# sourceMappingURL=prompts.d.ts.map