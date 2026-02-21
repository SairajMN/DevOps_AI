#!/usr/bin/env python3
"""
Incident memory system for storing and retrieving error incidents.
Provides persistent storage and intelligent retrieval of error patterns.
"""

import asyncio
import logging
import json
import os
import re
import gzip
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from collections import defaultdict
import traceback

from config import Config

logger = logging.getLogger(__name__)


@dataclass
class Incident:
    """Represents a stored incident."""
    incident_id: str
    timestamp: datetime
    log_entry: Dict[str, Any]
    parsed_data: Dict[str, Any]
    classification: Dict[str, Any]
    analysis: Dict[str, Any]
    fixes: List[Dict[str, Any]]
    patches: List[Dict[str, Any]]
    resolution_status: str
    metadata: Dict[str, Any]


class IncidentMemory:
    """Manages storage and retrieval of error incidents."""
    
    def __init__(self, config: Config):
        self.config = config
        
        # Ensure storage directory exists
        os.makedirs(os.path.dirname(self.config.memory.storage_file), exist_ok=True)
        
        # In-memory cache for recent incidents
        self._incident_cache = {}
        self._cache_size = 100
        
        # Load existing incidents
        self._incidents = self._load_incidents()
        
        # Background tasks
        self._cleanup_task = None
        self._deduplication_task = None
    
    def _load_incidents(self) -> Dict[str, Incident]:
        """Load incidents from storage file."""
        incidents = {}
        
        try:
            if os.path.exists(self.config.memory.storage_file):
                with open(self.config.memory.storage_file, 'r') as f:
                    data = json.load(f)
                
                for incident_data in data:
                    # Convert timestamp string back to datetime
                    incident_data['timestamp'] = datetime.fromisoformat(incident_data['timestamp'])
                    
                    # Create incident object
                    incident = Incident(**incident_data)
                    incidents[incident.incident_id] = incident
        
        except Exception as e:
            logger.warning(f"Error loading incidents from storage: {e}")
        
        return incidents
    
    def _save_incidents(self):
        """Save incidents to storage file."""
        try:
            # Convert incidents to serializable format
            data = []
            for incident in self._incidents.values():
                incident_dict = asdict(incident)
                # Convert datetime to string
                incident_dict['timestamp'] = incident.timestamp.isoformat()
                data.append(incident_dict)
            
            # Write to file with compression if enabled
            if self.config.memory.enable_compression:
                with gzip.open(self.config.memory.storage_file + '.gz', 'wt') as f:
                    json.dump(data, f, indent=2)
            else:
                with open(self.config.memory.storage_file, 'w') as f:
                    json.dump(data, f, indent=2)
            
            logger.debug(f"Saved {len(data)} incidents to storage")
            
        except Exception as e:
            logger.error(f"Error saving incidents to storage: {e}")
    
    async def store_incident(self, incident_data: Dict[str, Any]) -> str:
        """Store a new incident."""
        try:
            # Generate incident ID
            incident_id = self._generate_incident_id(incident_data)
            
            # Create incident object
            incident = Incident(
                incident_id=incident_id,
                timestamp=datetime.now(),
                log_entry=incident_data.get('log_entry', {}),
                parsed_data=incident_data.get('parsed_data', {}),
                classification=incident_data.get('classification', {}),
                analysis=incident_data.get('analysis', {}),
                fixes=incident_data.get('fixes', []),
                patches=incident_data.get('patches', []),
                resolution_status='pending',
                metadata={
                    'created_at': datetime.now().isoformat(),
                    'source': 'devops_ai',
                    'version': self.config.system.version
                }
            )
            
            # Check for duplicates if deduplication is enabled
            if self.config.memory.enable_deduplication:
                if self._is_duplicate_incident(incident):
                    logger.info(f"Duplicate incident detected: {incident_id}")
                    return incident_id
            
            # Store in memory
            self._incidents[incident_id] = incident
            self._add_to_cache(incident_id, incident)
            
            # Save to storage
            self._save_incidents()
            
            # Update metadata
            incident.metadata['stored_at'] = datetime.now().isoformat()
            
            logger.info(f"Stored incident: {incident_id}")
            
            return incident_id
            
        except Exception as e:
            logger.error(f"Error storing incident: {e}")
            logger.debug(f"Traceback: {traceback.format_exc()}")
            return ""
    
    def _generate_incident_id(self, incident_data: Dict[str, Any]) -> str:
        """Generate a unique incident ID."""
        # Create a hash of key incident data for uniqueness
        key_data = [
            incident_data.get('log_entry', {}).get('message', ''),
            incident_data.get('classification', {}).get('error_type', ''),
            incident_data.get('classification', {}).get('severity', ''),
            str(incident_data.get('analysis', {}).get('common_patterns', {}))
        ]
        
        import hashlib
        hash_input = '|'.join(key_data).encode('utf-8')
        hash_digest = hashlib.md5(hash_input).hexdigest()[:8]
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        return f"incident_{timestamp}_{hash_digest}"
    
    def _is_duplicate_incident(self, new_incident: Incident) -> bool:
        """Check if an incident is a duplicate."""
        # Look for similar incidents in the last 24 hours
        cutoff_time = datetime.now() - timedelta(hours=24)
        
        for incident in self._incidents.values():
            if incident.timestamp < cutoff_time:
                continue
            
            # Compare key fields
            if (incident.classification.get('error_type') == new_incident.classification.get('error_type') and
                incident.classification.get('severity') == new_incident.classification.get('severity')):
                
                # Check message similarity
                old_message = incident.log_entry.get('message', '').lower()
                new_message = new_incident.log_entry.get('message', '').lower()
                
                if self._calculate_similarity(old_message, new_message) > 0.8:
                    return True
        
        return False
    
    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """Calculate similarity between two texts."""
        # Simple Jaccard similarity for demonstration
        set1 = set(text1.split())
        set2 = set(text2.split())
        
        intersection = set1.intersection(set2)
        union = set1.union(set2)
        
        if not union:
            return 0.0
        
        return len(intersection) / len(union)
    
    def _add_to_cache(self, incident_id: str, incident: Incident):
        """Add incident to cache."""
        if len(self._incident_cache) >= self._cache_size:
            # Remove oldest entries
            oldest_key = next(iter(self._incident_cache))
            del self._incident_cache[oldest_key]
        
        self._incident_cache[incident_id] = incident
    
    async def get_incident(self, incident_id: str) -> Optional[Incident]:
        """Retrieve an incident by ID."""
        # Check cache first
        if incident_id in self._incident_cache:
            return self._incident_cache[incident_id]
        
        # Check storage
        if incident_id in self._incidents:
            incident = self._incidents[incident_id]
            self._add_to_cache(incident_id, incident)
            return incident
        
        return None
    
    async def search_incidents(self, query: Dict[str, Any]) -> List[Incident]:
        """Search for incidents matching criteria."""
        results = []
        
        for incident in self._incidents.values():
            if self._incident_matches_query(incident, query):
                results.append(incident)
        
        # Sort by timestamp (newest first)
        results.sort(key=lambda x: x.timestamp, reverse=True)
        
        return results
    
    def _incident_matches_query(self, incident: Incident, query: Dict[str, Any]) -> bool:
        """Check if an incident matches the search query."""
        # Error type filter
        if 'error_type' in query:
            if incident.classification.get('error_type') != query['error_type']:
                return False
        
        # Severity filter
        if 'severity' in query:
            if incident.classification.get('severity') != query['severity']:
                return False
        
        # Time range filter
        if 'start_time' in query:
            if incident.timestamp < query['start_time']:
                return False
        
        if 'end_time' in query:
            if incident.timestamp > query['end_time']:
                return False
        
        # Message search
        if 'message' in query:
            message = incident.log_entry.get('message', '').lower()
            search_terms = query['message'].lower().split()
            
            if not all(term in message for term in search_terms):
                return False
        
        # Component filter
        if 'components' in query:
            incident_components = set(incident.classification.get('components', []))
            query_components = set(query['components'])
            
            if not query_components.issubset(incident_components):
                return False
        
        return True
    
    async def get_similar_incidents(self, incident: Incident, limit: int = 5) -> List[Incident]:
        """Find incidents similar to the given incident."""
        similar_incidents = []
        
        for stored_incident in self._incidents.values():
            if stored_incident.incident_id == incident.incident_id:
                continue
            
            similarity = self._calculate_incident_similarity(incident, stored_incident)
            
            if similarity > 0.5:  # Threshold for similarity
                similar_incidents.append((similarity, stored_incident))
        
        # Sort by similarity (highest first) and return top N
        similar_incidents.sort(key=lambda x: x[0], reverse=True)
        return [incident for _, incident in similar_incidents[:limit]]
    
    def _calculate_incident_similarity(self, incident1: Incident, incident2: Incident) -> float:
        """Calculate similarity between two incidents."""
        similarity_scores = []
        
        # Error type similarity
        if incident1.classification.get('error_type') == incident2.classification.get('error_type'):
            similarity_scores.append(0.4)
        
        # Severity similarity
        if incident1.classification.get('severity') == incident2.classification.get('severity'):
            similarity_scores.append(0.3)
        
        # Message similarity
        message1 = incident1.log_entry.get('message', '').lower()
        message2 = incident2.log_entry.get('message', '').lower()
        message_similarity = self._calculate_similarity(message1, message2)
        similarity_scores.append(message_similarity * 0.3)
        
        return sum(similarity_scores)
    
    async def get_incident_statistics(self) -> Dict[str, Any]:
        """Get statistics about stored incidents."""
        if not self._incidents:
            return {
                'total_incidents': 0,
                'error_types': {},
                'severity_distribution': {},
                'time_range': None,
                'recent_incidents': []
            }
        
        # Error type distribution
        error_types = defaultdict(int)
        for incident in self._incidents.values():
            error_type = incident.classification.get('error_type', 'unknown')
            error_types[error_type] += 1
        
        # Severity distribution
        severity_distribution = defaultdict(int)
        for incident in self._incidents.values():
            severity = incident.classification.get('severity', 'UNKNOWN')
            severity_distribution[severity] += 1
        
        # Time range
        timestamps = [incident.timestamp for incident in self._incidents.values()]
        time_range = {
            'start': min(timestamps).isoformat(),
            'end': max(timestamps).isoformat(),
            'span_days': (max(timestamps) - min(timestamps)).days
        }
        
        # Recent incidents
        recent_incidents = sorted(self._incidents.values(), key=lambda x: x.timestamp, reverse=True)[:10]
        recent_incident_ids = [incident.incident_id for incident in recent_incidents]
        
        return {
            'total_incidents': len(self._incidents),
            'error_types': dict(error_types),
            'severity_distribution': dict(severity_distribution),
            'time_range': time_range,
            'recent_incidents': recent_incident_ids
        }
    
    async def update_incident_resolution(self, incident_id: str, resolution_status: str, resolution_details: Dict[str, Any] = None):
        """Update the resolution status of an incident."""
        incident = await self.get_incident(incident_id)
        if incident:
            incident.resolution_status = resolution_status
            incident.metadata['resolution_details'] = resolution_details or {}
            incident.metadata['resolved_at'] = datetime.now().isoformat()
            
            # Save changes
            self._save_incidents()
            
            logger.info(f"Updated resolution status for incident {incident_id}: {resolution_status}")
    
    async def cleanup_old_incidents(self):
        """Clean up old incidents based on retention policy."""
        try:
            cutoff_time = datetime.now() - timedelta(days=self.config.memory.retention_days)
            
            removed_count = 0
            incidents_to_remove = []
            
            for incident_id, incident in self._incidents.items():
                if incident.timestamp < cutoff_time:
                    incidents_to_remove.append(incident_id)
            
            for incident_id in incidents_to_remove:
                del self._incidents[incident_id]
                if incident_id in self._incident_cache:
                    del self._incident_cache[incident_id]
                removed_count += 1
            
            if removed_count > 0:
                self._save_incidents()
                logger.info(f"Cleaned up {removed_count} old incidents")
            
        except Exception as e:
            logger.error(f"Error cleaning up old incidents: {e}")
    
    async def start_background_tasks(self):
        """Start background maintenance tasks."""
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())
        self._deduplication_task = asyncio.create_task(self._deduplication_loop())
    
    async def stop_background_tasks(self):
        """Stop background maintenance tasks."""
        if self._cleanup_task:
            self._cleanup_task.cancel()
        if self._deduplication_task:
            self._deduplication_task.cancel()
    
    async def _cleanup_loop(self):
        """Background task for cleaning up old incidents."""
        while True:
            try:
                await self.cleanup_old_incidents()
                await asyncio.sleep(3600)  # Run every hour
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in cleanup loop: {e}")
                await asyncio.sleep(600)  # Wait 10 minutes before retrying
    
    async def _deduplication_loop(self):
        """Background task for deduplicating incidents."""
        while True:
            try:
                await self._perform_deduplication()
                await asyncio.sleep(1800)  # Run every 30 minutes
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in deduplication loop: {e}")
                await asyncio.sleep(1800)
    
    async def _perform_deduplication(self):
        """Perform deduplication of similar incidents."""
        if not self.config.memory.enable_deduplication:
            return
        
        try:
            # Group incidents by error type and severity
            incident_groups = defaultdict(list)
            for incident in self._incidents.values():
                key = (incident.classification.get('error_type'), incident.classification.get('severity'))
                incident_groups[key].append(incident)
            
            # Check for duplicates within each group
            for group_key, incidents in incident_groups.items():
                if len(incidents) < 2:
                    continue
                
                # Sort by timestamp (newest first)
                incidents.sort(key=lambda x: x.timestamp, reverse=True)
                
                # Mark older duplicates as duplicates
                for i in range(1, len(incidents)):
                    current = incidents[i]
                    previous = incidents[i-1]
                    
                    similarity = self._calculate_incident_similarity(current, previous)
                    
                    if similarity > 0.8:  # High similarity threshold
                        current.resolution_status = 'duplicate'
                        current.metadata['duplicate_of'] = previous.incident_id
                        logger.info(f"Marked incident {current.incident_id} as duplicate of {previous.incident_id}")
            
            # Save changes
            self._save_incidents()
            
        except Exception as e:
            logger.error(f"Error performing deduplication: {e}")
    
    def get_memory_stats(self) -> Dict[str, Any]:
        """Get statistics about the incident memory."""
        return {
            'cache_size': len(self._incident_cache),
            'cache_capacity': self._cache_size,
            'storage_file': self.config.memory.storage_file,
            'total_incidents': len(self._incidents),
            'compression_enabled': self.config.memory.enable_compression,
            'deduplication_enabled': self.config.memory.enable_deduplication,
            'retention_days': self.config.memory.retention_days
        }
    
    def clear_cache(self):
        """Clear the incident cache."""
        self._incident_cache.clear()
        logger.info("Cleared incident cache")
    
    def clear_all_incidents(self):
        """Clear all stored incidents."""
        self._incidents.clear()
        self._incident_cache.clear()
        self._save_incidents()
        logger.info("Cleared all incidents")