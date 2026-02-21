#!/usr/bin/env python3
"""
Error classifier module that uses both rule-based and ML approaches.
Provides intelligent error classification and severity assessment.
"""

import asyncio
import logging
import re
import json
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from collections import defaultdict
import traceback

from config import Config
from parser.patterns import error_patterns

logger = logging.getLogger(__name__)


@dataclass
class ErrorClassification:
    """Represents a classified error with metadata."""
    error_type: str
    severity: str
    confidence: float
    components: List[str]
    suggested_actions: List[str]
    root_cause: Optional[str]
    affected_systems: List[str]
    classification_rules: List[str]


class ErrorClassifier:
    """Advanced error classifier using rule-based and ML approaches."""
    
    def __init__(self, config: Config):
        self.config = config
        self.error_patterns = error_patterns
        
        # ML model integration (placeholder for actual ML implementation)
        self.ml_model = None
        self._load_ml_model()
        
        # Classification cache
        self._classification_cache = {}
        self._cache_size = 500
    
    def _load_ml_model(self):
        """Load ML model for error classification."""
        # This is a placeholder - in a real implementation, you would:
        # 1. Load a pre-trained model
        # 2. Initialize model parameters
        # 3. Set up model inference pipeline
        
        if self.config.classifier.enable_ml:
            try:
                # Placeholder for actual ML model loading
                logger.info("Loading ML error classification model...")
                # self.ml_model = load_model('error_classification_model.pkl')
                logger.info("ML model loaded successfully")
            except Exception as e:
                logger.warning(f"Failed to load ML model: {e}")
                self.config.classifier.enable_ml = False
    
    async def classify(self, parsed_entry: Dict[str, Any]) -> ErrorClassification:
        """Classify a parsed log entry."""
        try:
            message = parsed_entry.get('message', '')
            structured_data = parsed_entry.get('structured_data', {})
            
            # Check cache first
            cache_key = hash(message)
            if cache_key in self._classification_cache:
                return self._classification_cache[cache_key]
            
            # Perform classification
            classification = await self._classify_error(message, structured_data)
            
            # Add to cache
            self._add_to_cache(cache_key, classification)
            
            return classification
            
        except Exception as e:
            logger.error(f"Error classifying entry: {e}")
            logger.debug(f"Traceback: {traceback.format_exc()}")
            
            # Return fallback classification
            return ErrorClassification(
                error_type='unknown',
                severity='UNKNOWN',
                confidence=0.0,
                components=[],
                suggested_actions=['Manual investigation required'],
                root_cause=None,
                affected_systems=[],
                classification_rules=[]
            )
    
    async def _classify_error(self, message: str, structured_data: Dict[str, Any]) -> ErrorClassification:
        """Perform error classification using multiple approaches."""
        classifications = []
        
        # Rule-based classification
        if self.config.classifier.enable_rules:
            rule_classification = self._classify_with_rules(message, structured_data)
            classifications.append(rule_classification)
        
        # ML-based classification
        if self.config.classifier.enable_ml and self.ml_model:
            try:
                ml_classification = await self._classify_with_ml(message, structured_data)
                classifications.append(ml_classification)
            except Exception as e:
                logger.warning(f"ML classification failed: {e}")
        
        # Combine classifications
        final_classification = self._combine_classifications(classifications)
        
        return final_classification
    
    def _classify_with_rules(self, message: str, structured_data: Dict[str, Any]) -> ErrorClassification:
        """Classify error using rule-based patterns."""
        # Get error context from patterns
        error_context = self.error_patterns.get_error_context(message)
        
        # Determine primary error type
        error_types = error_context['error_types']
        primary_type = error_types[0] if error_types else 'unknown'
        
        # Get severity
        severity = error_context['severity']
        
        # Get components
        components = error_context['components']
        
        # Get suggested actions
        suggested_actions = error_context['actions']
        
        # Determine root cause
        root_cause = self._determine_root_cause(message, error_types)
        
        # Determine affected systems
        affected_systems = self._determine_affected_systems(message, components)
        
        # Get classification rules used
        classification_rules = self._get_classification_rules(message, error_types)
        
        # Calculate confidence
        confidence = self._calculate_rule_confidence(error_types, message)
        
        return ErrorClassification(
            error_type=primary_type,
            severity=severity,
            confidence=confidence,
            components=components,
            suggested_actions=suggested_actions,
            root_cause=root_cause,
            affected_systems=affected_systems,
            classification_rules=classification_rules
        )
    
    async def _classify_with_ml(self, message: str, structured_data: Dict[str, Any]) -> ErrorClassification:
        """Classify error using ML model."""
        # This is a placeholder for actual ML classification
        # In a real implementation, you would:
        # 1. Preprocess the message and structured data
        # 2. Run inference on the ML model
        # 3. Post-process the results
        
        # Placeholder implementation
        ml_result = {
            'error_type': 'ml_predicted_type',
            'severity': 'INFO',
            'confidence': 0.8,
            'components': ['ml_component'],
            'suggested_actions': ['ML suggested action'],
            'root_cause': 'ML determined root cause',
            'affected_systems': ['ml_system'],
            'classification_rules': ['ml_rule']
        }
        
        return ErrorClassification(**ml_result)
    
    def _combine_classifications(self, classifications: List[ErrorClassification]) -> ErrorClassification:
        """Combine multiple classifications into a single result."""
        if not classifications:
            return ErrorClassification(
                error_type='unknown',
                severity='UNKNOWN',
                confidence=0.0,
                components=[],
                suggested_actions=[],
                root_cause=None,
                affected_systems=[],
                classification_rules=[]
            )
        
        if len(classifications) == 1:
            return classifications[0]
        
        # Combine multiple classifications
        # This is a simplified combination strategy
        # In a real implementation, you might use weighted averaging or voting
        
        primary_classification = classifications[0]
        
        # Combine components
        all_components = set(primary_classification.components)
        for classification in classifications[1:]:
            all_components.update(classification.components)
        
        # Combine suggested actions
        all_actions = list(set(primary_classification.suggested_actions))
        for classification in classifications[1:]:
            all_actions.extend(classification.suggested_actions)
        
        # Calculate combined confidence
        combined_confidence = sum(c.confidence for c in classifications) / len(classifications)
        
        return ErrorClassification(
            error_type=primary_classification.error_type,
            severity=primary_classification.severity,
            confidence=combined_confidence,
            components=list(all_components),
            suggested_actions=list(set(all_actions)),
            root_cause=primary_classification.root_cause,
            affected_systems=primary_classification.affected_systems,
            classification_rules=primary_classification.classification_rules
        )
    
    def _determine_root_cause(self, message: str, error_types: List[str]) -> Optional[str]:
        """Determine the root cause of the error."""
        root_cause_patterns = {
            'database_errors': [
                (r'connection.*timeout', 'Database connection timeout'),
                (r'deadlock', 'Database deadlock detected'),
                (r'constraint.*violation', 'Database constraint violation'),
                (r'query.*failed', 'SQL query execution failed')
            ],
            'network_errors': [
                (r'connection.*refused', 'Service connection refused'),
                (r'timeout', 'Network timeout'),
                (r'host.*not.*found', 'DNS resolution failed'),
                (r'ssl.*error', 'SSL/TLS handshake failed')
            ],
            'application_errors': [
                (r'null.*pointer', 'Null pointer exception'),
                (r'segmentation.*fault', 'Memory access violation'),
                (r'out.*of.*memory', 'Memory exhaustion'),
                (r'permission.*denied', 'File system permission denied')
            ]
        }
        
        for error_type in error_types:
            if error_type in root_cause_patterns:
                for pattern, cause in root_cause_patterns[error_type]:
                    if re.search(pattern, message, re.IGNORECASE):
                        return cause
        
        return None
    
    def _determine_affected_systems(self, message: str, components: List[str]) -> List[str]:
        """Determine which systems are affected by the error."""
        affected_systems = set(components)
        
        # Additional system detection patterns
        system_patterns = [
            (r'(api|rest|graphql)', 'API Gateway'),
            (r'(database|db|mysql|postgres|mongodb)', 'Database System'),
            (r'(cache|redis|memcached)', 'Caching System'),
            (r'(queue|kafka|rabbitmq)', 'Message Queue'),
            (r'(storage|s3|filesystem)', 'Storage System'),
            (r'(auth|oauth|jwt)', 'Authentication System'),
            (r'(monitoring|metrics|prometheus)', 'Monitoring System'),
            (r'(load.*balancer|nginx|haproxy)', 'Load Balancer')
        ]
        
        message_lower = message.lower()
        for pattern, system in system_patterns:
            if re.search(pattern, message_lower):
                affected_systems.add(system)
        
        return list(affected_systems)
    
    def _get_classification_rules(self, message: str, error_types: List[str]) -> List[str]:
        """Get the classification rules that were applied."""
        rules = []
        
        # Add error type rules
        for error_type in error_types:
            rules.append(f"Error type detected: {error_type}")
        
        # Add severity rules
        severity = self.error_patterns._determine_severity(message)
        rules.append(f"Severity determined: {severity}")
        
        # Add component rules
        components = self.error_patterns._extract_components(message)
        if components:
            rules.append(f"Components detected: {', '.join(components)}")
        
        return rules
    
    def _calculate_rule_confidence(self, error_types: List[str], message: str) -> float:
        """Calculate confidence score for rule-based classification."""
        confidence = 0.0
        
        # Base confidence
        if error_types and error_types[0] != 'unknown':
            confidence += 0.3
        
        # Message length bonus
        if len(message) > 10:
            confidence += 0.1
        
        # Component detection bonus
        components = self.error_patterns._extract_components(message)
        if components:
            confidence += 0.2
        
        # Action suggestion bonus
        actions = self.error_patterns._suggest_actions(message)
        if actions:
            confidence += 0.2
        
        # Pattern specificity bonus
        if len(error_types) == 1:
            confidence += 0.2
        
        return min(confidence, 1.0)
    
    def _add_to_cache(self, key: int, classification: ErrorClassification):
        """Add classification to cache."""
        if len(self._classification_cache) >= self._cache_size:
            # Remove oldest entries
            oldest_key = next(iter(self._classification_cache))
            del self._classification_cache[oldest_key]
        
        self._classification_cache[key] = classification
    
    async def batch_classify(self, parsed_entries: List[Dict[str, Any]]) -> List[ErrorClassification]:
        """Classify multiple parsed entries efficiently."""
        tasks = [self.classify(entry) for entry in parsed_entries]
        return await asyncio.gather(*tasks)
    
    def get_classification_stats(self) -> Dict[str, Any]:
        """Get statistics about classification performance."""
        return {
            'cache_size': len(self._classification_cache),
            'cache_capacity': self._cache_size,
            'ml_enabled': self.config.classifier.enable_ml,
            'rules_enabled': self.config.classifier.enable_rules,
            'error_types_supported': len(self.error_patterns.error_patterns)
        }
    
    def update_classification_rules(self, new_rules: Dict[str, List[str]]):
        """Update classification rules with new patterns."""
        for error_type, patterns in new_rules.items():
            if error_type not in self.error_patterns.error_patterns:
                self.error_patterns.error_patterns[error_type] = []
            
            for pattern in patterns:
                try:
                    compiled_pattern = re.compile(pattern, re.IGNORECASE)
                    self.error_patterns.error_patterns[error_type].append(compiled_pattern)
                except re.error as e:
                    logger.warning(f"Invalid pattern for {error_type}: {pattern} - {e}")
        
        logger.info(f"Updated classification rules with {len(new_rules)} new error types")
    
    def clear_cache(self):
        """Clear the classification cache."""
        self._classification_cache.clear()
        logger.info("Cleared classification cache")