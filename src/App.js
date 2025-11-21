import React, { useState, useRef, useEffect } from 'react';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ImageIcon from '@mui/icons-material/Image';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import ToolDrawer from './ToolDrawer';
import clsx from 'clsx';

const drawerWidth = 240;

// Custom hook for managing dark mode
const useDarkMode = () => {
    const [isDarkMode, setDarkMode] = useState(() => {
        const savedMode = localStorage.getItem('darkMode');
        return savedMode ? JSON.parse(savedMode) : true;
    });

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    }, [isDarkMode]);

    return [isDarkMode, setDarkMode];
};


function App() {
  const [selectedTool, setSelectedTool] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [isDrawerOpen, setDrawerOpen] = useState(!isMobile);
  const [isAppBarVisible, setAppBarVisible] = useState(true);
  const [isImageVisible, setImageVisible] = useState(false);
  const [isDarkMode, setDarkMode] = useDarkMode();
  const [mainCss, setMainCss] = useState('');
  const iframeRef = useRef(null);

  useEffect(() => {
    // Fetch the main CSS file content to inject into iframes
    fetch('./main.css')
      .then(response => response.text())
      .then(text => setMainCss(text))
      .catch(err => console.error("Failed to fetch main.css", err));
  }, []);
  
  // Propagate theme changes to iframe
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage({ theme: isDarkMode ? 'dark' : 'light' }, '*');
    }
  }, [isDarkMode, selectedTool]); // re-send on tool change

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 640;
      setIsMobile(mobile);
      if (!mobile) {
        setDrawerOpen(true);
      } else {
        setDrawerOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSelectTool = (tool) => {
    setSelectedTool(tool);
    if (isMobile) {
      setDrawerOpen(false);
    }
  };

  const handleLanguageChange = () => {
    if (iframeRef.current) {
      // Reload the iframe to apply the new language from localStorage
      iframeRef.current.src = iframeRef.current.src;
    }
  };
  
  const handleIframeLoad = () => {
      if (iframeRef.current && iframeRef.current.contentWindow && mainCss) {
        const iframeDoc = iframeRef.current.contentDocument;
        const style = iframeDoc.createElement('style');
        style.textContent = mainCss;
        iframeDoc.head.appendChild(style);

        // Re-apply theme after styles are injected
        iframeRef.current.contentWindow.postMessage({ theme: isDarkMode ? 'dark' : 'light' }, '*');
      }
  }

  const getToolUrl = (tool) => {
      if (!tool) return null;
      return `${tool.path}${tool.name}.html`;
  }

  return (
    <div className={clsx("flex text-gray-900", isDarkMode ? "dark bg-gray-900 text-gray-100" : "bg-gray-100 text-gray-900")}>
      {!isAppBarVisible && (
        <button
          onClick={() => setAppBarVisible(true)}
          className={clsx(
            'fixed top-2 left-2 z-50 p-2 rounded-full bg-gray-800 text-white hover:bg-gray-700',
            isDrawerOpen && !isMobile && 'md:ml-[240px]'
            )}
        >
          <VisibilityIcon />
        </button>
      )}
      {isAppBarVisible && (
        <header
          className={clsx(
            'fixed top-0 left-0 right-0 z-30 transition-all duration-300 ease-in-out',
            isDrawerOpen && !isMobile && `md:ml-[${drawerWidth}px] md:w-[calc(100%-${drawerWidth}px)]`
          )}
        >
          <div className="bg-gray-800 text-white flex items-center px-4 h-16">
            <button
              aria-label="toggle drawer"
              onClick={() => setDrawerOpen(!isDrawerOpen)}
              className="mr-2 p-2 rounded-full hover:bg-gray-700"
            >
              <CompareArrowsIcon />
            </button>
            <h1 className="text-xl font-bold truncate flex-grow">
              {selectedTool ? (selectedTool.displayName || selectedTool.name) : 'MtgToolBox'}
              <span className="text-sm font-normal ml-2 text-gray-400">[v10]</span>
            </h1>
            <button
              aria-label="toggle image"
              onClick={() => setImageVisible(!isImageVisible)}
              className="ml-2 p-2 rounded-full hover:bg-gray-700"
            >
              <ImageIcon />
            </button>
            <button
              aria-label="toggle theme"
              onClick={() => setDarkMode(!isDarkMode)}
              className="ml-2 p-2 rounded-full hover:bg-gray-700"
            >
              {isDarkMode ? <Brightness7Icon /> : <Brightness4Icon />}
            </button>
            <button
              aria-label="toggle app bar"
              onClick={() => setAppBarVisible(false)}
              className="ml-2 p-2 rounded-full hover:bg-gray-700"
            >
              <VisibilityOffIcon />
            </button>
          </div>
        </header>
      )}
      <ToolDrawer 
        width={drawerWidth}
        open={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSelectTool={handleSelectTool}
        isMobile={isMobile}
        onLanguageChange={handleLanguageChange}
      />
      <main
        className={clsx(
          'flex-grow p-3 transition-all duration-300 ease-in-out flex flex-col h-screen',
          'ml-0',
          isDrawerOpen && !isMobile && `md:ml-[${drawerWidth}px]`
        )}
      >
        {isAppBarVisible && <div className="h-16" />} {/* Spacer for toolbar */}
        {isImageVisible && (
            <div className="p-4 bg-gray-200 dark:bg-gray-700 rounded-md mb-4">
                <img src="https://cards.scryfall.io/large/front/a/3/a3fb759e-e8b5-4f36-a51c-42de60d4e30b.jpg?1562917294" alt="Black Lotus" className="mx-auto max-h-64"/>
            </div>
        )}
        {selectedTool ? (
          <iframe 
              ref={iframeRef}
              src={getToolUrl(selectedTool)}
              title={selectedTool.name}
              onLoad={handleIframeLoad}
              className="w-full h-full border-none flex-grow"
          />
        ) : (
          <p>
            Select a tool from the left menu to get started.
          </p>
        )}
      </main>
    </div>
  );
}

export default App;
