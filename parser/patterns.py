#!/usr/bin/env python3
"""
Log parsing patterns and utilities.
Contains regex patterns and parsing rules for different log formats.
"""

import re
from typing import Dict, List, Pattern, Tuple, Any
from dataclasses import dataclass
import json
import datetime


@dataclass
class ParsePattern:
    """Represents a parsing pattern for log entries."""
    name: str
    pattern: Pattern
    fields: List[str]
    description: str = ""
    priority: int = 1


class LogPatterns:
    """Collection of log parsing patterns for different formats."""
    
    def __init__(self):
        self.patterns = self._initialize_patterns()
    
    def _initialize_patterns(self) -> List[ParsePattern]:
        """Initialize all log parsing patterns."""
        patterns = []
        
        # Apache/Nginx access log patterns
        apache_patterns = [
            ParsePattern(
                name="apache_combined",
                pattern=re.compile(r'(\S+) - - \[(.*?)\] "(.*?)" (\d+) (\S+) "(.*?)" "(.*?)"'),
                fields=["remote_addr", "timestamp", "request", "status", "size", "referer", "user_agent"],
                description="Apache combined log format",
                priority=10
            ),
            ParsePattern(
                name="apache_common",
                pattern=re.compile(r'(\S+) - - \[(.*?)\] "(.*?)" (\d+) (\S+)'),
                fields=["remote_addr", "timestamp", "request", "status", "size"],
                description="Apache common log format",
                priority=9
            )
        ]
        
        # Application log patterns
        app_patterns = [
            ParsePattern(
                name="devops_log_format",
                pattern=re.compile(r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}) - (\w+) - (\w+) - (.*)'),
                fields=["timestamp", "level", "component", "message"],
                description="DevOps log format with component",
                priority=10
            ),
            ParsePattern(
                name="python_logging",
                pattern=re.compile(r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}) - (\S+) - (\S+) - (.*)'),
                fields=["timestamp", "name", "level", "message"],
                description="Python logging format",
                priority=8
            ),
            ParsePattern(
                name="java_logging",
                pattern=re.compile(r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}) (\S+) (\S+) - (.*)'),
                fields=["timestamp", "level", "class", "message"],
                description="Java logging format",
                priority=7
            ),
            ParsePattern(
                name="nodejs_logging",
                pattern=re.compile(r'(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z) (\S+) (.*)'),
                fields=["timestamp", "level", "message"],
                description="Node.js logging format",
                priority=6
            )
        ]
        
        # System log patterns
        system_patterns = [
            ParsePattern(
                name="syslog",
                pattern=re.compile(r'(\w+\s+\d+\s+\d{2}:\d{2}:\d{2}) (\S+) (\S+): (.*)'),
                fields=["timestamp", "hostname", "process", "message"],
                description="Syslog format",
                priority=5
            ),
            ParsePattern(
                name="windows_event",
                pattern=re.compile(r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \[(\d+)\] (\S+): (.*)'),
                fields=["timestamp", "event_id", "source", "message"],
                description="Windows event log format",
                priority=4
            )
        ]
        
        # JSON log patterns
        json_patterns = [
            ParsePattern(
                name="json_log",
                pattern=re.compile(r'(\{.*\})'),
                fields=["json_data"],
                description="JSON log format",
                priority=3
            )
        ]
        
        # Generic patterns
        generic_patterns = [
            ParsePattern(
                name="timestamp_level_message",
                pattern=re.compile(r'(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?)\s*(\w+)\s*-\s*(.*)'),
                fields=["timestamp", "level", "message"],
                description="Generic timestamp-level-message format",
                priority=2
            ),
            ParsePattern(
                name="level_message",
                pattern=re.compile(r'(\w+)\s*:\s*(.*)'),
                fields=["level", "message"],
                description="Generic level-message format",
                priority=1
            )
        ]
        
        patterns.extend(apache_patterns)
        patterns.extend(app_patterns)
        patterns.extend(system_patterns)
        patterns.extend(json_patterns)
        patterns.extend(generic_patterns)
        
        # Sort by priority (higher priority first)
        patterns.sort(key=lambda p: p.priority, reverse=True)
        
        return patterns
    
    def parse_line(self, line: str) -> Dict[str, Any]:
        """Parse a log line using the best matching pattern."""
        line = line.strip()
        if not line:
            return {}
        
        # Try JSON first
        json_result = self._try_json_parse(line)
        if json_result:
            return json_result
        
        # Try regex patterns
        for pattern in self.patterns:
            match = pattern.pattern.match(line)
            if match:
                result = self._extract_fields(match, pattern)
                result['pattern_used'] = pattern.name
                return result
        
        # If no pattern matches, return raw line
        return {
            'raw_line': line,
            'pattern_used': 'none'
        }
    
    def _try_json_parse(self, line: str) -> Dict[str, Any]:
        """Try to parse line as JSON."""
        try:
            # Look for JSON objects in the line
            json_match = re.search(r'(\{.*\})', line)
            if json_match:
                json_str = json_match.group(1)
                data = json.loads(json_str)
                
                # Extract common fields
                result = {
                    'json_data': data,
                    'pattern_used': 'json_log'
                }
                
                # Add common fields if they exist
                if 'timestamp' in data:
                    result['timestamp'] = data['timestamp']
                if 'time' in data:
                    result['timestamp'] = data['time']
                if 'level' in data:
                    result['level'] = data['level']
                if 'message' in data:
                    result['message'] = data['message']
                if 'msg' in data:
                    result['message'] = data['msg']
                
                return result
        except (json.JSONDecodeError, KeyError):
            pass
        
        return {}
    
    def _extract_fields(self, match: re.Match, pattern: ParsePattern) -> Dict[str, Any]:
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
                    dt = datetime.datetime.strptime(timestamp_str, fmt)
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
    
    def get_supported_patterns(self) -> List[Dict[str, Any]]:
        """Get list of all supported patterns."""
        return [
            {
                'name': pattern.name,
                'description': pattern.description,
                'priority': pattern.priority,
                'fields': pattern.fields
            }
            for pattern in self.patterns
        ]


class ErrorPatterns:
    """Patterns for detecting and classifying errors."""
    
    def __init__(self):
        self.error_patterns = self._initialize_error_patterns()
    
    def _initialize_error_patterns(self) -> Dict[str, List[Pattern]]:
        """Initialize error detection patterns."""
        return {
            'database_errors': [
                re.compile(r'(connection.*timeout|database.*unavailable|deadlock|constraint.*violation)', re.IGNORECASE),
                re.compile(r'(mysql|postgres|mongodb).*error', re.IGNORECASE),
                re.compile(r'(sql.*syntax|query.*failed)', re.IGNORECASE)
            ],
            'network_errors': [
                re.compile(r'(connection.*refused|timeout|network.*unreachable)', re.IGNORECASE),
                re.compile(r'(dns.*error|host.*not.*found)', re.IGNORECASE),
                re.compile(r'(ssl.*error|certificate.*error)', re.IGNORECASE)
            ],
            'application_errors': [
                re.compile(r'(null.*pointer|segmentation.*fault|out.*of.*memory)', re.IGNORECASE),
                re.compile(r'(permission.*denied|access.*denied)', re.IGNORECASE),
                re.compile(r'(file.*not.*found|directory.*not.*found)', re.IGNORECASE)
            ],
            'authentication_errors': [
                re.compile(r'(invalid.*credentials|authentication.*failed)', re.IGNORECASE),
                re.compile(r'(unauthorized|forbidden)', re.IGNORECASE),
                re.compile(r'(session.*expired|token.*expired)', re.IGNORECASE)
            ],
            'system_errors': [
                re.compile(r'(disk.*full|out.*of.*space)', re.IGNORECASE),
                re.compile(r'(memory.*leak|cpu.*overload)', re.IGNORECASE),
                re.compile(r'(service.*unavailable|system.*down)', re.IGNORECASE)
            ]
        }
    
    def classify_error(self, message: str) -> List[str]:
        """Classify error message into error types."""
        classifications = []
        
        for error_type, patterns in self.error_patterns.items():
            for pattern in patterns:
                if pattern.search(message):
                    classifications.append(error_type)
                    break
        
        return classifications if classifications else ['unknown']
    
    def get_error_context(self, message: str) -> Dict[str, Any]:
        """Extract context from error message."""
        context = {
            'error_types': self.classify_error(message),
            'severity': self._determine_severity(message),
            'components': self._extract_components(message),
            'actions': self._suggest_actions(message)
        }
        
        return context
    
    def _determine_severity(self, message: str) -> str:
        """Determine error severity from message."""
        message_lower = message.lower()
        
        critical_keywords = ['fatal', 'critical', 'crash', 'down', 'unavailable']
        warning_keywords = ['warn', 'warning', 'timeout', 'retry']
        info_keywords = ['info', 'debug', 'trace']
        
        if any(keyword in message_lower for keyword in critical_keywords):
            return 'CRITICAL'
        elif any(keyword in message_lower for keyword in warning_keywords):
            return 'WARNING'
        elif any(keyword in message_lower for keyword in info_keywords):
            return 'INFO'
        else:
            return 'ERROR'
    
    def _extract_components(self, message: str) -> List[str]:
        """Extract affected components from error message."""
        components = []
        
        # Common component patterns
        component_patterns = [
            (r'(database|db)', 'database'),
            (r'(api|service|endpoint)', 'service'),
            (r'(user|account|auth)', 'authentication'),
            (r'(file|disk|storage)', 'storage'),
            (r'(network|connection|socket)', 'network'),
            (r'(memory|cpu|ram)', 'system'),
            (r'(queue|message|event)', 'messaging'),
            (r'(cache|redis|memcached)', 'cache')
        ]
        
        message_lower = message.lower()
        for pattern, component in component_patterns:
            if re.search(pattern, message_lower):
                components.append(component)
        
        return components
    
    def _suggest_actions(self, message: str) -> List[str]:
        """Suggest actions based on error message."""
        actions = []
        
        message_lower = message.lower()
        
        if 'timeout' in message_lower:
            actions.append('Check network connectivity')
            actions.append('Increase timeout settings')
            actions.append('Monitor resource usage')
        
        if 'connection' in message_lower:
            actions.append('Verify service availability')
            actions.append('Check connection configuration')
            actions.append('Review firewall settings')
        
        if 'database' in message_lower:
            actions.append('Check database connectivity')
            actions.append('Verify database permissions')
            actions.append('Review query performance')
        
        if 'authentication' in message_lower or 'auth' in message_lower:
            actions.append('Verify credentials')
            actions.append('Check authentication service')
            actions.append('Review session configuration')
        
        return actions


# Global instances
log_patterns = LogPatterns()
error_patterns = ErrorPatterns()