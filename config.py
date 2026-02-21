#!/usr/bin/env python3
"""
Configuration module for the DevOps AI system.
Contains all configuration settings and constants.
"""

import os
from dataclasses import dataclass
from typing import List, Dict, Any, Optional
from pathlib import Path


@dataclass
class LogConfig:
    """Log monitoring configuration."""
    # Log file paths to monitor
    log_paths: List[str] = None
    # Log file patterns to watch
    log_patterns: List[str] = None
    # Polling interval in seconds
    poll_interval: float = 1.0
    # Maximum log entries to keep in memory
    max_entries: int = 10000
    # Buffer size for reading log files
    buffer_size: int = 8192
    
    def __post_init__(self):
        if self.log_paths is None:
            self.log_paths = [
                "/var/log/application.log",
                "/var/log/system.log",
                "/var/log/error.log"
            ]
        if self.log_patterns is None:
            self.log_patterns = [
                r".*ERROR.*",
                r".*FATAL.*",
                r".*CRITICAL.*",
                r".*EXCEPTION.*"
            ]


@dataclass
class ParserConfig:
    """Log parsing configuration."""
    # Enable structured parsing
    enable_structured: bool = True
    # Enable pattern matching
    enable_patterns: bool = True
    # Maximum parsing depth
    max_depth: int = 10
    # Timeout for parsing operations
    parse_timeout: float = 30.0


@dataclass
class ClassifierConfig:
    """Error classification configuration."""
    # Enable machine learning classification
    enable_ml: bool = True
    # Enable rule-based classification
    enable_rules: bool = True
    # Confidence threshold for ML classification
    confidence_threshold: float = 0.7
    # Maximum classification attempts
    max_attempts: int = 3


@dataclass
class AnalyzerConfig:
    """Codebase analysis configuration."""
    # Source code directories to analyze
    source_dirs: List[str] = None
    # File extensions to include
    file_extensions: List[str] = None
    # Maximum analysis depth
    max_depth: int = 5
    # Enable dependency analysis
    enable_dependencies: bool = True
    # Enable pattern matching
    enable_patterns: bool = True
    
    def __post_init__(self):
        if self.source_dirs is None:
            self.source_dirs = ["./src", "./lib", "./app"]
        if self.file_extensions is None:
            self.file_extensions = [".py", ".js", ".java", ".go", ".rust"]


@dataclass
class FixEngineConfig:
    """Fix engine configuration."""
    # Enable deterministic fixes
    enable_deterministic: bool = True
    # Enable ML-based fixes
    enable_ml: bool = True
    # Maximum fix attempts per error
    max_fix_attempts: int = 5
    # Fix validation timeout
    validation_timeout: float = 60.0
    # Enable rollback on fix failure
    enable_rollback: bool = True


@dataclass
class PatchConfig:
    """Patch generation configuration."""
    # Output directory for generated patches
    output_dir: str = "./storage/patches"
    # Enable atomic patches
    enable_atomic: bool = True
    # Enable rollback patches
    enable_rollback: bool = True
    # Patch format (git, unified, context)
    patch_format: str = "git"
    # Maximum patch size in KB
    max_patch_size: int = 1024


@dataclass
class MemoryConfig:
    """Incident memory configuration."""
    # Storage file for incidents
    storage_file: str = "./storage/incidents.json"
    # Maximum incidents to store
    max_incidents: int = 1000
    # Retention period in days
    retention_days: int = 365
    # Enable compression
    enable_compression: bool = True
    # Enable deduplication
    enable_deduplication: bool = True


@dataclass
class ReportConfig:
    """Report generation configuration."""
    # Output directory for reports
    output_dir: str = "./reports"
    # Report formats to generate
    formats: List[str] = None
    # Enable detailed analysis
    enable_detailed: bool = True
    # Enable trend analysis
    enable_trends: bool = True
    # Report template directory
    template_dir: str = "./templates"
    
    def __post_init__(self):
        if self.formats is None:
            self.formats = ["json", "html", "markdown"]


@dataclass
class SystemConfig:
    """System-wide configuration."""
    # Application name
    app_name: str = "DevOps AI"
    # Version
    version: str = "1.0.0"
    # Debug mode
    debug: bool = False
    # Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    log_level: str = "INFO"
    # Enable metrics collection
    enable_metrics: bool = True
    # Metrics collection interval
    metrics_interval: int = 60
    # Enable health checks
    enable_health_checks: bool = True


class Config:
    """Main configuration class."""
    
    def __init__(self, config_file: Optional[str] = None):
        """Initialize configuration from file or defaults."""
        self.system = SystemConfig()
        self.log = LogConfig()
        self.parser = ParserConfig()
        self.classifier = ClassifierConfig()
        self.analyzer = AnalyzerConfig()
        self.fix_engine = FixEngineConfig()
        self.patch = PatchConfig()
        self.memory = MemoryConfig()
        self.report = ReportConfig()
        
        # Load from file if provided
        if config_file:
            self.load_from_file(config_file)
        
        # Ensure directories exist
        self._ensure_directories()
    
    def load_from_file(self, config_file: str):
        """Load configuration from a JSON file."""
        import json
        
        try:
            with open(config_file, 'r') as f:
                config_data = json.load(f)
            
            # Update configuration objects with file data
            for section_name, section_data in config_data.items():
                if hasattr(self, section_name):
                    section_obj = getattr(self, section_name)
                    for key, value in section_data.items():
                        if hasattr(section_obj, key):
                            setattr(section_obj, key, value)
                            
        except FileNotFoundError:
            print(f"Config file {config_file} not found, using defaults")
        except json.JSONDecodeError as e:
            print(f"Error parsing config file {config_file}: {e}")
    
    def save_to_file(self, config_file: str):
        """Save current configuration to a JSON file."""
        import json
        
        config_data = {}
        for attr_name in dir(self):
            if not attr_name.startswith('_'):
                attr_value = getattr(self, attr_name)
                if hasattr(attr_value, '__dict__'):
                    config_data[attr_name] = attr_value.__dict__
        
        with open(config_file, 'w') as f:
            json.dump(config_data, f, indent=2)
    
    def _ensure_directories(self):
        """Ensure required directories exist."""
        directories = [
            self.patch.output_dir,
            self.report.output_dir,
            self.report.template_dir,
            os.path.dirname(self.memory.storage_file)
        ]
        
        for directory in directories:
            if directory:
                Path(directory).mkdir(parents=True, exist_ok=True)
    
    def get(self, section: str, key: str, default: Any = None) -> Any:
        """Get a configuration value."""
        if hasattr(self, section):
            section_obj = getattr(self, section)
            if hasattr(section_obj, key):
                return getattr(section_obj, key)
        return default
    
    def set(self, section: str, key: str, value: Any):
        """Set a configuration value."""
        if hasattr(self, section):
            section_obj = getattr(self, section)
            if hasattr(section_obj, key):
                setattr(section_obj, key, value)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary."""
        config_dict = {}
        for attr_name in dir(self):
            if not attr_name.startswith('_'):
                attr_value = getattr(self, attr_name)
                if hasattr(attr_value, '__dict__'):
                    config_dict[attr_name] = attr_value.__dict__
        return config_dict