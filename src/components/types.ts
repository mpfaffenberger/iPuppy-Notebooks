export type NotebookCellOutput =
  | string
  | {
      output_type: 'stream';
      name: string;
      text: string;
    }
  | {
      output_type: 'execute_result';
      data: Record<string, any>;
      execution_count: number;
      text?: string;
    }
  | {
      output_type: 'display_data';
      data: Record<string, any>;
      metadata: Record<string, any>;
      text?: string;
    }
  | {
      output_type: 'error';
      ename: string;
      evalue: string;
      traceback: string[];
      text: string;
    };

export type NotebookCell = {
  cell_type: 'code' | 'markdown';
  source: string[];
  outputs?: NotebookCellOutput[];
};

export type KernelStatus = 'idle' | 'running' | 'error';