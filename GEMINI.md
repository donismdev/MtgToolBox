# Gemini Code Assistant Context

## About This Project: MtgToolBox

MtgToolBox is a web-based collection of utilities for Magic: The Gathering (MTG) players. The main application is a single-page interface, built with **React**, that acts as a launcher for various tools. These tools are standalone HTML/JS applications loaded into iframes.

The project has recently undergone a major refactoring to adopt a more mdodern tech stack and a modular architecture.

## Technologies Used

-   **Main Application:** React (v18), JavaScript (ES6+)
-   **Styling:** Tailwind CSS (via CDN for tools, integrated into build for the main app)
-   **Build Tool:** Webpack
-   **Development Server:** Webpack Dev Server
-   **Tooling/Scripting:** Python

## Project Structure

The project is divided into a main React application shell and a collection of individual tools.

```
.
├── src/                    # Main React application source
│   ├── App.js              # The main app component (layout, toolbar, etc.)
│   └── index.js            # React entry point
├── public/
│   └── index.html          # HTML template for the React app
├── tools/
│   ├── [tool-name]/        # Each subdirectory is a self-contained tool
│   │   ├── [tool-name].html  # The entry point for the tool
│   │   └── js/
│   │       └── main.js       # (New Standard) Logic for the tool
│   └── ...
├── webpack.config.js       # Webpack configuration
├── package.json            # Project dependencies and scripts
└── ...
```

## Development Workflow

### Running the Project

The project now uses a Webpack development server. To run the project locally, use the `npm start` command, or the provided Python wrapper script:

```bash
# Recommended
npm start

# Or using the Python wrapper
python server_npm.py
```

This will start the dev server on `http://localhost:3000` and automatically handle rebuilding the application and reloading the browser when changes are made to the `src` or `tools` directories.

## Tool Architecture and Modularization

To improve maintainability and address issues with large file sizes, the tools are being refactored into a modular structure.

**Standard Tool Structure:**

-   **`[tool-name].html`**: A minimal HTML file containing only the structural elements of the tool.
-   **`js/main.js`**: A JavaScript file containing all the logic, DOM manipulation, and event handling for the tool.
-   **Styling**: Styling is handled exclusively by **Tailwind CSS**. The necessary scripts to enable Tailwind via CDN and to listen for the global dark/light theme are included in the `<head>` of the HTML file.

### Modularization & Localization Status

-   ✅ **game-puzzle-match**:
    -   **Status:** Modularized & Converted to Tailwind.
    -   **Localization:** ✅ Implemented.

-   ✅ **etc-poker**:
    -   **Status:** Modularized & Converted to Tailwind.
    -   **Localization:** ✅ Implemented.

-   ✅ **etc-blackjack**:
    -   **Status:** Modularized & Converted to Tailwind.
    -   **Localization:** ✅ Implemented.

-   ✅ **mtg-ability-finder**:
    -   **Status:** Modularized & Converted to Tailwind.
    -   **Localization:** ✅ Implemented.

-   ✅ **etc-mighty-helper**:
    -   **Status:** Modularized & Converted to Tailwind.
    -   **Localization:** ✅ Implemented.

-   ✅ **mtg-random-card**:
    -   **Status:** Modularized & Converted to Tailwind.
    -   **Localization:** ✅ Implemented.
        
-   ✅ **mtg-dungeons**:
    -   **Status:** Modularized & Converted to Tailwind.
    -   **Localization:** ✅ Implemented.

-   ✅ **mtg-garth-tool**:
    -   **Status:** Modularized & Converted to Tailwind.
    -   **Localization:** ✅ Implemented.

-   ✅ **etc-lotto**:
    -   **Status:** Modularized & Converted to Tailwind.
    -   **Localization:** ✅ Implemented.

-   ✅ **game-sudoku**:
    -   **Status:** Modularized & Converted to Tailwind.
    -   **Localization:** ✅ Implemented.

-   ✅ **etc-thegang-helper**:
    -   **Status:** Modularized & Converted to Tailwind.
    -   **Localization:** ✅ Implemented.

-   ✅ **mtg-urza-tool**:
    -   **Status:** Modularized & Converted to Tailwind.
    -   **Localization:** ✅ Implemented.

-   ✅ **swiss-round-tool**:
    -   **Status:** Modularized & Converted to Tailwind.
    -   **Localization:** ✅ Implemented.

-   ✅ **misc-dice**:
    -   **Status:** Modularized & Converted to Tailwind.
    -   **Localization:** ✅ Implemented.

-   ✅ **swiss-round-viewer**:
    -   **Status:** Modularized & Converted to Tailwind.
    -   **Localization:** ✅ Implemented.

-   ❌ **mtg-archenemy-tool**:
    -   **Status:** Pending.
    -   **Localization:** ✅ Implemented.
    -   **Notes:** Skipped for now due to high complexity.

-   ❌ **mtg-life-counter**:
    -   **Status:** Pending.
    -   **Localization:** ✅ Implemented.
    -   **Notes:** Skipped for now due to high complexity.

-   ❌ **cardkingdom-order-sorter**:
    -   **Status:** Pending.
    -   **Localization:** ❌ Pending.
    -   **Notes:** Skipped for now due to file read errors.
