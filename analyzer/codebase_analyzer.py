#!/usr/bin/env python3
"""
Codebase analyzer for understanding project structure and context.
Provides intelligent analysis of source code to understand error context.
"""

import asyncio
import logging
import os
import re
import ast
import json
from pathlib import Path
from typing import Dict, List, Any, Optional, Set, Tuple
from dataclasses import dataclass
from collections import defaultdict
import traceback

from config import Config

logger = logging.getLogger(__name__)


@dataclass
class CodeContext:
    """Represents code context for an error."""
    file_path: str
    line_number: int
    function_name: Optional[str]
    class_name: Optional[str]
    code_snippet: str
    imports: List[str]
    dependencies: List[str]
    error_patterns: List[str]


@dataclass
class AnalysisResult:
    """Result of codebase analysis."""
    error_context: List[CodeContext]
    dependency_graph: Dict[str, List[str]]
    common_patterns: Dict[str, int]
    risk_assessment: Dict[str, str]
    suggested_fixes: List[str]


class CodebaseAnalyzer:
    """Analyzes codebase to understand error context and dependencies."""
    
    def __init__(self, config: Config):
        self.config = config
        
        # Analysis cache
        self._analysis_cache = {}
        self._cache_size = 100
        
        # File parsers for different languages
        self.parsers = {
            '.py': PythonParser(),
            '.js': JavaScriptParser(),
            '.java': JavaParser(),
            '.go': GoParser(),
            '.rust': RustParser()
        }
    
    async def analyze(self, classification: Dict[str, Any]) -> AnalysisResult:
        """Analyze codebase context for an error classification."""
        try:
            # Check cache first
            cache_key = self._generate_cache_key(classification)
            if cache_key in self._analysis_cache:
                return self._analysis_cache[cache_key]
            
            # Perform analysis
            analysis_result = await self._analyze_error_context(classification)
            
            # Add to cache
            self._add_to_cache(cache_key, analysis_result)
            
            return analysis_result
            
        except Exception as e:
            logger.error(f"Error analyzing codebase: {e}")
            logger.debug(f"Traceback: {traceback.format_exc()}")
            
            # Return fallback analysis
            return AnalysisResult(
                error_context=[],
                dependency_graph={},
                common_patterns={},
                risk_assessment={},
                suggested_fixes=['Manual code review required']
            )
    
    def _generate_cache_key(self, classification: Dict[str, Any]) -> str:
        """Generate cache key for classification."""
        key_parts = [
            classification.get('error_type', ''),
            classification.get('severity', ''),
            str(classification.get('components', []))
        ]
        return hash('|'.join(key_parts))
    
    async def _analyze_error_context(self, classification: Dict[str, Any]) -> AnalysisResult:
        """Perform detailed codebase analysis."""
        error_type = classification.get('error_type', '')
        components = classification.get('components', [])
        message = classification.get('message', '')
        
        # Find relevant files
        relevant_files = await self._find_relevant_files(error_type, components, message)
        
        # Analyze code context
        error_context = []
        for file_path in relevant_files:
            contexts = await self._analyze_file_context(file_path, message, error_type)
            error_context.extend(contexts)
        
        # Build dependency graph
        dependency_graph = await self._build_dependency_graph(relevant_files)
        
        # Find common patterns
        common_patterns = await self._find_common_patterns(error_context)
        
        # Assess risk
        risk_assessment = await self._assess_risk(error_context, error_type)
        
        # Generate suggested fixes
        suggested_fixes = await self._generate_suggested_fixes(error_type, components, error_context)
        
        return AnalysisResult(
            error_context=error_context,
            dependency_graph=dependency_graph,
            common_patterns=common_patterns,
            risk_assessment=risk_assessment,
            suggested_fixes=suggested_fixes
        )
    
    async def _find_relevant_files(self, error_type: str, components: List[str], message: str) -> List[str]:
        """Find files relevant to the error."""
        relevant_files = []
        
        for source_dir in self.config.analyzer.source_dirs:
            if not os.path.exists(source_dir):
                continue
            
            for root, dirs, files in os.walk(source_dir):
                # Skip hidden directories
                dirs[:] = [d for d in dirs if not d.startswith('.')]
                
                for file in files:
                    file_path = os.path.join(root, file)
                    
                    # Check file extension
                    if not any(file.endswith(ext) for ext in self.config.analyzer.file_extensions):
                        continue
                    
                    # Check if file is relevant to the error
                    if await self._is_file_relevant(file_path, error_type, components, message):
                        relevant_files.append(file_path)
        
        return relevant_files[:50]  # Limit to top 50 files
    
    async def _is_file_relevant(self, file_path: str, error_type: str, components: List[str], message: str) -> bool:
        """Check if a file is relevant to the error."""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Check for error type keywords
            error_keywords = self._get_error_keywords(error_type)
            for keyword in error_keywords:
                if keyword.lower() in content.lower():
                    return True
            
            # Check for component keywords
            for component in components:
                if component.lower() in content.lower():
                    return True
            
            # Check for message keywords
            message_keywords = message.split()[:5]  # First 5 words
            for keyword in message_keywords:
                if len(keyword) > 3 and keyword.lower() in content.lower():
                    return True
            
            return False
            
        except Exception as e:
            logger.warning(f"Error checking file relevance {file_path}: {e}")
            return False
    
    def _get_error_keywords(self, error_type: str) -> List[str]:
        """Get keywords associated with error type."""
        keyword_map = {
            'database_errors': ['database', 'db', 'sql', 'query', 'connection', 'transaction'],
            'network_errors': ['network', 'connection', 'socket', 'http', 'api', 'request'],
            'application_errors': ['exception', 'error', 'crash', 'bug', 'fail'],
            'authentication_errors': ['auth', 'login', 'password', 'token', 'session', 'credential'],
            'system_errors': ['system', 'memory', 'cpu', 'disk', 'resource', 'performance']
        }
        
        return keyword_map.get(error_type, [])
    
    async def _analyze_file_context(self, file_path: str, message: str, error_type: str) -> List[CodeContext]:
        """Analyze context within a specific file."""
        contexts = []
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
            
            # Get file extension
            file_ext = Path(file_path).suffix
            
            # Parse file if we have a parser for it
            if file_ext in self.parsers:
                parser = self.parsers[file_ext]
                try:
                    parsed_contexts = parser.parse_file(file_path, lines, message, error_type)
                    contexts.extend(parsed_contexts)
                except Exception as e:
                    logger.warning(f"Parser failed for {file_path}: {e}")
            
            # Fallback: simple text analysis
            if not contexts:
                contexts.extend(self._simple_text_analysis(file_path, lines, message, error_type))
            
        except Exception as e:
            logger.warning(f"Error analyzing file {file_path}: {e}")
        
        return contexts
    
    def _simple_text_analysis(self, file_path: str, lines: List[str], message: str, error_type: str) -> List[CodeContext]:
        """Simple text-based analysis as fallback."""
        contexts = []
        
        # Look for lines containing error-related keywords
        error_keywords = self._get_error_keywords(error_type)
        message_keywords = message.split()[:3]  # First 3 words
        
        for i, line in enumerate(lines):
            line_lower = line.lower()
            
            # Check for error keywords
            error_matches = [kw for kw in error_keywords if kw.lower() in line_lower]
            
            # Check for message keywords
            message_matches = [kw for kw in message_keywords if kw.lower() in line_lower]
            
            if error_matches or message_matches:
                # Get surrounding context
                start = max(0, i - 3)
                end = min(len(lines), i + 4)
                snippet = ''.join(lines[start:end]).strip()
                
                context = CodeContext(
                    file_path=file_path,
                    line_number=i + 1,
                    function_name=None,  # Not available in simple analysis
                    class_name=None,
                    code_snippet=snippet,
                    imports=[],
                    dependencies=[],
                    error_patterns=error_matches + message_matches
                )
                
                contexts.append(context)
        
        return contexts
    
    async def _build_dependency_graph(self, file_paths: List[str]) -> Dict[str, List[str]]:
        """Build dependency graph between files."""
        dependency_graph = {}
        
        for file_path in file_paths:
            try:
                dependencies = await self._extract_dependencies(file_path)
                dependency_graph[file_path] = dependencies
            except Exception as e:
                logger.warning(f"Error extracting dependencies from {file_path}: {e}")
                dependency_graph[file_path] = []
        
        return dependency_graph
    
    async def _extract_dependencies(self, file_path: str) -> List[str]:
        """Extract dependencies from a file."""
        dependencies = []
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            file_ext = Path(file_path).suffix
            
            if file_ext == '.py':
                dependencies = self._extract_python_dependencies(content)
            elif file_ext == '.js':
                dependencies = self._extract_javascript_dependencies(content)
            elif file_ext == '.java':
                dependencies = self._extract_java_dependencies(content)
            elif file_ext == '.go':
                dependencies = self._extract_go_dependencies(content)
            elif file_ext == '.rust':
                dependencies = self._extract_rust_dependencies(content)
            
        except Exception as e:
            logger.warning(f"Error extracting dependencies from {file_path}: {e}")
        
        return dependencies
    
    def _extract_python_dependencies(self, content: str) -> List[str]:
        """Extract Python dependencies."""
        dependencies = []
        
        # Import statements
        import_pattern = r'^(?:from\s+(\S+)\s+)?import\s+(.+)$'
        for line in content.split('\n'):
            line = line.strip()
            if line.startswith('import ') or line.startswith('from '):
                match = re.match(import_pattern, line)
                if match:
                    module = match.group(1) or match.group(2).split('.')[0]
                    dependencies.append(module)
        
        return dependencies
    
    def _extract_javascript_dependencies(self, content: str) -> List[str]:
        """Extract JavaScript dependencies."""
        dependencies = []
        
        # Import/require statements
        patterns = [
            r'import\s+.*\s+from\s+[\'"]([^\'"]+)[\'"]',
            r'require\s*\(\s*[\'"]([^\'"]+)[\'"]\s*\)'
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, content, re.MULTILINE)
            dependencies.extend(matches)
        
        return dependencies
    
    def _extract_java_dependencies(self, content: str) -> List[str]:
        """Extract Java dependencies."""
        dependencies = []
        
        # Import statements
        import_pattern = r'import\s+([^;]+);'
        matches = re.findall(import_pattern, content)
        
        for match in matches:
            # Extract package/class
            parts = match.split('.')
            if len(parts) > 1:
                dependencies.append('.'.join(parts[:-1]))
        
        return dependencies
    
    def _extract_go_dependencies(self, content: str) -> List[str]:
        """Extract Go dependencies."""
        dependencies = []
        
        # Import statements
        import_pattern = r'import\s+\((.*?)\)'
        matches = re.findall(import_pattern, content, re.DOTALL)
        
        for match in matches:
            for line in match.split('\n'):
                line = line.strip()
                if line and not line.startswith('//') and not line.startswith('"') and not line.startswith(')'):
                    dependencies.append(line)
        
        return dependencies
    
    def _extract_rust_dependencies(self, content: str) -> List[str]:
        """Extract Rust dependencies."""
        dependencies = []
        
        # Use statements
        use_pattern = r'use\s+([^;]+);'
        matches = re.findall(use_pattern, content)
        
        for match in matches:
            # Extract module path
            parts = match.split('::')
            if len(parts) > 1:
                dependencies.append('::'.join(parts[:-1]))
        
        return dependencies
    
    async def _find_common_patterns(self, error_contexts: List[CodeContext]) -> Dict[str, int]:
        """Find common patterns in error contexts."""
        patterns = defaultdict(int)
        
        for context in error_contexts:
            for pattern in context.error_patterns:
                patterns[pattern] += 1
            
            # Analyze code snippet for patterns
            snippet_lower = context.code_snippet.lower()
            
            # Common error patterns
            error_patterns = [
                r'null.*pointer',
                r'index.*out.*of.*range',
                r'division.*by.*zero',
                r'timeout',
                r'connection.*refused',
                r'permission.*denied'
            ]
            
            for pattern in error_patterns:
                if re.search(pattern, snippet_lower):
                    patterns[pattern] += 1
        
        return dict(patterns)
    
    async def _assess_risk(self, error_contexts: List[CodeContext], error_type: str) -> Dict[str, str]:
        """Assess risk based on error context."""
        risk_assessment = {}
        
        # Count occurrences by file
        file_risks = defaultdict(int)
        for context in error_contexts:
            file_risks[context.file_path] += 1
        
        # Assess risk level for each file
        for file_path, count in file_risks.items():
            if count > 5:
                risk_level = 'HIGH'
            elif count > 2:
                risk_level = 'MEDIUM'
            else:
                risk_level = 'LOW'
            
            risk_assessment[file_path] = risk_level
        
        # Overall risk assessment
        if len(error_contexts) > 10:
            risk_assessment['overall'] = 'HIGH'
        elif len(error_contexts) > 5:
            risk_assessment['overall'] = 'MEDIUM'
        else:
            risk_assessment['overall'] = 'LOW'
        
        return risk_assessment
    
    async def _generate_suggested_fixes(self, error_type: str, components: List[str], error_contexts: List[CodeContext]) -> List[str]:
        """Generate suggested fixes based on error analysis."""
        fixes = []
        
        # Type-specific fixes
        type_fixes = {
            'database_errors': [
                'Check database connection configuration',
                'Verify database permissions',
                'Review query performance and indexing',
                'Implement connection pooling',
                'Add proper error handling for database operations'
            ],
            'network_errors': [
                'Check network connectivity',
                'Verify service availability',
                'Review timeout configurations',
                'Implement retry mechanisms',
                'Add circuit breaker patterns'
            ],
            'application_errors': [
                'Add null checks before object access',
                'Implement proper exception handling',
                'Review memory usage patterns',
                'Add input validation',
                'Review algorithm complexity'
            ],
            'authentication_errors': [
                'Verify authentication service',
                'Check token expiration handling',
                'Review session management',
                'Implement proper credential validation',
                'Add authentication logging'
            ],
            'system_errors': [
                'Monitor system resources',
                'Review memory allocation',
                'Check disk space',
                'Optimize resource usage',
                'Implement graceful degradation'
            ]
        }
        
        if error_type in type_fixes:
            fixes.extend(type_fixes[error_type])
        
        # Component-specific fixes
        component_fixes = {
            'database': ['Review database schema', 'Check connection strings', 'Verify database health'],
            'api': ['Check API endpoints', 'Review request/response handling', 'Verify API documentation'],
            'cache': ['Check cache configuration', 'Review cache invalidation', 'Monitor cache hit rates'],
            'storage': ['Check storage permissions', 'Review file paths', 'Monitor storage usage']
        }
        
        for component in components:
            if component in component_fixes:
                fixes.extend(component_fixes[component])
        
        # Context-specific fixes
        for context in error_contexts:
            if 'null' in context.code_snippet.lower():
                fixes.append('Add null checks before accessing objects')
            if 'timeout' in context.code_snippet.lower():
                fixes.append('Review timeout configurations and implement retries')
            if 'connection' in context.code_snippet.lower():
                fixes.append('Check connection management and pooling')
        
        # Remove duplicates and return top 5
        return list(dict.fromkeys(fixes))[:5]
    
    def _add_to_cache(self, key: str, result: AnalysisResult):
        """Add analysis result to cache."""
        if len(self._analysis_cache) >= self._cache_size:
            # Remove oldest entries
            oldest_key = next(iter(self._analysis_cache))
            del self._analysis_cache[oldest_key]
        
        self._analysis_cache[key] = result
    
    async def batch_analyze(self, classifications: List[Dict[str, Any]]) -> List[AnalysisResult]:
        """Analyze multiple classifications efficiently."""
        tasks = [self.analyze(classification) for classification in classifications]
        return await asyncio.gather(*tasks)
    
    def get_analysis_stats(self) -> Dict[str, Any]:
        """Get statistics about analysis performance."""
        return {
            'cache_size': len(self._analysis_cache),
            'cache_capacity': self._cache_size,
            'supported_languages': list(self.parsers.keys()),
            'source_directories': self.config.analyzer.source_dirs
        }
    
    def clear_cache(self):
        """Clear the analysis cache."""
        self._analysis_cache.clear()
        logger.info("Cleared analysis cache")


class PythonParser:
    """Parser for Python files."""
    
    def parse_file(self, file_path: str, lines: List[str], message: str, error_type: str) -> List[CodeContext]:
        """Parse Python file for error context."""
        contexts = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            tree = ast.parse(content)
            
            # Walk the AST to find relevant nodes
            for node in ast.walk(tree):
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    context = self._analyze_function(node, file_path, lines, message, error_type)
                    if context:
                        contexts.append(context)
                elif isinstance(node, ast.ClassDef):
                    context = self._analyze_class(node, file_path, lines, message, error_type)
                    if context:
                        contexts.append(context)
        
        except SyntaxError:
            # Fallback to simple analysis if parsing fails
            pass
        except Exception as e:
            logger.warning(f"Error parsing Python file {file_path}: {e}")
        
        return contexts
    
    def _analyze_function(self, node: ast.FunctionDef, file_path: str, lines: List[str], message: str, error_type: str) -> Optional[CodeContext]:
        """Analyze a function node."""
        # Get function context
        start_line = node.lineno - 1
        end_line = getattr(node, 'end_lineno', start_line + 10)
        
        # Check if function is relevant to error
        function_text = ' '.join(lines[start_line:end_line]).lower()
        message_lower = message.lower()
        
        if any(keyword in function_text for keyword in message_lower.split()[:3]):
            return CodeContext(
                file_path=file_path,
                line_number=node.lineno,
                function_name=node.name,
                class_name=None,
                code_snippet=''.join(lines[start_line:end_line]).strip(),
                imports=[],
                dependencies=[],
                error_patterns=[error_type]
            )
        
        return None
    
    def _analyze_class(self, node: ast.ClassDef, file_path: str, lines: List[str], message: str, error_type: str) -> Optional[CodeContext]:
        """Analyze a class node."""
        # Similar to function analysis but for classes
        start_line = node.lineno - 1
        end_line = getattr(node, 'end_lineno', start_line + 20)
        
        class_text = ' '.join(lines[start_line:end_line]).lower()
        message_lower = message.lower()
        
        if any(keyword in class_text for keyword in message_lower.split()[:3]):
            return CodeContext(
                file_path=file_path,
                line_number=node.lineno,
                function_name=None,
                class_name=node.name,
                code_snippet=''.join(lines[start_line:end_line]).strip(),
                imports=[],
                dependencies=[],
                error_patterns=[error_type]
            )
        
        return None


class JavaScriptParser:
    """Parser for JavaScript files."""
    
    def parse_file(self, file_path: str, lines: List[str], message: str, error_type: str) -> List[CodeContext]:
        """Parse JavaScript file for error context."""
        # For JavaScript, we'll use regex-based parsing
        contexts = []
        
        content = ''.join(lines)
        
        # Function patterns
        function_patterns = [
            r'function\s+(\w+)',
            r'(\w+)\s*:\s*function',
            r'const\s+(\w+)\s*='
        ]
        
        for pattern in function_patterns:
            matches = re.finditer(pattern, content, re.MULTILINE)
            for match in matches:
                line_num = content[:match.start()].count('\n') + 1
                function_name = match.group(1)
                
                # Get surrounding context
                start = max(0, line_num - 3)
                end = min(len(lines), line_num + 7)
                snippet = ''.join(lines[start:end]).strip()
                
                contexts.append(CodeContext(
                    file_path=file_path,
                    line_number=line_num,
                    function_name=function_name,
                    class_name=None,
                    code_snippet=snippet,
                    imports=[],
                    dependencies=[],
                    error_patterns=[error_type]
                ))
        
        return contexts


class JavaParser:
    """Parser for Java files."""
    
    def parse_file(self, file_path: str, lines: List[str], message: str, error_type: str) -> List[CodeContext]:
        """Parse Java file for error context."""
        contexts = []
        
        content = ''.join(lines)
        
        # Method patterns
        method_patterns = [
            r'(public|private|protected)\s+\w+\s+(\w+)\s*\(',
            r'(static)\s+\w+\s+(\w+)\s*\('
        ]
        
        for pattern in method_patterns:
            matches = re.finditer(pattern, content, re.MULTILINE)
            for match in matches:
                line_num = content[:match.start()].count('\n') + 1
                method_name = match.group(2)
                
                # Get surrounding context
                start = max(0, line_num - 2)
                end = min(len(lines), line_num + 8)
                snippet = ''.join(lines[start:end]).strip()
                
                contexts.append(CodeContext(
                    file_path=file_path,
                    line_number=line_num,
                    function_name=method_name,
                    class_name=None,
                    code_snippet=snippet,
                    imports=[],
                    dependencies=[],
                    error_patterns=[error_type]
                ))
        
        return contexts


class GoParser:
    """Parser for Go files."""
    
    def parse_file(self, file_path: str, lines: List[str], message: str, error_type: str) -> List[CodeContext]:
        """Parse Go file for error context."""
        contexts = []
        
        content = ''.join(lines)
        
        # Function patterns
        func_pattern = r'func\s+(\w+)\s*\('
        matches = re.finditer(func_pattern, content, re.MULTILINE)
        
        for match in matches:
            line_num = content[:match.start()].count('\n') + 1
            func_name = match.group(1)
            
            # Get surrounding context
            start = max(0, line_num - 2)
            end = min(len(lines), line_num + 8)
            snippet = ''.join(lines[start:end]).strip()
            
            contexts.append(CodeContext(
                file_path=file_path,
                line_number=line_num,
                function_name=func_name,
                class_name=None,
                code_snippet=snippet,
                imports=[],
                dependencies=[],
                error_patterns=[error_type]
            ))
        
        return contexts


class RustParser:
    """Parser for Rust files."""
    
    def parse_file(self, file_path: str, lines: List[str], message: str, error_type: str) -> List[CodeContext]:
        """Parse Rust file for error context."""
        contexts = []
        
        content = ''.join(lines)
        
        # Function patterns
        func_pattern = r'fn\s+(\w+)\s*\('
        matches = re.finditer(func_pattern, content, re.MULTILINE)
        
        for match in matches:
            line_num = content[:match.start()].count('\n') + 1
            func_name = match.group(1)
            
            # Get surrounding context
            start = max(0, line_num - 2)
            end = min(len(lines), line_num + 8)
            snippet = ''.join(lines[start:end]).strip()
            
            contexts.append(CodeContext(
                file_path=file_path,
                line_number=line_num,
                function_name=func_name,
                class_name=None,
                code_snippet=snippet,
                imports=[],
                dependencies=[],
                error_patterns=[error_type]
            ))
        
        return contexts