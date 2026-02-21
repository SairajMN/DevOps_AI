#!/usr/bin/env python3
"""
Main entry point for the DevOps AI system.
This orchestrates the entire error detection and resolution pipeline.
"""

import asyncio
import logging
import signal
import sys
from typing import Optional

from watcher.log_watcher import LogWatcher
from parser.structured_parser import StructuredParser
from classifier.error_classifier import ErrorClassifier
from analyzer.codebase_analyzer import CodebaseAnalyzer
from fix_engine.deterministic_fix_engine import DeterministicFixEngine
from patch.patch_generator import PatchGenerator
from reports.report_builder import ReportBuilder
from memory.incident_memory import IncidentMemory
from config import Config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DevOpsAISystem:
    """Main DevOps AI system orchestrator."""
    
    def __init__(self, config: Optional[Config] = None):
        self.config = config or Config()
        self.running = False
        
        # Initialize components
        self.log_watcher = LogWatcher(self.config)
        self.parser = StructuredParser(self.config)
        self.classifier = ErrorClassifier(self.config)
        self.analyzer = CodebaseAnalyzer(self.config)
        self.fix_engine = DeterministicFixEngine(self.config)
        self.patch_generator = PatchGenerator(self.config)
        self.report_builder = ReportBuilder(self.config)
        self.memory = IncidentMemory(self.config)
        
        # Setup signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    async def start(self):
        """Start the DevOps AI system."""
        logger.info("Starting DevOps AI System...")
        self.running = True
        
        try:
            # Start log watching
            await self.log_watcher.start()
            
            # Main processing loop
            while self.running:
                # Process new log entries
                log_entries = await self.log_watcher.get_new_entries()
                
                for entry in log_entries:
                    await self._process_log_entry(entry)
                
                # Sleep briefly to prevent high CPU usage
                await asyncio.sleep(1)
                
        except Exception as e:
            logger.error(f"Error in main loop: {e}")
        finally:
            await self.stop()
    
    async def _process_log_entry(self, log_entry: dict):
        """Process a single log entry through the pipeline."""
        try:
            # Parse the log entry
            parsed_data = await self.parser.parse(log_entry)
            
            # Classify the error
            classification = await self.classifier.classify(parsed_data)
            
            # Analyze the codebase for context
            analysis = await self.analyzer.analyze(classification)
            
            # Generate fixes
            fixes = await self.fix_engine.generate_fixes(classification, analysis)
            
            # Generate patches
            patches = await self.patch_generator.generate_patches(fixes)
            
            # Store in memory
            await self.memory.store_incident({
                'log_entry': log_entry,
                'parsed_data': parsed_data,
                'classification': classification,
                'analysis': analysis,
                'fixes': fixes,
                'patches': patches
            })
            
            # Generate reports
            report = await self.report_builder.build_report({
                'log_entry': log_entry,
                'parsed_data': parsed_data,
                'classification': classification,
                'analysis': analysis,
                'fixes': fixes,
                'patches': patches
            })
            
            logger.info(f"Processed log entry: {report['summary']}")
            
        except Exception as e:
            logger.error(f"Error processing log entry: {e}")
    
    async def stop(self):
        """Stop the DevOps AI system."""
        logger.info("Stopping DevOps AI System...")
        self.running = False
        await self.log_watcher.stop()
        logger.info("DevOps AI System stopped.")
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals gracefully."""
        logger.info(f"Received signal {signum}, shutting down...")
        self.running = False


async def main():
    """Main entry point."""
    config = Config()
    system = DevOpsAISystem(config)
    
    try:
        await system.start()
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt, shutting down...")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())