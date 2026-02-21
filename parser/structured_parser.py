#!/usr/bin/env python3
"""
Structured log parser that uses patterns and ML for advanced log parsing.
Provides intelligent parsing with context awareness and error handling.
"""

import asyncio
import logging
import re
import json
from typing import Dict, List, Any, Optional, Union, Tuple
from dataclasses import dataclass
from datetime import datetime
import traceback

from config import Config
from parser.patterns import log_patterns, error_patterns

logger = logging.getLogger(__name__)


@dataclass
class ParsedLogEntry:
    """Represents a fully parsed log entry with structured data."""
    timestamp: Optional[datetime]
    level: str
    message: str
    source: str
    raw_line: str
    
    # Structured fields
    structured_data: Dict[str, Any]
    
    # Error classification
    error_types: List[str]
    severity: str
    components: List[str]
    suggested_actions: List[str]
    
    # Metadata
    pattern_used: str
    confidence: float
    parsing_errors: List[str]


class StructuredParser:
    """Advanced log parser with pattern matching and ML capabilities."""
    
    def __init__(self, config: Config):
        self.config = config
        self.patterns = log_patterns
        self.error_classifier = error_patterns
        
        # Caching for performance
        self._parse_cache = {}
        self._cache_size = 1000
    
    async def parse(self, log_entry: Union[Dict[str, Any], str]) -> ParsedLogEntry:
        """Parse a log entry into structured format."""
        try:
            # Handle different input formats
            if isinstance(log_entry, str):
                raw_line = log_entry
                source = "unknown"
            elif isinstance(log_entry, dict):
                raw_line = log_entry.get('message', '')
                source = log_entry.get('source', 'unknown')
            else:
                raise ValueError("Invalid log entry format")
            
            # Check cache first
            cache_key = hash(raw_line)
            if cache_key in self._parse_cache:
                return self._parse_cache[cache_key]
            
            # Parse the log entry
            parsed_data = self._parse_log_line(raw_line)
            
            # Classify errors
            error_context = self.error_classifier.get_error_context(parsed_data.get('message', ''))
            
            # Create structured entry
            structured_entry = ParsedLogEntry(
                timestamp=self._parse_timestamp(parsed_data.get('timestamp')),
                level=parsed_data.get('level', 'INFO'),
                message=parsed_data.get('message', raw_line),
                source=source,
                raw_line=raw_line,
                structured_data=parsed_data,
                error_types=error_context['error_types'],
                severity=error_context['severity'],
                components=error_context['components'],
                suggested_actions=error_context['actions'],
                pattern_used=parsed_data.get('pattern_used', 'none'),
                confidence=self._calculate_confidence(parsed_data),
                parsing_errors=[]
            )
            
            # Add to cache
            self._add_to_cache(cache_key, structured_entry)
            
            return structured_entry
            
        except Exception as e:
            logger.error(f"Error parsing log entry: {e}")
            logger.debug(f"Traceback: {traceback.format_exc()}")
            
            # Return fallback entry
            return ParsedLogEntry(
                timestamp=datetime.now(),
                level='ERROR',
                message=f"Parse error: {str(e)}",
                source=source if 'source' in locals() else 'unknown',
                raw_line=str(log_entry),
                structured_data={'parse_error': str(e)},
                error_types=['parsing_error'],
                severity='ERROR',
                components=['parser'],
                suggested_actions=['Check log format', 'Review parsing rules'],
                pattern_used='none',
                confidence=0.0,
                parsing_errors=[str(e)]
            )
    
    def _parse_log_line(self, line: str) -> Dict[str, Any]:
        """Parse a single log line using patterns."""
        line = line.strip()
        if not line:
            return {'message': '', 'pattern_used': 'empty'}
        
        # Try JSON parsing first
        json_result = self._try_json_parse(line)
        if json_result:
            return json_result
        
        # Try regex patterns
        for pattern in self.patterns.patterns:
            match = pattern.pattern.match(line)
            if match:
                result = self._extract_fields(match, pattern)
                result['pattern_used'] = pattern.name
                return result
        
        # Fallback to generic parsing
        return self._fallback_parse(line)
    
    def _try_json_parse(self, line: str) -> Optional[Dict[str, Any]]:
        """Try to parse line as JSON."""
        try:
            # Look for JSON objects in the line
            json_matches = re.findall(r'(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})', line)
            
            if json_matches:
                # Use the largest JSON object (most complete)
                json_str = max(json_matches, key=len)
                data = json.loads(json_str)
                
                # Extract common fields
                result = {
                    'json_data': data,
                    'pattern_used': 'json_log'
                }
                
                # Add common fields if they exist
                if 'timestamp' in data:
                    result['timestamp'] = data['timestamp']
                elif 'time' in data:
                    result['timestamp'] = data['time']
                elif '@timestamp' in data:
                    result['timestamp'] = data['@timestamp']
                
                if 'level' in data:
                    result['level'] = data['level']
                elif 'severity' in data:
                    result['level'] = data['severity']
                
                if 'message' in data:
                    result['message'] = data['message']
                elif 'msg' in data:
                    result['message'] = data['msg']
                elif 'log' in data:
                    result['message'] = data['log']
                
                # Extract additional fields
                for key, value in data.items():
                    if key not in ['timestamp', 'time', '@timestamp', 'level', 'severity', 'message', 'msg', 'log']:
                        result[key] = value
                
                return result
                
        except (json.JSONDecodeError, KeyError, TypeError):
            pass
        
        return None
    
    def _extract_fields(self, match: re.Match, pattern) -> Dict[str, Any]:
        """Extract fields from regex match."""
        result = {}
        
        groups = match.groups()
        for i, field_name in enumerate(pattern.fields):
            if i < len(groups):
                value = groups[i]
                if value:
                    result[field_name] = value.strip()
        
        # Post-process common fields
        if 'timestamp' in result:
            result['timestamp'] = self._normalize_timestamp(result['timestamp'])
        
        if 'level' in result:
            result['level'] = result['level'].upper()
        
        if 'request' in result:
            result.update(self._parse_http_request(result['request']))
        
        return result
    
    def _fallback_parse(self, line: str) -> Dict[str, Any]:
        """Fallback parsing for unrecognized formats."""
        result = {
            'raw_line': line,
            'pattern_used': 'fallback'
        }
        
        # Try to extract timestamp
        timestamp_match = re.search(r'(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?)', line)
        if timestamp_match:
            result['timestamp'] = timestamp_match.group(1)
        
        # Try to extract log level
        level_match = re.search(r'\b(TRACE|DEBUG|INFO|WARN|WARNING|ERROR|FATAL|CRITICAL)\b', line, re.IGNORECASE)
        if level_match:
            result['level'] = level_match.group(1).upper()
        
        # Try to extract message (everything after level)
        if 'level' in result:
            level_pos = line.find(result['level'])
            if level_pos != -1:
                message_start = line.find(':', level_pos) + 1
                if message_start > 0:
                    result['message'] = line[message_start:].strip()
        
        # If no level found, use the whole line as message
        if 'message' not in result:
            result['message'] = line
        
        return result
    
    def _normalize_timestamp(self, timestamp_str: str) -> str:
        """Normalize timestamp to ISO format."""
        try:
            # Common timestamp formats
            formats = [
                '%Y-%m-%d %H:%M:%S,%f',
                '%Y-%m-%d %H:%M:%S',
                '%Y/%m/%d %H:%M:%S',
                '%Y/%m/%d %H:%M:%S,%f',
                '%b %d %H:%M:%S',
                '%b %d %H:%M:%S %Y',
                '%d/%b/%Y:%H:%M:%S %z',
                '%Y-%m-%dT%H:%M:%S.%fZ',
                '%Y-%m-%dT%H:%M:%SZ',
                '%Y-%m-%dT%H:%M:%S.%f',
                '%Y-%m-%dT%H:%M:%S'
            ]
            
            for fmt in formats:
                try:
                    dt = datetime.strptime(timestamp_str, fmt)
                    return dt.isoformat()
                except ValueError:
                    continue
            
            # If no format matches, return original
            return timestamp_str
            
        except Exception:
            return timestamp_str
    
    def _parse_http_request(self, request_str: str) -> Dict[str, str]:
        """Parse HTTP request string."""
        try:
            parts = request_str.split()
            if len(parts) >= 2:
                return {
                    'http_method': parts[0],
                    'http_path': parts[1],
                    'http_version': parts[2] if len(parts) > 2 else ''
                }
        except Exception:
            pass
        
        return {}
    
    def _parse_timestamp(self, timestamp_str: str) -> Optional[datetime]:
        """Parse timestamp string to datetime object."""
        if not timestamp_str:
            return None
        
        # Common timestamp formats
        formats = [
            '%Y-%m-%d %H:%M:%S,%f',
            '%Y-%m-%d %H:%M:%S',
            '%Y/%m/%d %H:%M:%S',
            '%Y/%m/%d %H:%M:%S,%f',
            '%b %d %H:%M:%S',
            '%b %d %H:%M:%S %Y',
            '%d/%b/%Y:%H:%M:%S %z',
            '%Y-%m-%dT%H:%M:%S.%fZ',
            '%Y-%m-%dT%H:%M:%SZ',
            '%Y-%m-%dT%H:%M:%S.%f',
            '%Y-%m-%dT%H:%M:%S'
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(timestamp_str, fmt)
            except ValueError:
                continue
        
        # If all formats fail, return None
        return None
    
    def _calculate_confidence(self, parsed_data: Dict[str, Any]) -> float:
        """Calculate confidence score for parsing result."""
        confidence = 0.0
        
        # Base confidence based on pattern match
        if parsed_data.get('pattern_used') != 'fallback':
            confidence += 0.5
        
        # Bonus for structured data
        if 'json_data' in parsed_data:
            confidence += 0.3
        
        # Bonus for timestamp extraction
        if 'timestamp' in parsed_data:
            confidence += 0.1
        
        # Bonus for level extraction
        if 'level' in parsed_data:
            confidence += 0.1
        
        return min(confidence, 1.0)
    
    def _add_to_cache(self, key: int, entry: ParsedLogEntry):
        """Add parsed entry to cache."""
        if len(self._parse_cache) >= self._cache_size:
            # Remove oldest entries
            oldest_key = next(iter(self._parse_cache))
            del self._parse_cache[oldest_key]
        
        self._parse_cache[key] = entry
    
    async def batch_parse(self, log_entries: List[Union[Dict[str, Any], str]]) -> List[ParsedLogEntry]:
        """Parse multiple log entries efficiently."""
        tasks = [self.parse(entry) for entry in log_entries]
        return await asyncio.gather(*tasks)
    
    def get_parsing_stats(self) -> Dict[str, Any]:
        """Get statistics about parsing performance."""
        return {
            'cache_size': len(self._parse_cache),
            'cache_capacity': self._cache_size,
            'supported_patterns': len(self.patterns.patterns),
            'error_classifier_types': len(self.error_classifier.error_patterns)
        }
    
    def add_custom_pattern(self, name: str, pattern: str, fields: List[str], 
                          description: str = "", priority: int = 1):
        """Add a custom parsing pattern."""
        try:
            compiled_pattern = re.compile(pattern)
            new_pattern = type('CustomPattern', (), {
                'name': name,
                'pattern': compiled_pattern,
                'fields': fields,
                'description': description,
                'priority': priority
            })()
            
            # Insert into patterns list maintaining priority order
            insert_index = 0
            for i, existing_pattern in enumerate(self.patterns.patterns):
                if existing_pattern.priority < priority:
                    insert_index = i
                    break
                insert_index = i + 1
            
            self.patterns.patterns.insert(insert_index, new_pattern)
            logger.info(f"Added custom pattern: {name}")
            
        except re.error as e:
            logger.error(f"Invalid regex pattern: {e}")
            raise ValueError(f"Invalid regex pattern: {e}")
    
    def clear_cache(self):
        """Clear the parsing cache."""
        self._parse_cache.clear()
        logger.info("Cleared parsing cache")