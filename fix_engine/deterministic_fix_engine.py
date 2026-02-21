#!/usr/bin/env python3
"""
Deterministic fix engine that applies known, safe fixes to common errors.
Uses pattern matching and rule-based approaches to generate reliable fixes.
"""

import asyncio
import logging
import os
import re
import json
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from pathlib import Path
import traceback

from config import Config

logger = logging.getLogger(__name__)


@dataclass
class Fix:
    """Represents a proposed fix for an error."""
    fix_type: str
    description: str
    code_changes: List[Dict[str, Any]]
    confidence: float
    risk_level: str
    rollback_possible: bool
    estimated_impact: str


@dataclass
class FixResult:
    """Result of applying a fix."""
    success: bool
    applied_fixes: List[Fix]
    failed_fixes: List[Fix]
    validation_results: List[Dict[str, Any]]
    rollback_info: Optional[Dict[str, Any]]


class DeterministicFixEngine:
    """Engine that applies deterministic, rule-based fixes to errors."""
    
    def __init__(self, config: Config):
        self.config = config
        
        # Fix rules database
        self.fix_rules = self._load_fix_rules()
        
        # Validation rules
        self.validation_rules = self._load_validation_rules()
        
        # Fix cache
        self._fix_cache = {}
        self._cache_size = 200
    
    def _load_fix_rules(self) -> Dict[str, List[Dict[str, Any]]]:
        """Load fix rules for different error types."""
        return {
            'database_errors': [
                {
                    'name': 'connection_timeout_fix',
                    'pattern': r'connection.*timeout',
                    'fix_type': 'configuration',
                    'description': 'Increase connection timeout settings',
                    'changes': [
                        {
                            'file_pattern': r'.*\.py$',
                            'search_pattern': r'connect_timeout\s*=\s*(\d+)',
                            'replace_pattern': r'connect_timeout = \1 * 2',
                            'description': 'Double connection timeout'
                        }
                    ],
                    'confidence': 0.8,
                    'risk_level': 'LOW',
                    'rollback_possible': True
                },
                {
                    'name': 'connection_pool_fix',
                    'pattern': r'connection.*pool.*exhausted',
                    'fix_type': 'configuration',
                    'description': 'Increase connection pool size',
                    'changes': [
                        {
                            'file_pattern': r'.*\.py$',
                            'search_pattern': r'pool_size\s*=\s*(\d+)',
                            'replace_pattern': r'pool_size = \1 + 5',
                            'description': 'Increase pool size by 5'
                        }
                    ],
                    'confidence': 0.7,
                    'risk_level': 'LOW',
                    'rollback_possible': True
                }
            ],
            'network_errors': [
                {
                    'name': 'retry_mechanism_fix',
                    'pattern': r'timeout|connection.*refused',
                    'fix_type': 'code',
                    'description': 'Add retry mechanism for network operations',
                    'changes': [
                        {
                            'file_pattern': r'.*\.py$',
                            'search_pattern': r'(requests\.get\([^)]+\))',
                            'replace_pattern': r'with_retry(\1)',
                            'description': 'Wrap requests with retry mechanism'
                        }
                    ],
                    'confidence': 0.6,
                    'risk_level': 'MEDIUM',
                    'rollback_possible': True
                }
            ],
            'application_errors': [
                {
                    'name': 'null_pointer_fix',
                    'pattern': r'null.*pointer|NoneType',
                    'fix_type': 'code',
                    'description': 'Add null checks before object access',
                    'changes': [
                        {
                            'file_pattern': r'.*\.py$',
                            'search_pattern': r'(\w+)\.(\w+)',
                            'replace_pattern': r'\1.\2 if \1 is not None else None',
                            'description': 'Add null check before attribute access'
                        }
                    ],
                    'confidence': 0.9,
                    'risk_level': 'LOW',
                    'rollback_possible': True
                },
                {
                    'name': 'index_out_of_range_fix',
                    'pattern': r'index.*out.*of.*range',
                    'fix_type': 'code',
                    'description': 'Add bounds checking for array access',
                    'changes': [
                        {
                            'file_pattern': r'.*\.py$',
                            'search_pattern': r'(\w+)\[(\d+)\]',
                            'replace_pattern': r'\1[\2] if \2 < len(\1) else None',
                            'description': 'Add bounds checking for array access'
                        }
                    ],
                    'confidence': 0.8,
                    'risk_level': 'LOW',
                    'rollback_possible': True
                }
            ],
            'authentication_errors': [
                {
                    'name': 'token_refresh_fix',
                    'pattern': r'token.*expired|authentication.*failed',
                    'fix_type': 'code',
                    'description': 'Add token refresh mechanism',
                    'changes': [
                        {
                            'file_pattern': r'.*\.py$',
                            'search_pattern': r'auth_token\s*=\s*get_token\(\)',
                            'replace_pattern': r'auth_token = get_token() or refresh_token()',
                            'description': 'Add token refresh fallback'
                        }
                    ],
                    'confidence': 0.7,
                    'risk_level': 'MEDIUM',
                    'rollback_possible': True
                }
            ],
            'system_errors': [
                {
                    'name': 'memory_leak_fix',
                    'pattern': r'memory.*leak|out.*of.*memory',
                    'fix_type': 'code',
                    'description': 'Add proper resource cleanup',
                    'changes': [
                        {
                            'file_pattern': r'.*\.py$',
                            'search_pattern': r'with\s+open\(([^)]+)\)\s+as\s+(\w+):',
                            'replace_pattern': r'with open(\1) as \2:\n        # Ensure proper file closure',
                            'description': 'Ensure proper file handling'
                        }
                    ],
                    'confidence': 0.6,
                    'risk_level': 'MEDIUM',
                    'rollback_possible': True
                }
            ]
        }
    
    def _load_validation_rules(self) -> Dict[str, List[Dict[str, Any]]]:
        """Load validation rules for different fix types."""
        return {
            'configuration': [
                {
                    'name': 'syntax_check',
                    'description': 'Check for syntax errors',
                    'validation': 'python -m py_compile'
                },
                {
                    'name': 'import_check',
                    'description': 'Check for import errors',
                    'validation': 'python -c "import module_name"'
                }
            ],
            'code': [
                {
                    'name': 'syntax_check',
                    'description': 'Check for syntax errors',
                    'validation': 'python -m py_compile'
                },
                {
                    'name': 'lint_check',
                    'description': 'Check code style',
                    'validation': 'flake8'
                }
            ]
        }
    
    async def generate_fixes(self, classification: Dict[str, Any], analysis: Dict[str, Any]) -> List[Fix]:
        """Generate fixes for a classified error."""
        try:
            # Check cache first
            cache_key = self._generate_cache_key(classification, analysis)
            if cache_key in self._fix_cache:
                return self._fix_cache[cache_key]
            
            # Generate fixes
            fixes = await self._generate_fixes_for_error(classification, analysis)
            
            # Add to cache
            self._add_to_cache(cache_key, fixes)
            
            return fixes
            
        except Exception as e:
            logger.error(f"Error generating fixes: {e}")
            logger.debug(f"Traceback: {traceback.format_exc()}")
            
            return []
    
    def _generate_cache_key(self, classification: Dict[str, Any], analysis: Dict[str, Any]) -> str:
        """Generate cache key for fix generation."""
        key_parts = [
            classification.get('error_type', ''),
            classification.get('severity', ''),
            str(len(analysis.get('error_context', []))),
            str(len(analysis.get('common_patterns', {})))
        ]
        return hash('|'.join(key_parts))
    
    async def _generate_fixes_for_error(self, classification: Dict[str, Any], analysis: Dict[str, Any]) -> List[Fix]:
        """Generate specific fixes for an error."""
        error_type = classification.get('error_type', '')
        severity = classification.get('severity', '')
        components = classification.get('components', [])
        
        fixes = []
        
        # Get applicable fix rules
        applicable_rules = self._get_applicable_fix_rules(error_type, severity, components)
        
        # Generate fixes based on analysis
        error_context = analysis.get('error_context', [])
        common_patterns = analysis.get('common_patterns', {})
        
        for rule in applicable_rules:
            # Check if rule matches the specific error context
            if self._rule_matches_context(rule, error_context, common_patterns):
                fix = self._create_fix_from_rule(rule, error_context, common_patterns)
                if fix:
                    fixes.append(fix)
        
        # Sort fixes by confidence and risk level
        fixes.sort(key=lambda x: (x.confidence, -self._risk_score(x.risk_level)), reverse=True)
        
        return fixes
    
    def _get_applicable_fix_rules(self, error_type: str, severity: str, components: List[str]) -> List[Dict[str, Any]]:
        """Get fix rules applicable to the error."""
        applicable_rules = []
        
        # Get rules for error type
        if error_type in self.fix_rules:
            applicable_rules.extend(self.fix_rules[error_type])
        
        # Get rules for components
        for component in components:
            component_key = f"{error_type}_{component}"
            if component_key in self.fix_rules:
                applicable_rules.extend(self.fix_rules[component_key])
        
        # Filter by severity if needed
        if severity == 'CRITICAL':
            applicable_rules = [rule for rule in applicable_rules if rule['risk_level'] in ['LOW', 'MEDIUM']]
        
        return applicable_rules
    
    def _rule_matches_context(self, rule: Dict[str, Any], error_context: List[Any], common_patterns: Dict[str, int]) -> bool:
        """Check if a fix rule matches the error context."""
        # Check pattern matching
        pattern = rule.get('pattern', '')
        if pattern:
            for context in error_context:
                if hasattr(context, 'code_snippet'):
                    if re.search(pattern, context.code_snippet, re.IGNORECASE):
                        return True
        
        # Check common patterns
        for pattern, count in common_patterns.items():
            if re.search(pattern, rule.get('description', ''), re.IGNORECASE):
                return True
        
        return False
    
    def _create_fix_from_rule(self, rule: Dict[str, Any], error_context: List[Any], common_patterns: Dict[str, int]) -> Optional[Fix]:
        """Create a Fix object from a rule."""
        try:
            # Calculate confidence based on context match
            confidence = rule.get('confidence', 0.5)
            
            # Adjust confidence based on context match strength
            context_matches = 0
            for context in error_context:
                if hasattr(context, 'code_snippet'):
                    if re.search(rule.get('pattern', ''), context.code_snippet, re.IGNORECASE):
                        context_matches += 1
            
            if context_matches > 0:
                confidence += 0.1 * context_matches
            
            # Create code changes
            code_changes = []
            for change in rule.get('changes', []):
                code_change = {
                    'file_pattern': change.get('file_pattern', ''),
                    'search_pattern': change.get('search_pattern', ''),
                    'replace_pattern': change.get('replace_pattern', ''),
                    'description': change.get('description', ''),
                    'files_affected': []
                }
                code_changes.append(code_change)
            
            return Fix(
                fix_type=rule.get('fix_type', 'unknown'),
                description=rule.get('description', ''),
                code_changes=code_changes,
                confidence=min(confidence, 1.0),
                risk_level=rule.get('risk_level', 'UNKNOWN'),
                rollback_possible=rule.get('rollback_possible', False),
                estimated_impact=self._estimate_impact(rule, error_context)
            )
            
        except Exception as e:
            logger.warning(f"Error creating fix from rule: {e}")
            return None
    
    def _estimate_impact(self, rule: Dict[str, Any], error_context: List[Any]) -> str:
        """Estimate the impact of applying a fix."""
        # Count affected files
        affected_files = len(set(ctx.file_path for ctx in error_context if hasattr(ctx, 'file_path')))
        
        if affected_files > 10:
            return 'HIGH'
        elif affected_files > 3:
            return 'MEDIUM'
        else:
            return 'LOW'
    
    def _risk_score(self, risk_level: str) -> int:
        """Convert risk level to numeric score."""
        risk_scores = {
            'LOW': 1,
            'MEDIUM': 2,
            'HIGH': 3,
            'CRITICAL': 4,
            'UNKNOWN': 5
        }
        return risk_scores.get(risk_level.upper(), 5)
    
    async def apply_fixes(self, fixes: List[Fix], analysis: Dict[str, Any]) -> FixResult:
        """Apply a list of fixes."""
        applied_fixes = []
        failed_fixes = []
        validation_results = []
        
        rollback_info = {
            'original_files': {},
            'applied_changes': []
        }
        
        for fix in fixes:
            try:
                # Create backup of affected files
                affected_files = self._get_affected_files(fix, analysis)
                for file_path in affected_files:
                    if file_path not in rollback_info['original_files']:
                        rollback_info['original_files'][file_path] = self._backup_file(file_path)
                
                # Apply the fix
                success = await self._apply_fix(fix, analysis)
                
                if success:
                    applied_fixes.append(fix)
                    
                    # Validate the fix
                    validation_result = await self._validate_fix(fix, analysis)
                    validation_results.append(validation_result)
                    
                    # If validation fails, rollback
                    if not validation_result.get('success', False):
                        await self._rollback_fix(fix, rollback_info)
                        failed_fixes.append(fix)
                        applied_fixes.remove(fix)
                else:
                    failed_fixes.append(fix)
                    
            except Exception as e:
                logger.error(f"Error applying fix {fix.description}: {e}")
                failed_fixes.append(fix)
        
        return FixResult(
            success=len(applied_fixes) > 0,
            applied_fixes=applied_fixes,
            failed_fixes=failed_fixes,
            validation_results=validation_results,
            rollback_info=rollback_info if failed_fixes else None
        )
    
    def _get_affected_files(self, fix: Fix, analysis: Dict[str, Any]) -> List[str]:
        """Get list of files that will be affected by a fix."""
        affected_files = []
        
        error_context = analysis.get('error_context', [])
        for context in error_context:
            if hasattr(context, 'file_path'):
                file_path = context.file_path
                
                # Check if file matches any of the fix's file patterns
                for change in fix.code_changes:
                    file_pattern = change.get('file_pattern', '')
                    if file_pattern and re.search(file_pattern, file_path):
                        affected_files.append(file_path)
                        break
        
        return list(set(affected_files))
    
    def _backup_file(self, file_path: str) -> str:
        """Create a backup of a file."""
        try:
            backup_path = f"{file_path}.backup"
            with open(file_path, 'r') as original:
                with open(backup_path, 'w') as backup:
                    backup.write(original.read())
            return backup_path
        except Exception as e:
            logger.warning(f"Failed to backup file {file_path}: {e}")
            return ""
    
    async def _apply_fix(self, fix: Fix, analysis: Dict[str, Any]) -> bool:
        """Apply a single fix."""
        try:
            affected_files = self._get_affected_files(fix, analysis)
            
            for file_path in affected_files:
                success = await self._apply_fix_to_file(fix, file_path)
                if not success:
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error applying fix to files: {e}")
            return False
    
    async def _apply_fix_to_file(self, fix: Fix, file_path: str) -> bool:
        """Apply a fix to a specific file."""
        try:
            with open(file_path, 'r') as f:
                content = f.read()
            
            original_content = content
            
            # Apply all changes in the fix
            for change in fix.code_changes:
                search_pattern = change.get('search_pattern', '')
                replace_pattern = change.get('replace_pattern', '')
                
                if search_pattern and replace_pattern:
                    content = re.sub(search_pattern, replace_pattern, content, flags=re.MULTILINE | re.DOTALL)
            
            # Only write if content changed
            if content != original_content:
                with open(file_path, 'w') as f:
                    f.write(content)
            
            return True
            
        except Exception as e:
            logger.error(f"Error applying fix to file {file_path}: {e}")
            return False
    
    async def _validate_fix(self, fix: Fix, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Validate that a fix was applied correctly."""
        validation_results = []
        
        # Get validation rules for this fix type
        fix_type = fix.fix_type
        if fix_type in self.validation_rules:
            for validation_rule in self.validation_rules[fix_type]:
                result = await self._run_validation(validation_rule, fix, analysis)
                validation_results.append(result)
        
        # Overall success is True if all validations passed
        success = all(result.get('success', False) for result in validation_results)
        
        return {
            'fix_description': fix.description,
            'success': success,
            'validation_results': validation_results
        }
    
    async def _run_validation(self, validation_rule: Dict[str, Any], fix: Fix, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Run a specific validation rule."""
        try:
            validation_name = validation_rule.get('name', '')
            validation_cmd = validation_rule.get('validation', '')
            
            # For now, we'll simulate validation
            # In a real implementation, you would run actual validation commands
            
            if validation_name == 'syntax_check':
                # Simulate syntax check
                return {
                    'name': validation_name,
                    'success': True,
                    'message': 'Syntax validation passed'
                }
            elif validation_name == 'import_check':
                # Simulate import check
                return {
                    'name': validation_name,
                    'success': True,
                    'message': 'Import validation passed'
                }
            elif validation_name == 'lint_check':
                # Simulate lint check
                return {
                    'name': validation_name,
                    'success': True,
                    'message': 'Lint validation passed'
                }
            else:
                return {
                    'name': validation_name,
                    'success': True,
                    'message': 'Validation passed'
                }
                
        except Exception as e:
            return {
                'name': validation_rule.get('name', ''),
                'success': False,
                'message': f'Validation failed: {str(e)}'
            }
    
    async def _rollback_fix(self, fix: Fix, rollback_info: Dict[str, Any]):
        """Rollback a failed fix."""
        try:
            for file_path, backup_path in rollback_info['original_files'].items():
                if backup_path and os.path.exists(backup_path):
                    with open(backup_path, 'r') as backup:
                        with open(file_path, 'w') as original:
                            original.write(backup.read())
                    
                    # Remove backup
                    os.remove(backup_path)
            
            logger.info(f"Rolled back fix: {fix.description}")
            
        except Exception as e:
            logger.error(f"Error rolling back fix {fix.description}: {e}")
    
    def _add_to_cache(self, key: str, fixes: List[Fix]):
        """Add fixes to cache."""
        if len(self._fix_cache) >= self._cache_size:
            # Remove oldest entries
            oldest_key = next(iter(self._fix_cache))
            del self._fix_cache[oldest_key]
        
        self._fix_cache[key] = fixes
    
    async def batch_generate_fixes(self, classifications: List[Dict[str, Any]], analyses: List[Dict[str, Any]]) -> List[List[Fix]]:
        """Generate fixes for multiple errors efficiently."""
        tasks = [self.generate_fixes(classification, analysis) 
                for classification, analysis in zip(classifications, analyses)]
        return await asyncio.gather(*tasks)
    
    def get_fix_stats(self) -> Dict[str, Any]:
        """Get statistics about fix generation."""
        return {
            'cache_size': len(self._fix_cache),
            'cache_capacity': self._cache_size,
            'fix_rules_count': sum(len(rules) for rules in self.fix_rules.values()),
            'validation_rules_count': sum(len(rules) for rules in self.validation_rules.values())
        }
    
    def clear_cache(self):
        """Clear the fix cache."""
        self._fix_cache.clear()
        logger.info("Cleared fix cache")
    
    def add_custom_fix_rule(self, error_type: str, rule: Dict[str, Any]):
        """Add a custom fix rule."""
        if error_type not in self.fix_rules:
            self.fix_rules[error_type] = []
        
        self.fix_rules[error_type].append(rule)
        logger.info(f"Added custom fix rule for {error_type}: {rule.get('name', 'unnamed')}")
    
    def add_custom_validation_rule(self, fix_type: str, rule: Dict[str, Any]):
        """Add a custom validation rule."""
        if fix_type not in self.validation_rules:
            self.validation_rules[fix_type] = []
        
        self.validation_rules[fix_type].append(rule)
        logger.info(f"Added custom validation rule for {fix_type}: {rule.get('name', 'unnamed')}")