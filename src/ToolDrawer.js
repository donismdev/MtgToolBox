import React, { useEffect, useState } from 'react';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Collapse from '@mui/material/Collapse';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Divider from '@mui/material/Divider';
import SettingsIcon from '@mui/icons-material/Settings';
import MailIcon from '@mui/icons-material/Mail';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListSubheader from '@mui/material/ListSubheader';
import i18n from './i18n';

const ToolDrawer = ({ open, onClose, onSelectTool, isMobile, width, onLanguageChange }) => {
  const [tools, setTools] = useState({});
  const [openCategories, setOpenCategories] = useState({});
  const [languages, setLanguages] = useState([]);
  const [languageMenuAnchor, setLanguageMenuAnchor] = useState(null);
  const [lang, setLang] = useState(i18n.lang);

  useEffect(() => {
    i18n.init().then(() => {
      setLang(i18n.lang);
      // After i18n is ready, fetch the languages to display in the menu
      setLanguages(i18n.languages || []);
    });

    fetch('tool_index.json')
      .then((res) => res.json())
      .then((data) => {
        const enabledTools = data.tools.filter((tool) => tool.enable && (tool.type.includes('html') || tool.type.includes('html_modal')));
        const toolsByCategory = enabledTools.reduce((acc, tool) => {
          const category = tool.parent || 'ETC';
          if (!acc[category]) acc[category] = [];
          acc[category].push(tool);
          return acc;
        }, {});

        const sortedTools = {};
        data.category_order.forEach(category => {
            if (toolsByCategory[category]) sortedTools[category] = toolsByCategory[category];
        });
        Object.keys(toolsByCategory).forEach(category => {
            if (!sortedTools[category]) sortedTools[category] = toolsByCategory[category];
        });

        setTools(sortedTools);
        const initialOpenState = Object.keys(sortedTools).reduce((acc, category) => {
            acc[category] = true;
            return acc;
        }, {});
        setOpenCategories(initialOpenState);
      });
  }, []);

  const handleCategoryClick = (category) => {
    setOpenCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const handleLanguageMenuClick = (event) => {
    setLanguageMenuAnchor(event.currentTarget);
  };

  const handleLanguageMenuClose = () => {
    setLanguageMenuAnchor(null);
  };

  const handleLanguageSelect = (langCode) => {
    i18n.setLang(langCode);
    setLang(langCode);
    handleLanguageMenuClose();
    onLanguageChange();
  };

  const getDisplayName = (tool) => i18n.t('toolNames', tool.name) || tool.displayName || tool.name;

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar />
      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
        <List>
          {Object.entries(tools).map(([category, toolList]) => (
            <React.Fragment key={category}>
              <ListItemButton onClick={() => handleCategoryClick(category)}>
                <ListItemText primary={category} />
                {openCategories[category] ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              <Collapse in={openCategories[category]} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {toolList.map((tool) => (
                    <ListItem key={tool.name} disablePadding sx={{ pl: 4 }}>
                      <ListItemButton onClick={() => onSelectTool(tool)}>
                        <ListItemText primary={getDisplayName(tool)} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            </React.Fragment>
          ))}
        </List>
      </Box>
      <Box>
        <Divider />
        <List>
          <ListItemButton onClick={handleLanguageMenuClick}>
            <ListItemIcon><SettingsIcon /></ListItemIcon>
            <ListItemText primary={i18n.t('drawer', 'settings')} />
          </ListItemButton>
          <Menu
            anchorEl={languageMenuAnchor}
            open={Boolean(languageMenuAnchor)}
            onClose={handleLanguageMenuClose}
          >
            <ListSubheader>{i18n.t('drawer', 'languageSettings')}</ListSubheader>
            {languages.map((lang) => (
              <MenuItem key={lang.code} onClick={() => handleLanguageSelect(lang.code)}>
                {lang.name}
              </MenuItem>
            ))}
          </Menu>
          <ListItemButton>
            <ListItemIcon><MailIcon /></ListItemIcon>
            <ListItemText primary={i18n.t('drawer', 'sendMail')} />
          </ListItemButton>
        </List>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'persistent'}
      open={open}
      onClose={onClose}
      sx={{
        width: width,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: width, boxSizing: 'border-box' },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default ToolDrawer;
