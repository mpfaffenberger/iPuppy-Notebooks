import React from 'react';
import { Box, Card, CardContent, Typography, Button, IconButton, TextField, InputAdornment } from '@mui/material';
import { PlayArrow, Delete, Add, Send, ClearAll } from '@mui/icons-material';

interface SidebarProps {
  notebooks: string[];
  newNotebookName: string;
  onNewNotebookNameChange: (name: string) => void;
  onCreateNotebook: () => void;
  onOpenNotebook: (name: string) => void;
  onDeleteNotebook: (name: string) => void;
  agentMessages: Array<{role: 'user' | 'agent', message: string, timestamp: number}>;
  onSendMessageToAgent: (message: string) => void;
  agentLoading: boolean;
  onClearConversationHistory?: () => void;
  currentNotebook?: string | null;
}

export const Sidebar = ({
  notebooks,
  newNotebookName,
  onNewNotebookNameChange,
  onCreateNotebook,
  onOpenNotebook,
  onDeleteNotebook,
  agentMessages,
  onSendMessageToAgent,
  agentLoading,
  onClearConversationHistory,
  currentNotebook
}: SidebarProps) => {
  const [chatInput, setChatInput] = React.useState('');
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [agentMessages]);

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    
    onSendMessageToAgent(chatInput);
    setChatInput('');
  };

  return (
    <Box sx={{ width: '400px', flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Notebook list */}
      <Card sx={{ maxHeight: '300px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ pb: 1 }}>
          <Typography variant="h5" gutterBottom>notebooks</Typography>
        </CardContent>
        <Box sx={{ flex: 1, overflow: 'auto', px: 2 }}>
          {notebooks.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>no notebooks yet</Typography>
          ) : (
            notebooks.map((nb) => (
              <Box
                key={nb}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 1,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography
                  sx={{ cursor: 'pointer' }}
                  onClick={() => onOpenNotebook(nb)}
                >
                  {nb}
                </Typography>
                <Box>
                  <IconButton size="small" sx={{ color: '#a1a1aa', '&:hover': { color: '#d4d4d8' } }} onClick={() => onOpenNotebook(nb)}>
                    <PlayArrow fontSize="small" />
                  </IconButton>
                  <IconButton size="small" sx={{ color: '#71717a', '&:hover': { color: '#a1a1aa' } }} onClick={() => onDeleteNotebook(nb)}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            ))
          )}
        </Box>
        <CardContent sx={{ pt: 1 }}>
          {/* Create notebook */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <input
              value={newNotebookName}
              onChange={(e) => onNewNotebookNameChange(e.target.value)}
              placeholder="notebook name"
              style={{ 
                flex: 1, 
                padding: '8px 12px', 
                borderRadius: '6px', 
                border: '1px solid #3f3f46', 
                background: '#18181b', 
                color: '#d4d4d8',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.875rem'
              }}
            />
            <Button 
              variant="contained" 
              startIcon={<Add />} 
              onClick={onCreateNotebook} 
              sx={{ 
                backgroundColor: '#3f3f46', 
                '&:hover': { backgroundColor: '#52525b' },
                color: '#d4d4d8'
              }}
            >
              create
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Puppy Scientist Agent */}
      <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <CardContent sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 0 }}>🐶 puppy scientist</Typography>
            {currentNotebook && onClearConversationHistory && (
              <IconButton 
                size="small" 
                onClick={onClearConversationHistory}
                title="Clear conversation history"
                sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
              >
                <ClearAll fontSize="small" />
              </IconButton>
            )}
          </Box>
        </CardContent>
        
        {/* Chat Messages */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'auto', 
          px: 2, 
          display: 'flex', 
          flexDirection: 'column',
          gap: 1,
          maxHeight: 'calc(100% - 120px)'
        }}>
          {agentMessages.map((msg, idx) => (
            <Box
              key={idx}
              sx={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                backgroundColor: msg.role === 'user' ? '#3f3f46' : '#27272a',
                color: '#d4d4d8',
                p: 1.5,
                borderRadius: '8px',
                maxWidth: '85%',
                fontSize: '0.875rem'
              }}
            >
              <Typography variant="body2">
                {msg.message}
              </Typography>
            </Box>
          ))}
          <div ref={messagesEndRef} />
        </Box>
        
        {/* Chat Input */}
        <CardContent sx={{ pt: 1 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="ask puppy scientist..."
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#18181b',
                  color: '#d4d4d8',
                  fontSize: '0.875rem',
                  fontFamily: '"JetBrains Mono", monospace',
                  '& fieldset': {
                    borderColor: '#3f3f46',
                  },
                  '&:hover fieldset': {
                    borderColor: '#52525b',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#71717a',
                  },
                },
                '& .MuiInputBase-input::placeholder': {
                  color: '#71717a',
                  opacity: 1,
                },
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton 
                      size="small" 
                      onClick={handleSendMessage}
                      disabled={!chatInput.trim() || agentLoading}
                      sx={{ 
                        color: (chatInput.trim() && !agentLoading) ? '#d4d4d8' : '#71717a',
                        '&:hover': { color: '#d4d4d8' }
                      }}
                    >
                      <Send fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </CardContent>
      </Card>

    </Box>
  );
};