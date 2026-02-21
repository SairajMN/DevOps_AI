#!/usr/bin/env python3
"""
Report builder for generating comprehensive error analysis reports.
Supports multiple output formats and customizable templates.
"""

import asyncio
import logging
import json
import os
import re
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
from jinja2 import Template, Environment, FileSystemLoader
import markdown
from collections import defaultdict

from config import Config

logger = logging.getLogger(__name__)


@dataclass
class Report:
    """Represents a generated report."""
    report_id: str
    title: str
    format: str
    content: str
    created_at: datetime
    metadata: Dict[str, Any]


class ReportBuilder:
    """Builds comprehensive reports from error analysis data."""
    
    def __init__(self, config: Config):
        self.config = config
        
        # Ensure output directory exists
        os.makedirs(self.config.report.output_dir, exist_ok=True)
        
        # Template directory
        os.makedirs(self.config.report.template_dir, exist_ok=True)
        
        # Initialize Jinja2 environment
        self.template_env = Environment(
            loader=FileSystemLoader(self.config.report.template_dir),
            autoescape=True
        )
        
        # Report cache
        self._report_cache = {}
        self._cache_size = 50
    
    async def build_report(self, analysis_data: Dict[str, Any]) -> Report:
        """Build a comprehensive report from analysis data."""
        try:
            # Check cache first
            cache_key = self._generate_cache_key(analysis_data)
            if cache_key in self._report_cache:
                return self._report_cache[cache_key]
            
            # Generate report
            report = await self._build_report_for_data(analysis_data)
            
            # Add to cache
            self._add_to_cache(cache_key, report)
            
            return report
            
        except Exception as e:
            logger.error(f"Error building report: {e}")
            logger.debug(f"Traceback: {traceback.format_exc()}")
            
            # Return fallback report
            return Report(
                report_id="error_report",
                title="Error Report Generation Failed",
                format="html",
                content=f"<h1>Error</h1><p>Failed to generate report: {str(e)}</p>",
                created_at=datetime.now(),
                metadata={'error': str(e)}
            )
    
    def _generate_cache_key(self, analysis_data: Dict[str, Any]) -> str:
        """Generate cache key for report generation."""
        key_parts = [
            str(len(analysis_data.get('error_context', []))),
            str(len(analysis_data.get('common_patterns', {}))),
            str(len(analysis_data.get('suggested_fixes', [])))
        ]
        return hash('|'.join(key_parts))
    
    async def _build_report_for_data(self, analysis_data: Dict[str, Any]) -> Report:
        """Build a report for specific analysis data."""
        report_id = f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{hash(str(analysis_data)) % 10000:04d}"
        
        # Generate report content for each format
        reports = {}
        
        for format_type in self.config.report.formats:
            try:
                if format_type == 'html':
                    content = await self._generate_html_report(analysis_data)
                elif format_type == 'markdown':
                    content = await self._generate_markdown_report(analysis_data)
                elif format_type == 'json':
                    content = await self._generate_json_report(analysis_data)
                else:
                    content = f"Unsupported format: {format_type}"
                
                reports[format_type] = content
                
            except Exception as e:
                logger.error(f"Error generating {format_type} report: {e}")
                reports[format_type] = f"Error generating {format_type} report: {str(e)}"
        
        # Use the first format as the primary report
        primary_format = self.config.report.formats[0] if self.config.report.formats else 'html'
        primary_content = reports.get(primary_format, "")
        
        # Create report metadata
        metadata = {
            'analysis_timestamp': datetime.now().isoformat(),
            'error_count': len(analysis_data.get('error_context', [])),
            'patterns_found': len(analysis_data.get('common_patterns', {})),
            'fixes_suggested': len(analysis_data.get('suggested_fixes', [])),
            'formats_generated': list(reports.keys())
        }
        
        # Create report object
        report = Report(
            report_id=report_id,
            title=f"Error Analysis Report - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            format=primary_format,
            content=primary_content,
            created_at=datetime.now(),
            metadata=metadata
        )
        
        # Save report to file
        await self._save_report_to_file(report, reports)
        
        return report
    
    async def _generate_html_report(self, analysis_data: Dict[str, Any]) -> str:
        """Generate an HTML report."""
        # Try to load custom template, fall back to default
        try:
            template = self.template_env.get_template('report_template.html')
        except:
            template = self._get_default_html_template()
        
        # Prepare data for template
        template_data = self._prepare_template_data(analysis_data)
        
        # Render HTML
        return template.render(**template_data)
    
    async def _generate_markdown_report(self, analysis_data: Dict[str, Any]) -> str:
        """Generate a Markdown report."""
        # Try to load custom template, fall back to default
        try:
            template = self.template_env.get_template('report_template.md')
        except:
            template = self._get_default_markdown_template()
        
        # Prepare data for template
        template_data = self._prepare_template_data(analysis_data)
        
        # Render Markdown
        markdown_content = template.render(**template_data)
        
        # Convert to HTML if needed
        if self.config.report.enable_detailed:
            return markdown.markdown(markdown_content, extensions=['tables', 'fenced_code'])
        
        return markdown_content
    
    async def _generate_json_report(self, analysis_data: Dict[str, Any]) -> str:
        """Generate a JSON report."""
        # Add metadata and formatting
        report_data = {
            'report_metadata': {
                'generated_at': datetime.now().isoformat(),
                'version': self.config.system.version,
                'analysis_data': analysis_data
            }
        }
        
        return json.dumps(report_data, indent=2, default=str)
    
    def _prepare_template_data(self, analysis_data: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare data for template rendering."""
        # Extract and organize data
        error_context = analysis_data.get('error_context', [])
        common_patterns = analysis_data.get('common_patterns', {})
        suggested_fixes = analysis_data.get('suggested_fixes', [])
        dependency_graph = analysis_data.get('dependency_graph', {})
        risk_assessment = analysis_data.get('risk_assessment', {})
        
        # Organize error context by file
        errors_by_file = defaultdict(list)
        for context in error_context:
            if hasattr(context, 'file_path'):
                errors_by_file[context.file_path].append(context)
        
        # Calculate statistics
        stats = {
            'total_errors': len(error_context),
            'unique_files': len(errors_by_file),
            'common_patterns_count': len(common_patterns),
            'suggested_fixes_count': len(suggested_fixes),
            'high_risk_files': len([f for f, r in risk_assessment.items() if r == 'HIGH']),
            'medium_risk_files': len([f for f, r in risk_assessment.items() if r == 'MEDIUM']),
            'low_risk_files': len([f for f, r in risk_assessment.items() if r == 'LOW'])
        }
        
        # Prepare template data
        template_data = {
            'report_title': f"DevOps AI Error Analysis Report",
            'report_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'analysis_data': analysis_data,
            'error_context': error_context,
            'errors_by_file': dict(errors_by_file),
            'common_patterns': common_patterns,
            'suggested_fixes': suggested_fixes,
            'dependency_graph': dependency_graph,
            'risk_assessment': risk_assessment,
            'statistics': stats,
            'config': {
                'enable_detailed': self.config.report.enable_detailed,
                'enable_trends': self.config.report.enable_trends
            }
        }
        
        return template_data
    
    def _get_default_html_template(self) -> Template:
        """Get default HTML template."""
        html_template = """
<!DOCTYPE html>
<html>
<head>
    <title>{{ report_title }}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .stat-card { background: #fff; border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
        .error-item { background: #fff; border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }
        .risk-high { border-left: 5px solid #d32f2f; }
        .risk-medium { border-left: 5px solid #f57c00; }
        .risk-low { border-left: 5px solid #388e3c; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ report_title }}</h1>
        <p>Generated on: {{ report_date }}</p>
    </div>
    
    <div class="section stats">
        <div class="stat-card">
            <h3>Total Errors</h3>
            <p>{{ statistics.total_errors }}</p>
        </div>
        <div class="stat-card">
            <h3>Unique Files</h3>
            <p>{{ statistics.unique_files }}</p>
        </div>
        <div class="stat-card">
            <h3>Common Patterns</h3>
            <p>{{ statistics.common_patterns_count }}</p>
        </div>
        <div class="stat-card">
            <h3>Suggested Fixes</h3>
            <p>{{ statistics.suggested_fixes_count }}</p>
        </div>
    </div>
    
    <div class="section">
        <h2>Error Analysis</h2>
        {% for file_path, errors in errors_by_file.items() %}
        <div class="error-item">
            <h3>{{ file_path }}</h3>
            <p><strong>Errors found:</strong> {{ errors|length }}</p>
            {% for error in errors %}
            <div style="margin: 10px 0; padding: 10px; background: #f9f9f9;">
                <p><strong>Line:</strong> {{ error.line_number }}</p>
                <p><strong>Function:</strong> {{ error.function_name or 'N/A' }}</p>
                <p><strong>Error Patterns:</strong> {{ error.error_patterns|join(', ') }}</p>
                <pre style="background: #fff; padding: 10px; border: 1px solid #ddd;">{{ error.code_snippet }}</pre>
            </div>
            {% endfor %}
        </div>
        {% endfor %}
    </div>
    
    <div class="section">
        <h2>Common Patterns</h2>
        <table>
            <tr>
                <th>Pattern</th>
                <th>Occurrences</th>
            </tr>
            {% for pattern, count in common_patterns.items() %}
            <tr>
                <td>{{ pattern }}</td>
                <td>{{ count }}</td>
            </tr>
            {% endfor %}
        </table>
    </div>
    
    <div class="section">
        <h2>Suggested Fixes</h2>
        <ul>
            {% for fix in suggested_fixes %}
            <li>{{ fix }}</li>
            {% endfor %}
        </ul>
    </div>
    
    <div class="section">
        <h2>Risk Assessment</h2>
        {% for file_path, risk_level in risk_assessment.items() %}
        <div class="error-item risk-{{ risk_level.lower() }}">
            <h3>{{ file_path }}</h3>
            <p><strong>Risk Level:</strong> {{ risk_level }}</p>
        </div>
        {% endfor %}
    </div>
</body>
</html>
        """
        return Template(html_template)
    
    def _get_default_markdown_template(self) -> Template:
        """Get default Markdown template."""
        markdown_template = """
# {{ report_title }}

**Generated on:** {{ report_date }}

## Summary Statistics

- **Total Errors:** {{ statistics.total_errors }}
- **Unique Files:** {{ statistics.unique_files }}
- **Common Patterns:** {{ statistics.common_patterns_count }}
- **Suggested Fixes:** {{ statistics.suggested_fixes_count }}

## Error Analysis

{% for file_path, errors in errors_by_file.items() %}
### {{ file_path }}

**Errors found:** {{ errors|length }}

{% for error in errors %}
#### Line {{ error.line_number }}
- **Function:** {{ error.function_name or 'N/A' }}
- **Error Patterns:** {{ error.error_patterns|join(', ') }}

```
{{ error.code_snippet }}
```

{% endfor %}
{% endfor %}

## Common Patterns

| Pattern | Occurrences |
|---------|-------------|
{% for pattern, count in common_patterns.items() %}
| {{ pattern }} | {{ count }} |
{% endfor %}

## Suggested Fixes

{% for fix in suggested_fixes %}
- {{ fix }}
{% endfor %}

## Risk Assessment

{% for file_path, risk_level in risk_assessment.items() %}
### {{ file_path }}
**Risk Level:** {{ risk_level }}

{% endfor %}
        """
        return Template(markdown_template)
    
    async def _save_report_to_file(self, report: Report, all_formats: Dict[str, str]):
        """Save report to file in all formats."""
        try:
            # Save primary format
            primary_filename = f"{report.report_id}.{report.format}"
            primary_filepath = os.path.join(self.config.report.output_dir, primary_filename)
            
            with open(primary_filepath, 'w') as f:
                f.write(report.content)
            
            # Save all formats
            for format_type, content in all_formats.items():
                if format_type != report.format:
                    filename = f"{report.report_id}.{format_type}"
                    filepath = os.path.join(self.config.report.output_dir, filename)
                    
                    with open(filepath, 'w') as f:
                        f.write(content)
            
            # Save metadata
            metadata_filename = f"{report.report_id}_metadata.json"
            metadata_filepath = os.path.join(self.config.report.output_dir, metadata_filename)
            
            with open(metadata_filepath, 'w') as f:
                json.dump(report.metadata, f, indent=2)
            
            logger.info(f"Saved report {report.report_id} to {primary_filepath}")
            
        except Exception as e:
            logger.error(f"Error saving report {report.report_id}: {e}")
    
    async def generate_trend_report(self, time_range_days: int = 30) -> Report:
        """Generate a trend analysis report."""
        try:
            # This would typically query the incident memory for trends
            # For now, we'll create a mock trend report
            
            trend_data = {
                'time_range_days': time_range_days,
                'error_trends': {
                    'database_errors': [10, 8, 12, 15, 9, 7, 11],
                    'network_errors': [5, 6, 4, 8, 10, 12, 9],
                    'application_errors': [20, 25, 18, 22, 19, 21, 17]
                },
                'fix_success_rates': {
                    'database_errors': 0.85,
                    'network_errors': 0.72,
                    'application_errors': 0.91
                },
                'most_common_patterns': [
                    'connection timeout',
                    'null pointer exception',
                    'out of memory'
                ]
            }
            
            # Create a trend-specific report
            report_id = f"trend_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            # Generate HTML content for trend report
            trend_template = self._get_trend_html_template()
            template_data = {
                'report_title': f"DevOps AI Trend Analysis Report - Last {time_range_days} Days",
                'report_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'trend_data': trend_data
            }
            
            content = trend_template.render(**template_data)
            
            report = Report(
                report_id=report_id,
                title=f"Trend Analysis Report - Last {time_range_days} Days",
                format='html',
                content=content,
                created_at=datetime.now(),
                metadata={
                    'time_range_days': time_range_days,
                    'report_type': 'trend_analysis'
                }
            )
            
            # Save trend report
            await self._save_report_to_file(report, {'html': content})
            
            return report
            
        except Exception as e:
            logger.error(f"Error generating trend report: {e}")
            return Report(
                report_id="trend_error",
                title="Trend Report Generation Failed",
                format="html",
                content=f"<h1>Error</h1><p>Failed to generate trend report: {str(e)}</p>",
                created_at=datetime.now(),
                metadata={'error': str(e)}
            )
    
    def _get_trend_html_template(self) -> Template:
        """Get trend analysis HTML template."""
        trend_template = """
<!DOCTYPE html>
<html>
<head>
    <title>{{ report_title }}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .chart-container { margin: 20px 0; }
        .metric-card { background: #fff; border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ report_title }}</h1>
        <p>Generated on: {{ report_date }}</p>
    </div>
    
    <div class="chart-container">
        <h2>Error Trends (Last {{ trend_data.time_range_days }} Days)</h2>
        <!-- In a real implementation, you would use a charting library like Chart.js -->
        <p>Note: Charts would be rendered here using actual charting libraries.</p>
    </div>
    
    <div class="metric-card">
        <h3>Fix Success Rates</h3>
        <ul>
        {% for error_type, success_rate in trend_data.fix_success_rates.items() %}
            <li><strong>{{ error_type }}:</strong> {{ (success_rate * 100)|round(1) }}%</li>
        {% endfor %}
        </ul>
    </div>
    
    <div class="metric-card">
        <h3>Most Common Error Patterns</h3>
        <ol>
        {% for pattern in trend_data.most_common_patterns %}
            <li>{{ pattern }}</li>
        {% endfor %}
        </ol>
    </div>
</body>
</html>
        """
        return Template(trend_template)
    
    def _add_to_cache(self, key: str, report: Report):
        """Add report to cache."""
        if len(self._report_cache) >= self._cache_size:
            # Remove oldest entries
            oldest_key = next(iter(self._report_cache))
            del self._report_cache[oldest_key]
        
        self._report_cache[key] = report
    
    async def batch_generate_reports(self, analysis_data_list: List[Dict[str, Any]]) -> List[Report]:
        """Generate reports for multiple analysis datasets efficiently."""
        tasks = [self.build_report(data) for data in analysis_data_list]
        return await asyncio.gather(*tasks)
    
    def get_report_stats(self) -> Dict[str, Any]:
        """Get statistics about report generation."""
        report_files = []
        total_size = 0
        
        try:
            for filename in os.listdir(self.config.report.output_dir):
                filepath = os.path.join(self.config.report.output_dir, filename)
                if os.path.isfile(filepath):
                    report_files.append(filename)
                    total_size += os.path.getsize(filepath)
        except Exception as e:
            logger.warning(f"Error getting report stats: {e}")
        
        return {
            'cache_size': len(self._report_cache),
            'cache_capacity': self._cache_size,
            'output_directory': self.config.report.output_dir,
            'template_directory': self.config.report.template_dir,
            'total_reports': len(report_files),
            'total_size_bytes': total_size,
            'supported_formats': self.config.report.formats,
            'detailed_enabled': self.config.report.enable_detailed,
            'trends_enabled': self.config.report.enable_trends
        }
    
    def clear_cache(self):
        """Clear the report cache."""
        self._report_cache.clear()
        logger.info("Cleared report cache")
    
    def cleanup_old_reports(self, days_to_keep: int = 30):
        """Clean up old report files."""
        try:
            cutoff_time = datetime.now().timestamp() - (days_to_keep * 24 * 3600)
            
            removed_count = 0
            for filename in os.listdir(self.config.report.output_dir):
                filepath = os.path.join(self.config.report.output_dir, filename)
                if os.path.getctime(filepath) < cutoff_time:
                    os.remove(filepath)
                    removed_count += 1
            
            logger.info(f"Cleaned up {removed_count} old report files")
            
        except Exception as e:
            logger.error(f"Error cleaning up old reports: {e}")
    
    def create_custom_template(self, template_name: str, template_content: str):
        """Create a custom report template."""
        try:
            template_path = os.path.join(self.config.report.template_dir, template_name)
            with open(template_path, 'w') as f:
                f.write(template_content)
            
            logger.info(f"Created custom template: {template_name}")
            
        except Exception as e:
            logger.error(f"Error creating custom template {template_name}: {e}")
    
    def list_available_templates(self) -> List[str]:
        """List available report templates."""
        try:
            templates = []
            for filename in os.listdir(self.config.report.template_dir):
                if filename.endswith(('.html', '.md', '.j2')):
                    templates.append(filename)
            return templates
        except Exception as e:
            logger.warning(f"Error listing templates: {e}")
            return []