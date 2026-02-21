#!/usr/bin/env python3
"""
CLI Interface for DevOps Log Intelligence & Auto-Triage System.
Provides command-line access to all system capabilities.
"""

import argparse
import asyncio
import json
import logging
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

from config import Config
from main import DevOpsAISystem
from watcher.log_watcher import LogWatcher
from parser.structured_parser import StructuredParser
from classifier.error_classifier import ErrorClassifier
from analyzer.codebase_analyzer import CodebaseAnalyzer
from fix_engine.deterministic_fix_engine import DeterministicFixEngine
from patch.patch_generator import PatchGenerator
from reports.report_builder import ReportBuilder
from memory.incident_memory import IncidentMemory

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DevOpsCLI:
    """Command-line interface for DevOps AI System."""
    
    def __init__(self, config: Optional[Config] = None):
        self.config = config or Config()
        self.system = None
    
    async def start_monitoring(self, log_paths: list = None, project_dir: str = "."):
        """Start monitoring log files for errors."""
        print("=" * 60)
        print("DevOps Log Intelligence System - Monitoring Mode")
        print("=" * 60)
        
        if log_paths:
            self.config.log.log_paths = log_paths
        
        self.system = DevOpsAISystem(self.config)
        
        print(f"\nMonitoring paths: {self.config.log.log_paths}")
        print(f"Project directory: {project_dir}")
        print(f"Poll interval: {self.config.log.poll_interval}s")
        print("\nPress Ctrl+C to stop monitoring...\n")
        
        try:
            await self.system.start()
        except KeyboardInterrupt:
            print("\n\nStopping monitoring...")
            await self.system.stop()
    
    async def analyze_log_file(self, log_file: str, output_format: str = "json"):
        """Analyze a specific log file."""
        print("=" * 60)
        print(f"Analyzing Log File: {log_file}")
        print("=" * 60)
        
        if not os.path.exists(log_file):
            print(f"Error: Log file '{log_file}' not found.")
            return
        
        # Initialize components
        parser = StructuredParser(self.config)
        classifier = ErrorClassifier(self.config)
        analyzer = CodebaseAnalyzer(self.config)
        fix_engine = DeterministicFixEngine(self.config)
        patch_generator = PatchGenerator(self.config)
        report_builder = ReportBuilder(self.config)
        memory = IncidentMemory(self.config)
        
        # Read log file
        with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
        
        print(f"\nProcessing {len(lines)} log entries...")
        
        results = []
        error_count = 0
        
        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
            
            # Parse log entry
            parsed = await parser.parse({'message': line, 'source': log_file})
            
            # Check if it's an error
            if parsed.level in ['ERROR', 'FATAL', 'CRITICAL', 'WARNING']:
                error_count += 1
                
                # Classify error
                classification = await classifier.classify({
                    'message': parsed.message,
                    'level': parsed.level,
                    'structured_data': parsed.structured_data
                })
                
                # Analyze codebase context
                analysis = await analyzer.analyze({
                    'error_type': classification.error_type,
                    'severity': classification.severity,
                    'components': classification.components,
                    'message': parsed.message
                })
                
                # Generate fixes
                fixes = await fix_engine.generate_fixes(
                    {
                        'error_type': classification.error_type,
                        'severity': classification.severity,
                        'components': classification.components,
                        'message': parsed.message
                    },
                    {
                        'error_context': analysis.error_context,
                        'common_patterns': analysis.common_patterns,
                        'risk_assessment': analysis.risk_assessment
                    }
                )
                
                # Generate patches
                patches = await patch_generator.generate_patches(fixes)
                
                # Store incident
                incident_id = await memory.store_incident({
                    'log_entry': {'message': line, 'source': log_file},
                    'parsed_data': {
                        'level': parsed.level,
                        'message': parsed.message,
                        'timestamp': str(parsed.timestamp) if parsed.timestamp else None
                    },
                    'classification': {
                        'error_type': classification.error_type,
                        'severity': classification.severity,
                        'confidence': classification.confidence,
                        'components': classification.components,
                        'suggested_actions': classification.suggested_actions
                    },
                    'analysis': {
                        'error_context': [vars(ctx) for ctx in analysis.error_context],
                        'common_patterns': analysis.common_patterns,
                        'risk_assessment': analysis.risk_assessment
                    },
                    'fixes': [{'description': f.description, 'confidence': f.confidence} for f in fixes],
                    'patches': [{'patch_id': p.patch_id, 'description': p.description} for p in patches]
                })
                
                results.append({
                    'line_number': i + 1,
                    'level': parsed.level,
                    'message': parsed.message[:100] + '...' if len(parsed.message) > 100 else parsed.message,
                    'error_type': classification.error_type,
                    'severity': classification.severity,
                    'confidence': classification.confidence,
                    'incident_id': incident_id,
                    'fixes_count': len(fixes),
                    'patches_count': len(patches)
                })
        
        # Generate report
        report = await report_builder.build_report({
            'error_context': [],
            'common_patterns': {},
            'suggested_fixes': [],
            'log_file': log_file,
            'total_lines': len(lines),
            'errors_found': error_count
        })
        
        # Output results
        print(f"\nAnalysis Complete!")
        print(f"  Total lines processed: {len(lines)}")
        print(f"  Errors/Warnings found: {error_count}")
        print(f"  Report saved: {report.report_id}")
        
        if output_format == "json":
            output = {
                'summary': {
                    'log_file': log_file,
                    'total_lines': len(lines),
                    'errors_found': error_count,
                    'report_id': report.report_id,
                    'analyzed_at': datetime.now().isoformat()
                },
                'results': results
            }
            print(json.dumps(output, indent=2))
        else:
            print("\n" + "=" * 60)
            print("Detailed Results:")
            print("=" * 60)
            for r in results:
                print(f"\nLine {r['line_number']}: [{r['level']}] {r['error_type']}")
                print(f"  Message: {r['message']}")
                print(f"  Severity: {r['severity']} | Confidence: {r['confidence']:.2f}")
                print(f"  Fixes: {r['fixes_count']} | Patches: {r['patches_count']}")
        
        return results
    
    async def generate_report(self, incident_id: str = None, report_type: str = "summary"):
        """Generate a report for an incident or all incidents."""
        print("=" * 60)
        print("Generating Report")
        print("=" * 60)
        
        report_builder = ReportBuilder(self.config)
        memory = IncidentMemory(self.config)
        
        if incident_id:
            incident = await memory.get_incident(incident_id)
            if not incident:
                print(f"Error: Incident '{incident_id}' not found.")
                return
            
            report = await report_builder.build_report({
                'incident': vars(incident),
                'report_type': 'single_incident'
            })
        else:
            stats = await memory.get_incident_statistics()
            
            if report_type == "trend":
                report = await report_builder.generate_trend_report()
            else:
                report = await report_builder.build_report({
                    'statistics': stats,
                    'report_type': 'summary'
                })
        
        print(f"\nReport Generated:")
        print(f"  Report ID: {report.report_id}")
        print(f"  Title: {report.title}")
        print(f"  Format: {report.format}")
        print(f"  Created: {report.created_at}")
        
        return report
    
    def view_history(self, limit: int = 10, error_type: str = None):
        """View incident history."""
        print("=" * 60)
        print("Incident History")
        print("=" * 60)
        
        memory = IncidentMemory(self.config)
        
        # Get statistics
        stats = asyncio.run(memory.get_incident_statistics())
        
        print(f"\nTotal Incidents: {stats['total_incidents']}")
        print(f"\nError Types Distribution:")
        for etype, count in stats.get('error_types', {}).items():
            print(f"  {etype}: {count}")
        
        print(f"\nSeverity Distribution:")
        for severity, count in stats.get('severity_distribution', {}).items():
            print(f"  {severity}: {count}")
        
        if stats.get('time_range'):
            print(f"\nTime Range: {stats['time_range']['start']} to {stats['time_range']['end']}")
        
        print(f"\nRecent Incidents:")
        for incident_id in stats.get('recent_incidents', [])[:limit]:
            print(f"  - {incident_id}")
    
    def view_patch(self, patch_id: str):
        """View a specific patch."""
        print("=" * 60)
        print(f"Viewing Patch: {patch_id}")
        print("=" * 60)
        
        patch_file = os.path.join(self.config.patch.output_dir, f"{patch_id}.patch")
        metadata_file = os.path.join(self.config.patch.output_dir, f"{patch_id}_metadata.json")
        
        if not os.path.exists(patch_file):
            print(f"Error: Patch '{patch_id}' not found.")
            return
        
        # Read patch content
        with open(patch_file, 'r') as f:
            content = f.read()
        
        # Read metadata
        metadata = {}
        if os.path.exists(metadata_file):
            with open(metadata_file, 'r') as f:
                metadata = json.load(f)
        
        print(f"\nPatch Details:")
        print(f"  ID: {patch_id}")
        print(f"  Description: {metadata.get('description', 'N/A')}")
        print(f"  Format: {metadata.get('format', 'N/A')}")
        print(f"  Created: {metadata.get('created_at', 'N/A')}")
        print(f"  Affected Files: {', '.join(metadata.get('affected_files', []))}")
        
        print(f"\nPatch Content:")
        print("-" * 40)
        print(content)
        print("-" * 40)
        
        # Check for rollback patch
        rollback_file = os.path.join(self.config.patch.output_dir, f"{patch_id}_rollback.patch")
        if os.path.exists(rollback_file):
            print(f"\nRollback patch available: {patch_id}_rollback.patch")
    
    def approve_patch(self, patch_id: str):
        """Approve a patch for application."""
        print("=" * 60)
        print(f"Approving Patch: {patch_id}")
        print("=" * 60)
        
        patch_file = os.path.join(self.config.patch.output_dir, f"{patch_id}.patch")
        
        if not os.path.exists(patch_file):
            print(f"Error: Patch '{patch_id}' not found.")
            return
        
        print("\nWARNING: This will apply the patch to your codebase.")
        print("Please review the patch content before approving.")
        
        # Show patch content
        self.view_patch(patch_id)
        
        # Ask for confirmation
        response = input("\nDo you want to apply this patch? (yes/no): ")
        
        if response.lower() == 'yes':
            print("\nPatch approved for application.")
            print("Note: In this MVP, patches are not auto-applied.")
            print("Please manually apply the patch using: git apply <patch_file>")
        else:
            print("\nPatch approval cancelled.")
    
    def clear_memory(self, confirm: bool = False):
        """Clear all stored incidents."""
        print("=" * 60)
        print("Clearing Incident Memory")
        print("=" * 60)
        
        if not confirm:
            response = input("\nThis will delete all stored incidents. Continue? (yes/no): ")
            if response.lower() != 'yes':
                print("Cancelled.")
                return
        
        memory = IncidentMemory(self.config)
        memory.clear_all_incidents()
        print("\nAll incidents cleared.")
    
    def show_status(self):
        """Show system status."""
        print("=" * 60)
        print("DevOps AI System Status")
        print("=" * 60)
        
        memory = IncidentMemory(self.config)
        stats = asyncio.run(memory.get_incident_statistics())
        
        print(f"\nSystem Information:")
        print(f"  Version: {self.config.system.version}")
        print(f"  Debug Mode: {self.config.system.debug}")
        print(f"  Log Level: {self.config.system.log_level}")
        
        print(f"\nStorage:")
        print(f"  Incidents: {stats['total_incidents']}")
        print(f"  Storage File: {self.config.memory.storage_file}")
        
        print(f"\nConfiguration:")
        print(f"  Log Paths: {self.config.log.log_paths}")
        print(f"  Poll Interval: {self.config.log.poll_interval}s")
        print(f"  ML Enabled: {self.config.classifier.enable_ml}")
        print(f"  Rules Enabled: {self.config.classifier.enable_rules}")
        
        # Check directories
        print(f"\nDirectories:")
        patch_count = len(os.listdir(self.config.patch.output_dir)) if os.path.exists(self.config.patch.output_dir) else 0
        report_count = len(os.listdir(self.config.report.output_dir)) if os.path.exists(self.config.report.output_dir) else 0
        print(f"  Patches: {self.config.patch.output_dir} ({patch_count} files)")
        print(f"  Reports: {self.config.report.output_dir} ({report_count} files)")


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="DevOps Log Intelligence & Auto-Triage System",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python cli.py monitor --paths /var/log/app.log
  python cli.py analyze --file error.log
  python cli.py report --type trend
  python cli.py history --limit 20
  python cli.py status
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Monitor command
    monitor_parser = subparsers.add_parser("monitor", help="Start log monitoring")
    monitor_parser.add_argument("--paths", nargs="+", help="Log file paths to monitor")
    monitor_parser.add_argument("--project", default=".", help="Project directory")
    
    # Analyze command
    analyze_parser = subparsers.add_parser("analyze", help="Analyze a log file")
    analyze_parser.add_argument("--file", required=True, help="Log file to analyze")
    analyze_parser.add_argument("--format", default="json", choices=["json", "text"], help="Output format")
    
    # Report command
    report_parser = subparsers.add_parser("report", help="Generate a report")
    report_parser.add_argument("--incident", help="Incident ID for specific report")
    report_parser.add_argument("--type", default="summary", choices=["summary", "trend"], help="Report type")
    
    # History command
    history_parser = subparsers.add_parser("history", help="View incident history")
    history_parser.add_argument("--limit", type=int, default=10, help="Number of incidents to show")
    history_parser.add_argument("--type", help="Filter by error type")
    
    # Patch command
    patch_parser = subparsers.add_parser("patch", help="Patch management")
    patch_parser.add_argument("--view", help="View a specific patch")
    patch_parser.add_argument("--approve", help="Approve a patch for application")
    patch_parser.add_argument("--list", action="store_true", help="List all patches")
    
    # Clear command
    clear_parser = subparsers.add_parser("clear", help="Clear incident memory")
    clear_parser.add_argument("--confirm", action="store_true", help="Skip confirmation")
    
    # Status command
    subparsers.add_parser("status", help="Show system status")
    
    # Parse arguments
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # Initialize CLI
    cli = DevOpsCLI()
    
    # Execute command
    if args.command == "monitor":
        asyncio.run(cli.start_monitoring(args.paths, args.project))
    
    elif args.command == "analyze":
        asyncio.run(cli.analyze_log_file(args.file, args.format))
    
    elif args.command == "report":
        asyncio.run(cli.generate_report(args.incident, args.type))
    
    elif args.command == "history":
        cli.view_history(args.limit, args.type)
    
    elif args.command == "patch":
        if args.view:
            cli.view_patch(args.view)
        elif args.approve:
            cli.approve_patch(args.approve)
        elif args.list:
            patch_dir = cli.config.patch.output_dir
            if os.path.exists(patch_dir):
                patches = [f for f in os.listdir(patch_dir) if f.endswith('.patch') and 'rollback' not in f]
                print("Available Patches:")
                for p in patches:
                    print(f"  - {p.replace('.patch', '')}")
            else:
                print("No patches found.")
        else:
            patch_parser.print_help()
    
    elif args.command == "clear":
        cli.clear_memory(args.confirm)
    
    elif args.command == "status":
        cli.show_status()


if __name__ == "__main__":
    main()