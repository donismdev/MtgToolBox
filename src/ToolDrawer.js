import React, { useEffect, useState, useRef } from 'react';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import SettingsIcon from '@mui/icons-material/Settings';
import MailIcon from '@mui/icons-material/Mail';
import i18n from './i18n';
import clsx from 'clsx';

const ToolDrawer = ({ open, onClose, onSelectTool, isMobile, width, onLanguageChange }) => {
  const [tools, setTools] = useState({});
  const [openCategories, setOpenCategories] = useState({});
  const [languages, setLanguages] = useState([]);
  const [isLangMenuOpen, setLangMenuOpen] = useState(false);
  const [lang, setLang] = useState(i18n.lang);
  const langMenuRef = useRef(null);

  useEffect(() => {
    i18n.init().then(() => {
      setLang(i18n.lang);
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
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [langMenuRef]);

  const handleCategoryClick = (category) => {
    setOpenCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const handleLanguageMenuClick = () => {
    setLangMenuOpen(!isLangMenuOpen);
  };

  const handleLanguageSelect = (langCode) => {
    i18n.setLang(langCode);
    setLang(langCode);
    setLangMenuOpen(false);
    onLanguageChange();
  };

  const getDisplayName = (tool) => i18n.t('toolNames', tool.name) || tool.displayName || tool.name;

  const drawerContent = (
    <div className="flex flex-col h-full bg-gray-800 text-white">
      <div className="h-16" /> {/* Toolbar Spacer */}
      <div className="flex-grow overflow-y-auto">
        <nav>
          {Object.entries(tools).map(([category, toolList]) => (
            <div key={category}>
              <button
                onClick={() => handleCategoryClick(category)}
                className="w-full flex justify-between items-center p-4 hover:bg-gray-700"
              >
                <span>{category}</span>
                {openCategories[category] ? <ExpandLess /> : <ExpandMore />}
              </button>
              <div
                className={clsx('transition-all duration-300 overflow-hidden', {
                  'max-h-0': !openCategories[category],
                  'max-h-screen': openCategories[category],
                })}
              >
                <ul className="pl-4">
                  {toolList.map((tool) => (
                    <li key={tool.name}>
                      <button
                        onClick={() => onSelectTool(tool)}
                        className="w-full text-left p-4 pl-8 hover:bg-gray-700"
                      >
                        {getDisplayName(tool)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </nav>
      </div>
      <div className="relative" ref={langMenuRef}>
        <hr className="border-gray-600"/>
        {isLangMenuOpen && (
            <div className="absolute bottom-full mb-2 w-full bg-gray-700 rounded-md shadow-lg">
                <div className="p-2 font-bold text-sm text-gray-400">{i18n.t('drawer', 'languageSettings')}</div>
                <ul>
                    {languages.map((lang) => (
                        <li key={lang.code}>
                            <button onClick={() => handleLanguageSelect(lang.code)} className="w-full text-left px-4 py-2 hover:bg-gray-600">
                                {lang.name}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        )}
        <ul>
          <li>
            <button onClick={handleLanguageMenuClick} className="w-full flex items-center p-4 hover:bg-gray-700">
              <SettingsIcon className="mr-4" />
              <span>{i18n.t('drawer', 'settings')}</span>
            </button>
          </li>
          <li>
            <a href="mailto:arjson@gmail.com" className="w-full flex items-center p-4 hover:bg-gray-700">
              <MailIcon className="mr-4" />
              <span>{i18n.t('drawer', 'sendMail')}</span>
            </a>
          </li>
        </ul>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && open && <div className="fixed inset-0 bg-black bg-opacity-50 z-30" onClick={onClose}></div>}
      
      <aside
        className={clsx(
          'fixed top-0 left-0 h-full z-40 transition-transform duration-300 ease-in-out',
          'bg-gray-800',
          {
            'translate-x-0': open,
            '-translate-x-full': !open,
          }
        )}
        style={{ width: width }}
      >
        {drawerContent}
      </aside>
    </>
  );
};

export default ToolDrawer;
