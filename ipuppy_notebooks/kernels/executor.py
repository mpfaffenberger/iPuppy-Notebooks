import asyncio
import json
from typing import Dict, List, Any
from jupyter_client import AsyncKernelManager, AsyncKernelClient
from ipuppy_notebooks.kernels.manager import kernel_manager


class CodeExecutor:
    def __init__(self):
        pass
    
    async def execute_code(self, kernel_id: str, code: str) -> List[Dict[str, Any]]:
        """Execute code in the global kernel and return the output"""
        # Ensure the global kernel is running
        await kernel_manager.ensure_kernel_running()
        
        kernel_info = kernel_manager.get_kernel_info()
        if not kernel_info:
            raise Exception("Global kernel not available")
        
        # Create a kernel manager and client for execution
        km = AsyncKernelManager()
        km.load_connection_info(kernel_info['connection_info'])
        
        try:
            # Create client and start channels
            kc = km.client()
            kc.start_channels()
            
            # Wait for kernel to be ready
            await kc.wait_for_ready(timeout=30)
            
            # Execute the code
            msg_id = kc.execute(code)
            
            # Collect outputs
            outputs = []
            while True:
                try:
                    # Get messages with a shorter timeout for better responsiveness
                    msg = await asyncio.wait_for(kc.get_iopub_msg(timeout=1), timeout=30)
                    
                    # Check if this message is for our execution
                    if msg['parent_header'].get('msg_id') == msg_id:
                        msg_type = msg['header']['msg_type']
                        content = msg['content']
                        
                        if msg_type == 'execute_result':
                            outputs.append({
                                'output_type': 'execute_result',
                                'data': content['data'],
                                'execution_count': content['execution_count']
                            })
                        elif msg_type == 'stream':
                            outputs.append({
                                'output_type': 'stream',
                                'name': content['name'],
                                'text': content['text']
                            })
                        elif msg_type == 'error':
                            # Format error messages nicely
                            error_text = f"{content['ename']}: {content['evalue']}\n"
                            if 'traceback' in content:
                                error_text += '\n'.join(content['traceback'])
                            outputs.append({
                                'output_type': 'error',
                                'ename': content['ename'],
                                'evalue': content['evalue'],
                                'traceback': content.get('traceback', []),
                                'text': error_text
                            })
                        elif msg_type == 'display_data':
                            outputs.append({
                                'output_type': 'display_data',
                                'data': content['data'],
                                'metadata': content.get('metadata', {})
                            })
                        elif msg_type == 'status' and content['execution_state'] == 'idle':
                            # Execution is done
                            break
                except asyncio.TimeoutError:
                    # If we timeout, break out of the loop
                    break
            
            return outputs
        
        finally:
            # Cleanup
            kc.stop_channels()
    
    async def get_kernel_status(self, kernel_id: str) -> str:
        """Get the status of the global kernel"""
        if kernel_manager.is_kernel_alive():
            return 'running'
        else:
            return 'stopped'
    
    async def get_completions(self, kernel_id: str, code: str, cursor_pos: int) -> list:
        """Get code completions from the global kernel"""
        # Check if we're completing a file path with home directory
        if self._is_home_directory_completion(code, cursor_pos):
            return await self._get_file_completions_with_home_expansion(code, cursor_pos)
        
        # Ensure the global kernel is running
        await kernel_manager.ensure_kernel_running()
        
        kernel_info = kernel_manager.get_kernel_info()
        if not kernel_info:
            raise Exception("Global kernel not available")
        
        # Create a kernel manager and client for completion
        km = AsyncKernelManager()
        km.load_connection_info(kernel_info['connection_info'])
        
        try:
            # Create client and start channels
            kc = km.client()
            kc.start_channels()
            
            # Wait for kernel to be ready
            await kc.wait_for_ready(timeout=10)
            
            # Request completions
            msg_id = kc.complete(code, cursor_pos)
            
            # Wait for completion reply
            while True:
                try:
                    msg = await asyncio.wait_for(kc.get_shell_msg(timeout=1), timeout=10)
                    
                    if msg['parent_header'].get('msg_id') == msg_id:
                        if msg['header']['msg_type'] == 'complete_reply':
                            content = msg['content']
                            if content['status'] == 'ok':
                                matches = content.get('matches', [])
                                cursor_start = content.get('cursor_start', cursor_pos)
                                cursor_end = content.get('cursor_end', cursor_pos)
                                
                                return {
                                    'matches': matches,
                                    'cursor_start': cursor_start,
                                    'cursor_end': cursor_end,
                                    'metadata': content.get('metadata', {})
                                }
                            else:
                                return {'matches': [], 'cursor_start': cursor_pos, 'cursor_end': cursor_pos}
                except asyncio.TimeoutError:
                    break
            
            return {'matches': [], 'cursor_start': cursor_pos, 'cursor_end': cursor_pos}
        
        finally:
            # Cleanup
            kc.stop_channels()
    
    def _is_home_directory_completion(self, code: str, cursor_pos: int) -> bool:
        """Check if we're trying to complete a file path that starts with ~/"""
        try:
            # Get text around cursor position
            start = max(0, cursor_pos - 50)  # Look back up to 50 characters
            end = min(len(code), cursor_pos + 10)  # Look forward up to 10 characters
            context = code[start:end]
            
            # Check if we're inside a string containing ~/
            import re
            # Look for patterns like "~/ or '~/
            pattern = r'["\']([^"\']*~\/[^"\']*)["\']?'
            matches = re.finditer(pattern, context)
            
            for match in matches:
                # Check if cursor is within this string
                match_start = start + match.start()
                match_end = start + match.end()
                if match_start <= cursor_pos <= match_end and '~/' in match.group(1):
                    return True
            
            return False
        except Exception:
            return False
    
    async def _get_file_completions_with_home_expansion(self, code: str, cursor_pos: int) -> dict:
        """Get file completions with home directory expansion"""
        try:
            from pathlib import Path
            import re
            
            # Extract the partial path from the string
            start = max(0, cursor_pos - 50)
            context = code[start:cursor_pos]
            
            # Find the string containing ~/
            pattern = r'["\']([^"\']*~\/[^"\']*)'
            match = re.search(pattern, context)
            if not match:
                return {'matches': [], 'cursor_start': cursor_pos, 'cursor_end': cursor_pos}
            
            partial_path = match.group(1)
            
            # Expand home directory
            if partial_path.startswith('~/'):
                expanded_path = str(Path.home() / partial_path[2:])
            elif partial_path == '~':
                expanded_path = str(Path.home())
            else:
                expanded_path = partial_path
            
            # Get completions
            path_obj = Path(expanded_path)
            
            if partial_path.endswith('/') or partial_path == '~':
                # List contents of directory
                search_dir = path_obj
                if not search_dir.exists() or not search_dir.is_dir():
                    return {'matches': [], 'cursor_start': cursor_pos, 'cursor_end': cursor_pos}
                items = list(search_dir.iterdir())
                completions = []
                for item in items:
                    if item.is_dir():
                        completions.append(item.name + '/')
                    else:
                        completions.append(item.name)
            else:
                # Complete partial filename
                search_dir = path_obj.parent
                if not search_dir.exists() or not search_dir.is_dir():
                    return {'matches': [], 'cursor_start': cursor_pos, 'cursor_end': cursor_pos}
                partial_name = path_obj.name
                items = [item for item in search_dir.iterdir() if item.name.startswith(partial_name)]
                completions = []
                for item in items:
                    if item.is_dir():
                        completions.append(item.name + '/')
                    else:
                        completions.append(item.name)
            
            # Calculate cursor positions for replacement
            cursor_start = cursor_pos - len(partial_path.split('/')[-1])
            cursor_end = cursor_pos
            
            return {
                'matches': completions,
                'cursor_start': cursor_start,
                'cursor_end': cursor_end
            }
            
        except Exception as e:
            return {'matches': [], 'cursor_start': cursor_pos, 'cursor_end': cursor_pos}

# Global executor instance
executor = CodeExecutor()