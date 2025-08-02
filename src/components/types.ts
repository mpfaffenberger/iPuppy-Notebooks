export type NotebookCell = {
  cell_type: 'code' | 'markdown';
  source: string[];
  outputs?: string[];
};

export type KernelStatus = 'idle' | 'running' | 'error';