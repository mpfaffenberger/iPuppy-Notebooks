// Main JavaScript for iPuppy Notebooks

let currentKernelId = null;

document.addEventListener('DOMContentLoaded', function() {
    // Add any global initialization code here
});

// Utility function to show alerts
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) return;
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    alertContainer.appendChild(alertDiv);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 5000);
}

// Utility function to make API requests
async function apiRequest(url, method = 'GET', body = null) {
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        showAlert(`Error: ${error.message}`, 'danger');
        throw error;
    }
}

// Kernel management functions
async function startKernel() {
    try {
        const response = await apiRequest('/kernels', 'POST');
        currentKernelId = response.kernel_id;
        
        const status = document.getElementById('kernel-status');
        status.textContent = 'Running';
        status.className = 'kernel-status running';
        
        showAlert('Kernel started successfully', 'success');
    } catch (error) {
        console.error('Failed to start kernel:', error);
        showAlert(`Failed to start kernel: ${error.message}`, 'danger');
    }
}

async function stopKernel() {
    if (!currentKernelId) {
        showAlert('No kernel is currently running', 'warning');
        return;
    }
    
    try {
        const response = await apiRequest(`/kernels/${currentKernelId}`, 'DELETE');
        currentKernelId = null;
        
        const status = document.getElementById('kernel-status');
        status.textContent = 'Idle';
        status.className = 'kernel-status idle';
        
        showAlert('Kernel stopped successfully', 'info');
    } catch (error) {
        console.error('Failed to stop kernel:', error);
        showAlert(`Failed to stop kernel: ${error.message}`, 'danger');
    }
}

async function executeCode(code) {
    if (!currentKernelId) {
        showAlert('Please start a kernel first', 'warning');
        return null;
    }
    
    try {
        const response = await apiRequest(`/kernels/${currentKernelId}/execute`, 'POST', {code: code});
        return response.outputs;
    } catch (error) {
        console.error('Failed to execute code:', error);
        showAlert(`Failed to execute code: ${error.message}`, 'danger');
        return null;
    }
}

async function saveNotebook(notebookName, content) {
    try {
        const response = await apiRequest(`/notebooks/${notebookName}`, 'PUT', content);
        return response;
    } catch (error) {
        console.error('Failed to save notebook:', error);
        showAlert(`Failed to save notebook: ${error.message}`, 'danger');
        throw error;
    }
}