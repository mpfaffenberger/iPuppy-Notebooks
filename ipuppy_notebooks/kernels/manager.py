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
        self._startup_task = None
    
    async def ensure_kernel_running(self) -> str:
        """Ensure the global kernel is running, start it if not"""
        if self.global_kernel and self.is_kernel_alive():
            return self.kernel_id
        
        logger.info("Global kernel not running, starting...")
        return await self._start_kernel_process()
    
    async def _start_kernel_process(self) -> str:
        """Internal method to start the kernel process"""
        # Clean up any existing kernel first
        if self.global_kernel:
            await self._stop_kernel_process()
        
        # Create connection file
        connection_file = self.base_dir / f"kernel-{self.kernel_id}.json"
        
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
            
            # Initialize kernel with notebook-friendly settings
            await self._initialize_kernel_for_notebook()
            
            logger.info(f"Started global kernel: {self.kernel_id}")
            return self.kernel_id
        except Exception as e:
            # Clean up connection file if it was created
            if connection_file.exists():
                try:
                    connection_file.unlink()
                except:
                    pass
            raise Exception(f"Failed to start kernel: {str(e)}")
    
    async def _initialize_kernel_for_notebook(self):
        """Initialize the kernel with notebook-friendly settings"""
        try:
            from jupyter_client import AsyncKernelManager
            
            # Create kernel manager and client
            km = AsyncKernelManager()
            km.load_connection_info(self.global_kernel['connection_info'])
            kc = km.client()
            kc.start_channels()
            
            # Wait for kernel to be ready
            await kc.wait_for_ready(timeout=30)
            
            # Execute initialization code
            init_code = """
# Configure matplotlib for inline plotting in Jupyter
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt

# Import and configure IPython display system
from IPython import get_ipython
from IPython.display import display

# Enable inline matplotlib backend if IPython is available
ipython = get_ipython()
if ipython is not None:
    ipython.run_line_magic('matplotlib', 'inline')
    
    # Test that LaTeX display works
    from IPython.display import Math, Latex
    print("IPython display system initialized")

# Configure seaborn 
try:
    import seaborn as sns
    sns.set_theme()
except ImportError:
    pass

# Configure plotly for Jupyter notebook output
try:
    import plotly.io as pio
    import plotly.offline as pyo
    
    # Initialize notebook mode - connected=True since we have Plotly CDN loaded in HTML
    pyo.init_notebook_mode(connected=True)
    
    # Set renderer to notebook_connected since we have the CDN
    pio.renderers.default = "notebook_connected"
    
    # Ensure plotly HTML outputs include the div container
    pio.config.default_width = None
    pio.config.default_height = None
    
except ImportError:
    pass

print("Kernel initialized for inline plotting")
"""
            
            # Execute the initialization code
            msg_id = kc.execute(init_code, silent=True)
            
            # Wait for execution to complete
            execution_timeout = 10
            start_time = asyncio.get_event_loop().time()
            
            while True:
                try:
                    msg = await asyncio.wait_for(kc.get_iopub_msg(timeout=1), timeout=2)
                    if (msg['parent_header'].get('msg_id') == msg_id and 
                        msg['header']['msg_type'] == 'status' and 
                        msg['content']['execution_state'] == 'idle'):
                        break
                except asyncio.TimeoutError:
                    if asyncio.get_event_loop().time() - start_time > execution_timeout:
                        logger.warning("Kernel initialization timed out")
                        break
            
            logger.info("Kernel initialized with notebook display settings")
            
        except Exception as e:
            logger.error(f"Failed to initialize kernel for notebook: {e}")
        finally:
            try:
                kc.stop_channels()
            except:
                pass
    
    def is_kernel_alive(self) -> bool:
        """Check if the global kernel is still alive"""
        if not self.global_kernel:
            return False
        process = self.global_kernel["process"]
        return process.poll() is None

    async def reset_kernel(self) -> str:
        """Reset the global kernel (stop and restart)"""
        logger.info("Resetting global kernel...")
        await self._stop_kernel_process()
        return await self._start_kernel_process()

    async def _stop_kernel_process(self) -> bool:
        """Internal method to stop the kernel process"""
        if not self.global_kernel:
            return True
        
        kernel = self.global_kernel
        process = kernel["process"]
        
        try:
            # Check if process is already dead
            if process.poll() is not None:
                logger.info(f"Process for kernel {self.kernel_id} already terminated")
            else:
                # Try graceful shutdown first
                try:
                    process.send_signal(signal.SIGINT)
                    logger.info(f"Sent SIGINT to kernel {self.kernel_id}")
                except Exception as e:
                    logger.warning(f"Failed to send SIGINT: {e}")
                
                # Wait for process to terminate
                for i in range(50):  # Try for 5 seconds
                    if process.poll() is not None:
                        logger.info(f"Kernel {self.kernel_id} terminated gracefully after {i*0.1:.1f}s")
                        break
                    await asyncio.sleep(0.1)
                
                # Force kill if still running
                if process.poll() is None:
                    logger.warning(f"Force killing kernel {self.kernel_id}")
                    try:
                        process.kill()
                        process.wait(timeout=5)
                        logger.info(f"Kernel {self.kernel_id} force killed")
                    except Exception as e:
                        logger.error(f"Failed to force kill: {e}")
        
        except Exception as e:
            logger.error(f"Error during kernel stop: {e}")
        
        # Always try to clean up files and state
        try:
            # Remove connection file
            if kernel["connection_file"].exists():
                kernel["connection_file"].unlink()
                logger.info(f"Removed connection file for kernel {self.kernel_id}")
        except Exception as e:
            logger.warning(f"Failed to remove connection file: {e}")
        
        # Always clear global kernel
        self.global_kernel = None
        logger.info(f"Cleared global kernel")
        
        return True
    
    def get_kernel_info(self) -> Optional[Dict]:
        """Get the global kernel info if it exists and is alive"""
        if self.global_kernel and self.is_kernel_alive():
            return self.global_kernel
        return None
    
    def get_kernel_status(self) -> Dict:
        """Get the status of the global kernel"""
        if self.global_kernel and self.is_kernel_alive():
            return {"kernel_id": self.kernel_id, "status": "running"}
        else:
            return {"kernel_id": None, "status": "idle"}
    
    def get_kernel_id(self) -> str:
        """Always return the global kernel ID"""
        return self.kernel_id

    async def startup(self):
        """Start the global kernel on application startup"""
        try:
            await self.ensure_kernel_running()
            logger.info("Global kernel startup completed successfully")
        except Exception as e:
            logger.error(f"Failed to start global kernel on startup: {e}")

    async def shutdown(self):
        """Shutdown the global kernel on application shutdown"""
        try:
            await self._stop_kernel_process()
            logger.info("Global kernel shutdown completed")
        except Exception as e:
            logger.error(f"Error during global kernel shutdown: {e}")

# Global kernel manager instance
kernel_manager = KernelManager()