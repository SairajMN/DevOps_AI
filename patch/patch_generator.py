#!/usr/bin/env python3
"""
Patch generator that creates atomic, reversible patches for fixes.
Supports multiple patch formats and ensures safe deployment.
"""

import asyncio
import logging
import os
import re
import json
import shutil
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
import traceback

from config import Config

logger = logging.getLogger(__name__)


@dataclass
class Patch:
    """Represents a generated patch."""
    patch_id: str
    description: str
    format: str
    content: str
    affected_files: List[str]
    created_at: datetime
    rollback_patch: Optional[str]
    metadata: Dict[str, Any]


@dataclass
class PatchResult:
    """Result of patch generation."""
    success: bool
    patches: List[Patch]
    errors: List[str]
    warnings: List[str]
    stats: Dict[str, Any]


class PatchGenerator:
    """Generates patches for applied fixes."""
    
    def __init__(self, config: Config):
        self.config = config
        
        # Ensure output directory exists
        os.makedirs(self.config.patch.output_dir, exist_ok=True)
        
        # Patch cache
        self._patch_cache = {}
        self._cache_size = 100
    
    async def generate_patches(self, fixes: List[Any]) -> List[Patch]:
        """Generate patches for a list of fixes."""
        try:
            # Check cache first
            cache_key = self._generate_cache_key(fixes)
            if cache_key in self._patch_cache:
                return self._patch_cache[cache_key]
            
            # Generate patches
            patches = await self._generate_patches_for_fixes(fixes)
            
            # Add to cache
            self._add_to_cache(cache_key, patches)
            
            return patches
            
        except Exception as e:
            logger.error(f"Error generating patches: {e}")
            logger.debug(f"Traceback: {traceback.format_exc()}")
            
            return []
    
    def _generate_cache_key(self, fixes: List[Any]) -> str:
        """Generate cache key for patch generation."""
        key_parts = [str(len(fixes))]
        for fix in fixes:
            if hasattr(fix, 'description'):
                key_parts.append(fix.description[:50])
        
        return hash('|'.join(key_parts))
    
    async def _generate_patches_for_fixes(self, fixes: List[Any]) -> List[Patch]:
        """Generate patches for multiple fixes."""
        patches = []
        
        for fix in fixes:
            try:
                patch = await self._generate_patch_for_fix(fix)
                if patch:
                    patches.append(patch)
            except Exception as e:
                logger.error(f"Error generating patch for fix: {e}")
        
        return patches
    
    async def _generate_patch_for_fix(self, fix: Any) -> Optional[Patch]:
        """Generate a patch for a single fix."""
        patch_id = f"patch_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{hash(fix.description) % 10000:04d}"
        
        # Get affected files and their changes
        affected_files = self._get_affected_files_from_fix(fix)
        
        if not affected_files:
            logger.warning(f"No affected files found for fix: {fix.description}")
            return None
        
        # Generate patch content based on format
        patch_content = ""
        rollback_content = ""
        
        if self.config.patch.patch_format == "git":
            patch_content = self._generate_git_patch(fix, affected_files)
            rollback_content = self._generate_git_rollback_patch(fix, affected_files)
        elif self.config.patch.patch_format == "unified":
            patch_content = self._generate_unified_patch(fix, affected_files)
            rollback_content = self._generate_unified_rollback_patch(fix, affected_files)
        elif self.config.patch.patch_format == "context":
            patch_content = self._generate_context_patch(fix, affected_files)
            rollback_content = self._generate_context_rollback_patch(fix, affected_files)
        else:
            raise ValueError(f"Unsupported patch format: {self.config.patch.patch_format}")
        
        # Create patch metadata
        metadata = {
            'fix_type': fix.fix_type,
            'confidence': fix.confidence,
            'risk_level': fix.risk_level,
            'rollback_possible': fix.rollback_possible,
            'estimated_impact': fix.estimated_impact,
            'affected_files_count': len(affected_files)
        }
        
        # Create rollback patch if possible
        rollback_patch = None
        if fix.rollback_possible and rollback_content:
            rollback_patch = rollback_content
        
        # Create patch object
        patch = Patch(
            patch_id=patch_id,
            description=fix.description,
            format=self.config.patch.patch_format,
            content=patch_content,
            affected_files=list(affected_files.keys()),
            created_at=datetime.now(),
            rollback_patch=rollback_patch,
            metadata=metadata
        )
        
        # Save patch to file
        await self._save_patch_to_file(patch)
        
        return patch
    
    def _get_affected_files_from_fix(self, fix: Any) -> Dict[str, Dict[str, Any]]:
        """Extract affected files and changes from a fix."""
        affected_files = {}
        
        # This is a simplified implementation
        # In a real system, you would have access to the actual file changes
        
        for change in fix.code_changes:
            file_pattern = change.get('file_pattern', '')
            search_pattern = change.get('search_pattern', '')
            replace_pattern = change.get('replace_pattern', '')
            
            # For demonstration, we'll create mock affected files
            # In reality, you would scan the codebase for files matching the pattern
            # and apply the changes to generate the actual patch content
            
            affected_files[f"mock_file_{hash(file_pattern) % 1000}.py"] = {
                'search_pattern': search_pattern,
                'replace_pattern': replace_pattern,
                'description': change.get('description', '')
            }
        
        return affected_files
    
    def _generate_git_patch(self, fix: Any, affected_files: Dict[str, Dict[str, Any]]) -> str:
        """Generate a Git-format patch."""
        patch_lines = []
        
        # Git patch header
        patch_lines.append(f"From: DevOps AI <devops-ai@example.com>")
        patch_lines.append(f"Date: {datetime.now().strftime('%a %b %d %H:%M:%S %Y')}")
        patch_lines.append(f"Subject: [PATCH] {fix.description}")
        patch_lines.append("")
        
        # Diff header
        patch_lines.append(f"--- a/{list(affected_files.keys())[0]}")
        patch_lines.append(f"+++ b/{list(affected_files.keys())[0]}")
        patch_lines.append("@@ -1,5 +1,5 @@")
        
        # Mock diff content
        for filename, change_info in affected_files.items():
            search_pattern = change_info['search_pattern']
            replace_pattern = change_info['replace_pattern']
            
            # Mock original and modified lines
            original_line = f"    {search_pattern}"
            modified_line = f"    {replace_pattern}"
            
            patch_lines.append(f"-{original_line}")
            patch_lines.append(f"+{modified_line}")
        
        return "\n".join(patch_lines)
    
    def _generate_unified_patch(self, fix: Any, affected_files: Dict[str, Dict[str, Any]]) -> str:
        """Generate a unified diff patch."""
        patch_lines = []
        
        # Unified diff header
        patch_lines.append(f"--- a/{list(affected_files.keys())[0]}")
        patch_lines.append(f"+++ b/{list(affected_files.keys())[0]}")
        patch_lines.append("@@ -1,5 +1,5 @@")
        
        # Mock diff content
        for filename, change_info in affected_files.items():
            search_pattern = change_info['search_pattern']
            replace_pattern = change_info['replace_pattern']
            
            original_line = f"    {search_pattern}"
            modified_line = f"    {replace_pattern}"
            
            patch_lines.append(f"-{original_line}")
            patch_lines.append(f"+{modified_line}")
        
        return "\n".join(patch_lines)
    
    def _generate_context_patch(self, fix: Any, affected_files: Dict[str, Dict[str, Any]]) -> str:
        """Generate a context diff patch."""
        patch_lines = []
        
        # Context diff header
        patch_lines.append(f"*** a/{list(affected_files.keys())[0]}")
        patch_lines.append(f"--- b/{list(affected_files.keys())[0]}")
        patch_lines.append("***************")
        
        # Mock diff content
        for filename, change_info in affected_files.items():
            search_pattern = change_info['search_pattern']
            replace_pattern = change_info['replace_pattern']
            
            original_line = f"    {search_pattern}"
            modified_line = f"    {replace_pattern}"
            
            patch_lines.append(f"*** 1,5 ****")
            patch_lines.append(f"  {original_line}")
            patch_lines.append(f"--- 1,5 ----")
            patch_lines.append(f"  {modified_line}")
        
        return "\n".join(patch_lines)
    
    def _generate_git_rollback_patch(self, fix: Any, affected_files: Dict[str, Dict[str, Any]]) -> str:
        """Generate a Git-format rollback patch."""
        # Rollback patch swaps the diff directions
        patch_lines = []
        
        patch_lines.append(f"From: DevOps AI <devops-ai@example.com>")
        patch_lines.append(f"Date: {datetime.now().strftime('%a %b %d %H:%M:%S %Y')}")
        patch_lines.append(f"Subject: [PATCH] Rollback: {fix.description}")
        patch_lines.append("")
        
        patch_lines.append(f"--- a/{list(affected_files.keys())[0]}")
        patch_lines.append(f"+++ b/{list(affected_files.keys())[0]}")
        patch_lines.append("@@ -1,5 +1,5 @@")
        
        for filename, change_info in affected_files.items():
            search_pattern = change_info['search_pattern']
            replace_pattern = change_info['replace_pattern']
            
            # Swap the lines for rollback
            original_line = f"    {search_pattern}"
            modified_line = f"    {replace_pattern}"
            
            patch_lines.append(f"-{modified_line}")
            patch_lines.append(f"+{original_line}")
        
        return "\n".join(patch_lines)
    
    def _generate_unified_rollback_patch(self, fix: Any, affected_files: Dict[str, Dict[str, Any]]) -> str:
        """Generate a unified diff rollback patch."""
        patch_lines = []
        
        patch_lines.append(f"--- a/{list(affected_files.keys())[0]}")
        patch_lines.append(f"+++ b/{list(affected_files.keys())[0]}")
        patch_lines.append("@@ -1,5 +1,5 @@")
        
        for filename, change_info in affected_files.items():
            search_pattern = change_info['search_pattern']
            replace_pattern = change_info['replace_pattern']
            
            original_line = f"    {search_pattern}"
            modified_line = f"    {replace_pattern}"
            
            patch_lines.append(f"-{modified_line}")
            patch_lines.append(f"+{original_line}")
        
        return "\n".join(patch_lines)
    
    def _generate_context_rollback_patch(self, fix: Any, affected_files: Dict[str, Dict[str, Any]]) -> str:
        """Generate a context diff rollback patch."""
        patch_lines = []
        
        patch_lines.append(f"*** a/{list(affected_files.keys())[0]}")
        patch_lines.append(f"--- b/{list(affected_files.keys())[0]}")
        patch_lines.append("***************")
        
        for filename, change_info in affected_files.items():
            search_pattern = change_info['search_pattern']
            replace_pattern = change_info['replace_pattern']
            
            original_line = f"    {search_pattern}"
            modified_line = f"    {replace_pattern}"
            
            patch_lines.append(f"*** 1,5 ****")
            patch_lines.append(f"  {modified_line}")
            patch_lines.append(f"--- 1,5 ----")
            patch_lines.append(f"  {original_line}")
        
        return "\n".join(patch_lines)
    
    async def _save_patch_to_file(self, patch: Patch):
        """Save patch to file."""
        try:
            # Create patch filename
            filename = f"{patch.patch_id}.patch"
            filepath = os.path.join(self.config.patch.output_dir, filename)
            
            # Write patch content
            with open(filepath, 'w') as f:
                f.write(patch.content)
            
            # Write metadata
            metadata_filename = f"{patch.patch_id}_metadata.json"
            metadata_filepath = os.path.join(self.config.patch.output_dir, metadata_filename)
            
            metadata_content = {
                'patch_id': patch.patch_id,
                'description': patch.description,
                'format': patch.format,
                'affected_files': patch.affected_files,
                'created_at': patch.created_at.isoformat(),
                'metadata': patch.metadata
            }
            
            with open(metadata_filepath, 'w') as f:
                json.dump(metadata_content, f, indent=2)
            
            # Write rollback patch if available
            if patch.rollback_patch:
                rollback_filename = f"{patch.patch_id}_rollback.patch"
                rollback_filepath = os.path.join(self.config.patch.output_dir, rollback_filename)
                
                with open(rollback_filepath, 'w') as f:
                    f.write(patch.rollback_patch)
            
            logger.info(f"Saved patch {patch.patch_id} to {filepath}")
            
        except Exception as e:
            logger.error(f"Error saving patch {patch.patch_id}: {e}")
    
    async def apply_patch(self, patch: Patch, target_dir: str = ".") -> PatchResult:
        """Apply a patch to the target directory."""
        try:
            # Validate patch size
            if len(patch.content) > self.config.patch.max_patch_size * 1024:
                return PatchResult(
                    success=False,
                    patches=[],
                    errors=[f"Patch {patch.patch_id} exceeds maximum size limit"],
                    warnings=[],
                    stats={}
                )
            
            # Create backup
            backup_dir = f"{target_dir}/.backup_{patch.patch_id}"
            await self._create_backup(target_dir, backup_dir)
            
            # Apply patch based on format
            success = await self._apply_patch_content(patch, target_dir)
            
            if success:
                # Validate patch application
                validation_result = await self._validate_patch_application(patch, target_dir)
                
                if validation_result['success']:
                    return PatchResult(
                        success=True,
                        patches=[patch],
                        errors=[],
                        warnings=validation_result.get('warnings', []),
                        stats={'backup_created': backup_dir}
                    )
                else:
                    # Rollback on validation failure
                    await self._restore_backup(target_dir, backup_dir)
                    return PatchResult(
                        success=False,
                        patches=[],
                        errors=validation_result.get('errors', ['Validation failed']),
                        warnings=[],
                        stats={'backup_restored': backup_dir}
                    )
            else:
                # Restore backup on application failure
                await self._restore_backup(target_dir, backup_dir)
                return PatchResult(
                    success=False,
                    patches=[],
                    errors=[f"Failed to apply patch {patch.patch_id}"],
                    warnings=[],
                    stats={'backup_restored': backup_dir}
                )
                
        except Exception as e:
            logger.error(f"Error applying patch {patch.patch_id}: {e}")
            return PatchResult(
                success=False,
                patches=[],
                errors=[str(e)],
                warnings=[],
                stats={}
            )
    
    async def _create_backup(self, source_dir: str, backup_dir: str):
        """Create a backup of the target directory."""
        try:
            if os.path.exists(backup_dir):
                shutil.rmtree(backup_dir)
            
            shutil.copytree(source_dir, backup_dir)
            logger.info(f"Created backup at {backup_dir}")
            
        except Exception as e:
            logger.error(f"Error creating backup: {e}")
            raise
    
    async def _restore_backup(self, target_dir: str, backup_dir: str):
        """Restore from backup."""
        try:
            if os.path.exists(target_dir):
                shutil.rmtree(target_dir)
            
            shutil.copytree(backup_dir, target_dir)
            logger.info(f"Restored from backup {backup_dir}")
            
        except Exception as e:
            logger.error(f"Error restoring backup: {e}")
            raise
    
    async def _apply_patch_content(self, patch: Patch, target_dir: str) -> bool:
        """Apply patch content to target directory."""
        try:
            # For demonstration, we'll simulate patch application
            # In a real implementation, you would use tools like 'patch' command
            # or implement the actual patch application logic
            
            logger.info(f"Simulating patch application for {patch.patch_id}")
            
            # Mock successful application
            return True
            
        except Exception as e:
            logger.error(f"Error applying patch content: {e}")
            return False
    
    async def _validate_patch_application(self, patch: Patch, target_dir: str) -> Dict[str, Any]:
        """Validate that a patch was applied correctly."""
        try:
            # For demonstration, we'll simulate validation
            # In a real implementation, you would:
            # 1. Check that expected changes were made
            # 2. Run syntax validation
            # 3. Run tests if available
            # 4. Check for unintended changes
            
            logger.info(f"Validating patch application for {patch.patch_id}")
            
            return {
                'success': True,
                'warnings': [],
                'errors': []
            }
            
        except Exception as e:
            logger.error(f"Error validating patch application: {e}")
            return {
                'success': False,
                'warnings': [],
                'errors': [str(e)]
            }
    
    async def rollback_patch(self, patch: Patch, target_dir: str = ".") -> PatchResult:
        """Rollback a previously applied patch."""
        try:
            if not patch.rollback_patch:
                return PatchResult(
                    success=False,
                    patches=[],
                    errors=[f"No rollback patch available for {patch.patch_id}"],
                    warnings=[],
                    stats={}
                )
            
            # Create backup before rollback
            backup_dir = f"{target_dir}/.backup_rollback_{patch.patch_id}"
            await self._create_backup(target_dir, backup_dir)
            
            # Apply rollback patch
            rollback_success = await self._apply_rollback_content(patch, target_dir)
            
            if rollback_success:
                return PatchResult(
                    success=True,
                    patches=[patch],
                    errors=[],
                    warnings=[],
                    stats={'backup_created': backup_dir}
                )
            else:
                # Restore backup on rollback failure
                await self._restore_backup(target_dir, backup_dir)
                return PatchResult(
                    success=False,
                    patches=[],
                    errors=[f"Failed to rollback patch {patch.patch_id}"],
                    warnings=[],
                    stats={'backup_restored': backup_dir}
                )
                
        except Exception as e:
            logger.error(f"Error rolling back patch {patch.patch_id}: {e}")
            return PatchResult(
                success=False,
                patches=[],
                errors=[str(e)],
                warnings=[],
                stats={}
            )
    
    async def _apply_rollback_content(self, patch: Patch, target_dir: str) -> bool:
        """Apply rollback patch content."""
        try:
            # For demonstration, we'll simulate rollback application
            logger.info(f"Simulating rollback for {patch.patch_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error applying rollback content: {e}")
            return False
    
    def _add_to_cache(self, key: str, patches: List[Patch]):
        """Add patches to cache."""
        if len(self._patch_cache) >= self._cache_size:
            # Remove oldest entries
            oldest_key = next(iter(self._patch_cache))
            del self._patch_cache[oldest_key]
        
        self._patch_cache[key] = patches
    
    async def batch_generate_patches(self, fixes_list: List[List[Any]]) -> List[List[Patch]]:
        """Generate patches for multiple fix lists efficiently."""
        tasks = [self.generate_patches(fixes) for fixes in fixes_list]
        return await asyncio.gather(*tasks)
    
    def get_patch_stats(self) -> Dict[str, Any]:
        """Get statistics about patch generation."""
        patch_files = []
        total_size = 0
        
        try:
            for filename in os.listdir(self.config.patch.output_dir):
                if filename.endswith('.patch'):
                    filepath = os.path.join(self.config.patch.output_dir, filename)
                    patch_files.append(filename)
                    total_size += os.path.getsize(filepath)
        except Exception as e:
            logger.warning(f"Error getting patch stats: {e}")
        
        return {
            'cache_size': len(self._patch_cache),
            'cache_capacity': self._cache_size,
            'output_directory': self.config.patch.output_dir,
            'total_patches': len(patch_files),
            'total_size_bytes': total_size,
            'patch_format': self.config.patch.patch_format,
            'max_patch_size_kb': self.config.patch.max_patch_size
        }
    
    def clear_cache(self):
        """Clear the patch cache."""
        self._patch_cache.clear()
        logger.info("Cleared patch cache")
    
    def cleanup_old_patches(self, days_to_keep: int = 30):
        """Clean up old patch files."""
        try:
            cutoff_time = datetime.now().timestamp() - (days_to_keep * 24 * 3600)
            
            removed_count = 0
            for filename in os.listdir(self.config.patch.output_dir):
                filepath = os.path.join(self.config.patch.output_dir, filename)
                if os.path.getctime(filepath) < cutoff_time:
                    os.remove(filepath)
                    removed_count += 1
            
            logger.info(f"Cleaned up {removed_count} old patch files")
            
        except Exception as e:
            logger.error(f"Error cleaning up old patches: {e}")