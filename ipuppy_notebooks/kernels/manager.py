import asyncio
import json
import logging
import os
import signal
import subprocess
import tempfile
import uuid
from pathlib import Path
from typing import Dict, Optional

# Set up logging
logger = logging.getLogger(__name__)


class KernelManager:
    def __init__(self):
        self.global_kernel: Optional[Dict] = None
        self.base_dir = Path("kernels")
        self.base_dir.mkdir(exist_ok=True)
        self.kernel_id = "global-kernel"
    
    async def start_kernel(self, kernel_id: Optional[str] = None) -> str:
        # Always use the global kernel ID
        kernel_id = self.kernel_id
        
        # If kernel is already running, return it
        if self.global_kernel and self.is_kernel_alive():
            logger.info(f"Global kernel already running: {kernel_id}")
            return kernel_id
        
        # Stop any existing kernel first
        if self.global_kernel:
            await self.stop_kernel(kernel_id)
        
        # Create a temporary connection file
        connection_file = self.base_dir / f"kernel-{kernel_id}.json"
        
        # Start the kernel process
        kernel_cmd = [
            "python", "-m", "ipykernel", 
            "--ConnectionFileMixin.connection_file=" + str(connection_file),
            "--matplotlib=inline"
        ]
        
        try:
            process = subprocess.Popen(
                kernel_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            # Wait for connection file to be created
            for _ in range(100):  # Try for 10 seconds
                if connection_file.exists():
                    break
                await asyncio.sleep(0.1)
            
            # Check if process failed to start
            if process.poll() is not None:
                stderr = process.stderr.read().decode() if process.stderr else ""
                raise Exception(f"Kernel process exited immediately: {stderr}")
            
            # Wait a bit more for the connection file to be fully written
            if not connection_file.exists():
                await asyncio.sleep(0.5)
                
            if not connection_file.exists():
                raise Exception("Kernel failed to start: connection file not created")
            
            # Read connection info
            with open(connection_file, "r") as f:
                connection_info = json.load(f)
            
            self.global_kernel = {
                "process": process,
                "connection_file": connection_file,
                "connection_info": connection_info
            }
            
            logger.info(f"Started global kernel: {kernel_id}")
            return kernel_id
        except Exception as e:
            # Clean up connection file if it was created
            if connection_file.exists():
                try:
                    connection_file.unlink()
                except:
                    pass
            raise Exception(f"Failed to start kernel: {str(e)}")
    
    def is_kernel_alive(self) -> bool:
        """Check if the global kernel is still alive"""
        if not self.global_kernel:
            return False
        process = self.global_kernel["process"]
        return process.poll() is None

    async def stop_kernel(self, kernel_id: str) -> bool:
        if not self.global_kernel:
            return False
        
        kernel = self.global_kernel
        process = kernel["process"]
        
        # Always do cleanup, even if there are errors
        cleanup_successful = True
        error_msg = None
        
        try:
            # Check if process is already dead
            if process.poll() is not None:
                logger.info(f"Process for kernel {kernel_id} already terminated")
            else:
                # Try graceful shutdown first
                try:
                    process.send_signal(signal.SIGINT)
                    logger.info(f"Sent SIGINT to kernel {kernel_id}")
                except Exception as e:
                    logger.warning(f"Failed to send SIGINT: {e}")
                
                # Wait for process to terminate
                for i in range(50):  # Try for 5 seconds
                    if process.poll() is not None:
                        logger.info(f"Kernel {kernel_id} terminated gracefully after {i*0.1:.1f}s")
                        break
                    await asyncio.sleep(0.1)
                
                # Force kill if still running
                if process.poll() is None:
                    logger.warning(f"Force killing kernel {kernel_id}")
                    try:
                        process.kill()
                        process.wait(timeout=5)
                        logger.info(f"Kernel {kernel_id} force killed")
                    except Exception as e:
                        logger.error(f"Failed to force kill: {e}")
                        cleanup_successful = False
                        error_msg = f"Failed to kill process: {e}"
        
        except Exception as e:
            logger.error(f"Error during kernel stop: {e}")
            cleanup_successful = False
            error_msg = str(e)
        
        # Always try to clean up files and state
        try:
            # Remove connection file
            if kernel["connection_file"].exists():
                kernel["connection_file"].unlink()
                logger.info(f"Removed connection file for kernel {kernel_id}")
        except Exception as e:
            logger.warning(f"Failed to remove connection file: {e}")
            cleanup_successful = False
        
        # Always clear global kernel
        self.global_kernel = None
        logger.info(f"Cleared global kernel")
        
        if not cleanup_successful and error_msg:
            # Don't raise exception, just log it and return success
            # The cleanup was attempted and the kernel is removed from tracking
            logger.warning(f"Kernel stop had issues but cleanup completed: {error_msg}")
        
        return True
    
    def get_kernel_info(self, kernel_id: str) -> Optional[Dict]:
        # Always return global kernel if it exists and is alive
        if self.global_kernel and self.is_kernel_alive():
            return self.global_kernel
        return None
    
    def list_kernels(self) -> Dict[str, Dict]:
        if self.global_kernel and self.is_kernel_alive():
            return {self.kernel_id: {"running": True}}
        return {}
    
    async def restart_kernel(self, kernel_id: str) -> str:
        await self.stop_kernel(kernel_id)
        return await self.start_kernel()

# Global kernel manager instance
kernel_manager = KernelManager()