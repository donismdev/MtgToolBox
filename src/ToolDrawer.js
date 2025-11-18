import React, { useEffect, useState } from 'react';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Collapse from '@mui/material/Collapse';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Box from '@mui/material/Box';

const ToolDrawer = ({ onSelectTool }) => {
  const [tools, setTools] = useState({});
  const [openCategories, setOpenCategories] = useState({});

  useEffect(() => {
    fetch('/tool_index.json')
      .then((res) => res.json())
      .then((data) => {
        const enabledTools = data.tools.filter((tool) => tool.enable);
        const toolsByCategory = enabledTools.reduce((acc, tool) => {
          const category = tool.parent || 'ETC';
          if (!acc[category]) {
            acc[category] = [];
          }
          acc[category].push(tool);
          return acc;
        }, {});

        const sortedTools = {};
        data.category_order.forEach(category => {
            if (toolsByCategory[category]) {
                sortedTools[category] = toolsByCategory[category];
            }
        });

        // Add any remaining categories not in category_order
        Object.keys(toolsByCategory).forEach(category => {
            if (!sortedTools[category]) {
                sortedTools[category] = toolsByCategory[category];
            }
        });

        setTools(sortedTools);
        // Initially open all categories
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

  const getDisplayName = (tool) => tool.displayName || tool.name;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: 240, boxSizing: 'border-box', position: 'relative' },
      }}
    >
        <Box sx={{ overflow: 'auto' }}>
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
    </Drawer>
  );
};

export default ToolDrawer;
