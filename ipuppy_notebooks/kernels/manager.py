import asyncio
import json
import os
import signal
import subprocess
import tempfile
import uuid
from pathlib import Path
from typing import Dict, Optional


class KernelManager:
    def __init__(self):
        self.kernels: Dict[str, Dict] = {}
        self.base_dir = Path("kernels")
        self.base_dir.mkdir(exist_ok=True)
    
    async def start_kernel(self, kernel_id: Optional[str] = None) -> str:
        if kernel_id is None:
            kernel_id = str(uuid.uuid4())
        
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
            
            self.kernels[kernel_id] = {
                "process": process,
                "connection_file": connection_file,
                "connection_info": connection_info
            }
            
            return kernel_id
        except Exception as e:
            # Clean up connection file if it was created
            if connection_file.exists():
                try:
                    connection_file.unlink()
                except:
                    pass
            raise Exception(f"Failed to start kernel: {str(e)}")
    
    async def stop_kernel(self, kernel_id: str) -> bool:
        if kernel_id not in self.kernels:
            return False
        
        kernel = self.kernels[kernel_id]
        process = kernel["process"]
        
        try:
            # Try graceful shutdown first
            process.send_signal(signal.SIGINT)
            
            # Wait for process to terminate
            for _ in range(50):  # Try for 5 seconds
                if process.poll() is not None:
                    break
                await asyncio.sleep(0.1)
            
            # Force kill if still running
            if process.poll() is None:
                process.kill()
                process.wait(timeout=5)
            
            # Remove connection file
            if kernel["connection_file"].exists():
                kernel["connection_file"].unlink()
            
            # Remove from kernels dict
            del self.kernels[kernel_id]
            
            return True
        except Exception as e:
            # Force cleanup even if stop failed
            try:
                if process.poll() is None:
                    process.kill()
                    process.wait(timeout=2)
            except:
                pass
            
            # Remove connection file if exists
            try:
                if kernel["connection_file"].exists():
                    kernel["connection_file"].unlink()
            except:
                pass
            
            # Remove from kernels dict
            if kernel_id in self.kernels:
                del self.kernels[kernel_id]
            
            raise Exception(f"Failed to stop kernel: {str(e)}")
    
    def get_kernel_info(self, kernel_id: str) -> Optional[Dict]:
        return self.kernels.get(kernel_id)
    
    def list_kernels(self) -> Dict[str, Dict]:
        return {kid: {"running": True} for kid in self.kernels.keys()}
    
    async def restart_kernel(self, kernel_id: str) -> str:
        await self.stop_kernel(kernel_id)
        return await self.start_kernel(kernel_id)

# Global kernel manager instance
kernel_manager = KernelManager()