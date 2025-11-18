import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import ToolDrawer from './ToolDrawer';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function App() {
  const [selectedTool, setSelectedTool] = useState(null);

  const handleSelectTool = (tool) => {
    setSelectedTool(tool);
  };

  const getToolUrl = (tool) => {
      if (!tool) return null;
      // Assuming the tools are now served from the public directory
      return `${tool.path}${tool.name}.html`;
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          <Toolbar>
            <Typography variant="h6" noWrap component="div">
              {selectedTool ? (selectedTool.displayName || selectedTool.name) : 'MtgToolBox'}
            </Typography>
          </Toolbar>
        </AppBar>
        <ToolDrawer onSelectTool={handleSelectTool} />
        <Box component="main" sx={{ flexGrow: 1, p: 3, display: 'flex', flexDirection: 'column' }}>
          <Toolbar /> 
          {selectedTool ? (
            <iframe 
                src={getToolUrl(selectedTool)}
                title={selectedTool.name}
                style={{ width: '100%', height: '100%', border: 'none' }}
            />
          ) : (
            <Typography paragraph>
              Select a tool from the left menu to get started.
            </Typography>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
