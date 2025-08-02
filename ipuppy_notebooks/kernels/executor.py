import asyncio
import json
from typing import Dict, List, Any
from jupyter_client import AsyncKernelManager, AsyncKernelClient
from ipuppy_notebooks.kernels.manager import kernel_manager


class CodeExecutor:
    def __init__(self):
        pass
    
    async def execute_code(self, kernel_id: str, code: str) -> List[Dict[str, Any]]:
        """Execute code in a kernel and return the output"""
        kernel_info = kernel_manager.get_kernel_info(kernel_id)
        if not kernel_info:
            raise Exception(f"Kernel {kernel_id} not found")
        
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
        """Get the status of a kernel"""
        kernel_info = kernel_manager.get_kernel_info(kernel_id)
        if not kernel_info:
            return 'stopped'
        
        process = kernel_info['process']
        if process.poll() is None:
            return 'running'
        else:
            return 'stopped'

# Global executor instance
executor = CodeExecutor()