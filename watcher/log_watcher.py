#!/usr/bin/env python3
"""
Log watcher module for monitoring log files and detecting errors.
Uses efficient file watching and real-time log processing.
"""

import asyncio
import logging
import os
import re
import time
from pathlib import Path
from typing import List, Dict, Any, AsyncGenerator, Optional
from dataclasses import dataclass
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from config import Config

logger = logging.getLogger(__name__)


@dataclass
class LogEntry:
    """Represents a single log entry."""
    timestamp: float
    level: str
    message: str
    source: str
    raw_line: str
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


class LogFileHandler(FileSystemEventHandler):
    """Handles file system events for log files."""
    
    def __init__(self, log_watcher):
        self.log_watcher = log_watcher
        self.file_positions = {}
    
    def on_modified(self, event):
        """Handle file modification events."""
        if event.is_directory:
            return
        
        file_path = event.src_path
        if any(pattern in file_path for pattern in self.log_watcher.config.log.log_patterns):
            self.log_watcher._schedule_file_scan(file_path)


class LogWatcher:
    """Main log watcher class that monitors log files for errors."""
    
    def __init__(self, config: Config):
        self.config = config
        self.running = False
        self.entries = []
        self.observers = []
        self.file_positions = {}
        self.file_handlers = {}
        
        # Async queue for new log entries
        self.entry_queue = asyncio.Queue()
        
        # Setup file system monitoring
        self._setup_file_monitoring()
    
    def _setup_file_monitoring(self):
        """Setup file system monitoring for log directories."""
        for log_path in self.config.log.log_paths:
            if os.path.exists(log_path):
                self._add_log_file(log_path)
            elif os.path.isdir(log_path):
                self._add_log_directory(log_path)
    
    def _add_log_file(self, file_path: str):
        """Add a specific log file to monitoring."""
        if file_path in self.file_positions:
            return
        
        # Initialize file position
        self.file_positions[file_path] = 0
        
        # Setup file system observer
        observer = Observer()
        handler = LogFileHandler(self)
        observer.schedule(handler, os.path.dirname(file_path), recursive=False)
        observer.start()
        self.observers.append(observer)
        
        logger.info(f"Started monitoring log file: {file_path}")
    
    def _add_log_directory(self, dir_path: str):
        """Add a directory to monitor for log files."""
        # Monitor directory for new log files
        observer = Observer()
        handler = LogFileHandler(self)
        observer.schedule(handler, dir_path, recursive=True)
        observer.start()
        self.observers.append(observer)
        
        logger.info(f"Started monitoring log directory: {dir_path}")
    
    async def start(self):
        """Start the log watcher."""
        logger.info("Starting log watcher...")
        self.running = True
        
        # Start background tasks
        asyncio.create_task(self._scan_files_loop())
        asyncio.create_task(self._cleanup_loop())
    
    async def stop(self):
        """Stop the log watcher."""
        logger.info("Stopping log watcher...")
        self.running = False
        
        # Stop all observers
        for observer in self.observers:
            observer.stop()
        
        # Wait for observers to stop
        for observer in self.observers:
            observer.join()
    
    def _schedule_file_scan(self, file_path: str):
        """Schedule a file scan for the given file path."""
        # This will be picked up by the scan loop
        if file_path not in self.file_positions:
            self.file_positions[file_path] = 0
    
    async def _scan_files_loop(self):
        """Main loop for scanning log files."""
        while self.running:
            try:
                await self._scan_all_files()
                await asyncio.sleep(self.config.log.poll_interval)
            except Exception as e:
                logger.error(f"Error in scan loop: {e}")
                await asyncio.sleep(1)  # Prevent rapid error loops
    
    async def _scan_all_files(self):
        """Scan all monitored files for new entries."""
        for file_path in list(self.file_positions.keys()):
            try:
                await self._scan_file(file_path)
            except Exception as e:
                logger.error(f"Error scanning file {file_path}: {e}")
    
    async def _scan_file(self, file_path: str):
        """Scan a specific file for new log entries."""
        if not os.path.exists(file_path):
            # File was deleted or moved
            if file_path in self.file_positions:
                del self.file_positions[file_path]
            return
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                # Seek to last known position
                f.seek(self.file_positions[file_path])
                
                # Read new content
                new_content = f.read(self.config.log.buffer_size)
                
                if new_content:
                    # Process new lines
                    lines = new_content.split('\n')
                    
                    for line in lines:
                        if line.strip():
                            entry = self._parse_log_line(line, file_path)
                            if entry:
                                await self._process_log_entry(entry)
                
                # Update file position
                self.file_positions[file_path] = f.tell()
                
        except Exception as e:
            logger.error(f"Error reading file {file_path}: {e}")
    
    def _parse_log_line(self, line: str, source: str) -> Optional[LogEntry]:
        """Parse a single log line into a LogEntry object."""
        # Basic log line patterns
        patterns = [
            # Standard format: [timestamp] LEVEL: message
            r'\[(.*?)\]\s*(\w+):\s*(.*)',
            # Syslog format: timestamp hostname app: message
            r'(\w+\s+\d+\s+\d+:\d+:\d+)\s+(\S+)\s+(\S+):\s*(.*)',
            # JSON format
            r'(\{.*\})',
            # Generic format
            r'(.*?)(ERROR|WARN|INFO|DEBUG|FATAL|CRITICAL)(.*?)(.*)'
        ]
        
        for pattern in patterns:
            match = re.match(pattern, line, re.IGNORECASE)
            if match:
                if pattern.startswith(r'(\{.*\})'):
                    # JSON format
                    try:
                        import json
                        data = json.loads(match.group(1))
                        return LogEntry(
                            timestamp=time.time(),
                            level=data.get('level', 'INFO'),
                            message=data.get('message', ''),
                            source=source,
                            raw_line=line,
                            metadata=data
                        )
                    except:
                        continue
                else:
                    # Regular expression format
                    groups = match.groups()
                    if len(groups) >= 3:
                        timestamp = groups[0] if groups[0] else time.time()
                        level = groups[1] if groups[1] else 'INFO'
                        message = groups[2] if groups[2] else line
                        
                        return LogEntry(
                            timestamp=self._parse_timestamp(timestamp),
                            level=level.upper(),
                            message=message,
                            source=source,
                            raw_line=line
                        )
        
        # If no pattern matches, treat as generic log entry
        return LogEntry(
            timestamp=time.time(),
            level='INFO',
            message=line,
            source=source,
            raw_line=line
        )
    
    def _parse_timestamp(self, timestamp_str: str) -> float:
        """Parse timestamp string to float."""
        try:
            # Try various timestamp formats
            import datetime
            
            # Common formats
            formats = [
                '%Y-%m-%d %H:%M:%S',
                '%Y-%m-%d %H:%M:%S.%f',
                '%Y/%m/%d %H:%M:%S',
                '%Y/%m/%d %H:%M:%S.%f',
                '%b %d %H:%M:%S',
                '%b %d %H:%M:%S %Y'
            ]
            
            for fmt in formats:
                try:
                    dt = datetime.datetime.strptime(timestamp_str, fmt)
                    return dt.timestamp()
                except ValueError:
                    continue
            
            # If all formats fail, return current time
            return time.time()
            
        except:
            return time.time()
    
    async def _process_log_entry(self, entry: LogEntry):
        """Process a log entry and add it to the queue."""
        # Check if entry matches error patterns
        if self._is_error_entry(entry):
            # Add to entries list
            self.entries.append(entry)
            
            # Maintain max entries limit
            if len(self.entries) > self.config.log.max_entries:
                self.entries.pop(0)
            
            # Add to queue for processing
            await self.entry_queue.put(entry)
            
            logger.debug(f"New error entry: {entry.level} - {entry.message[:100]}")
    
    def _is_error_entry(self, entry: LogEntry) -> bool:
        """Check if log entry represents an error."""
        # Check log level
        error_levels = ['ERROR', 'FATAL', 'CRITICAL', 'EXCEPTION']
        if entry.level.upper() in error_levels:
            return True
        
        # Check message content against patterns
        message_lower = entry.message.lower()
        for pattern in self.config.log.log_patterns:
            if re.search(pattern, message_lower, re.IGNORECASE):
                return True
        
        return False
    
    async def get_new_entries(self) -> List[LogEntry]:
        """Get new log entries from the queue."""
        entries = []
        
        # Get all available entries from queue
        while not self.entry_queue.empty():
            try:
                entry = self.entry_queue.get_nowait()
                entries.append(entry)
            except asyncio.QueueEmpty:
                break
        
        return entries
    
    async def _cleanup_loop(self):
        """Background cleanup loop."""
        while self.running:
            try:
                # Clean up old entries
                current_time = time.time()
                cutoff_time = current_time - (86400 * 7)  # Keep 7 days
                
                self.entries = [
                    entry for entry in self.entries
                    if entry.timestamp > cutoff_time
                ]
                
                await asyncio.sleep(3600)  # Run every hour
            except Exception as e:
                logger.error(f"Error in cleanup loop: {e}")
                await asyncio.sleep(60)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get statistics about the log watcher."""
        return {
            'running': self.running,
            'monitored_files': len(self.file_positions),
            'total_entries': len(self.entries),
            'queue_size': self.entry_queue.qsize(),
            'file_positions': dict(self.file_positions)
        }