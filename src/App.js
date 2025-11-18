import React, { useState } from 'react';
import { ThemeProvider, createTheme, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import CssBaseline from '@mui/material/CssBaseline';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import ToolDrawer from './ToolDrawer';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

const drawerWidth = 240;

function App() {
  const [selectedTool, setSelectedTool] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isDrawerOpen, setDrawerOpen] = useState(!isMobile);

  const handleSelectTool = (tool) => {
    setSelectedTool(tool);
    if (isMobile) {
      setDrawerOpen(false);
    }
  };

  const getToolUrl = (tool) => {
      if (!tool) return null;
      return `${tool.path}${tool.name}.html`;
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <AppBar 
          position="fixed" 
          sx={{ 
            zIndex: (theme) => theme.zIndex.drawer + 1,
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="toggle drawer"
              edge="start"
              onClick={() => setDrawerOpen(!isDrawerOpen)}
              sx={{ mr: 2 }}
            >
              <CompareArrowsIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div">
              {selectedTool ? (selectedTool.displayName || selectedTool.name) : 'MtgToolBox'}
            </Typography>
          </Toolbar>
        </AppBar>
        <ToolDrawer 
          width={drawerWidth}
          open={isDrawerOpen}
          onClose={() => setDrawerOpen(false)}
          onSelectTool={handleSelectTool}
          isMobile={isMobile}
        />
        <Box 
          component="main" 
          sx={{ 
            flexGrow: 1, 
            p: 3, 
            display: 'flex', 
            flexDirection: 'column',
          }}
        >
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
