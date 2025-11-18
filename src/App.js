import React, { useState } from 'react';
import { ThemeProvider, createTheme, styled, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import CssBaseline from '@mui/material/CssBaseline';
import MuiAppBar from '@mui/material/AppBar';
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

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open, isMobile }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: `-${drawerWidth}px`,
    ...((open && !isMobile) && {
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: 0,
    }),
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
  }),
);

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open, isMobile }) => ({
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...((open && !isMobile) && {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: `${drawerWidth}px`,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));


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
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        <AppBar position="fixed" open={isDrawerOpen} isMobile={isMobile}>
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
        <Main open={isDrawerOpen} isMobile={isMobile}>
          <Toolbar /> 
          {selectedTool ? (
            <iframe 
                src={getToolUrl(selectedTool)}
                title={selectedTool.name}
                style={{ width: '100%', height: '100%', border: 'none', flexGrow: 1 }}
            />
          ) : (
            <Typography paragraph>
              Select a tool from the left menu to get started.
            </Typography>
          )}
        </Main>
      </Box>
    </ThemeProvider>
  );
}

export default App;
