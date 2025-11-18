# Gemini Code Assistant Context

## About This Project: MtgToolBox

MtgToolBox is a web-based collection of utilities for Magic: The Gathering (MTG) players. The main application is a single-page interface that acts as a launcher for various tools. These tools help with different aspects of the game, such as tracking life totals, managing card collections, and assisting with specific in-game mechanics like Archenemy or Dungeons.

The project is primarily built with vanilla HTML, CSS, and JavaScript, using Bootstrap for styling. It also includes a local development server and some build scripts written in Python.

## Technologies Used

-   **Frontend:** HTML5, CSS3, JavaScript (ES6+)
-   **Styling:** Bootstrap 5
-   **Development Server:** Python (`http.server`)
-   **Tooling/Scripting:** Python
-   **Specific Tools:** Most tools are standalone HTML/JS applications. One tool, `gui-card-manager`, is a desktop application written in Python.

## Project Structure

```
.
├── index.html              # Main application shell and launcher
├── assets/
│   ├── main.js             # Core application logic (tool loading, UI)
│   └── style.css           # Global styles
├── tools/
│   ├── [tool-name]/        # Each subdirectory is a self-contained tool
│   │   └── [tool-name].html  # The entry point for the tool
│   └── ...
├── server_on.py            # Starts a local development server
├── build_project.py        # Script to package the `gui-card-manager` tool
└── ...
```

## Development Workflow

### Running the Project

To run the project locally for development and testing, use the provided Python server:

```bash
python server_on.py
```

This will start a web server on `http://localhost:8000` (or the next available port) and automatically open the application in your default web browser.

### Adding a New Web Tool

1.  Create a new directory for your tool under the `tools/` directory (e.g., `tools/my-new-tool/`).
2.  Inside the new directory, create the main HTML file for your tool (e.g., `my-new-tool.html`).
3.  The main application (`assets/main.js`) dynamically finds tools by scanning the `tools` directory and populates the tool selection menu. Ensure your tool's HTML file is correctly placed.
4.  Add any necessary assets (CSS, JS, images) for your tool within its own directory.

### Building the Python GUI Tool

The `gui-card-manager` is a Python application. A build script is provided to package it.

```bash
python build_project.py
```

This command creates a zip archive of the tool in its directory.

## Code Style and Conventions

-   **Language:** The user interface, comments, and documentation are primarily in **Korean**. Please adhere to this convention.
-   **Modularity:** Each tool in the `tools/` directory should be as self-contained as possible.
-   **Dependencies:** For web tools, prefer CDN links for common libraries (like Bootstrap) where possible, or include them as local assets if necessary. The Python tool has its dependencies listed in `requirements.txt`.
-   **Naming:** Tool directories and their corresponding HTML files should share the same name (e.g., `misc-dice/misc-dice.html`).

## Tool Loading and Structure

The application loads tools dynamically based on the configuration in `tool_index.json`. The `assets/main.js` script fetches this file on startup, filters for enabled tools, and builds the UI launchers.

### Tool Types

-   `html`: An "Embedded" tool that loads directly into the main content area of the page within an `<iframe>`.
-   `html_modal`: A "Modal" tool that opens in a full-screen overlay. It can be launched from the top-right dropdown menu or the main tool launcher.
-   A tool can have both types (e.g., `["html", "html_modal"]`) and be launched in either context.

### Enabled Tools

Here is a list of the currently enabled tools, categorized as they appear in the UI:

#### MTG
-   **mtg-ability-finder** (Type: html, html_modal): A quick search utility to look up the official text and description for any MTG keyword ability, ability word, or keyword action.
-   **mtg-life-counter** (Type: html, html_modal)
-   **mtg-random-card** (Type: html, html_modal)
-   **mtg-urza-tool** (Type: html)
-   **mtg-dungeons** (Type: html, html_modal)
-   **🎡 Garth-One-Eye** (Type: html)
-   **mtg-archenemy-tool** (Type: html)

#### TOURNAMENT
-   **swiss-round-tool** (Type: html, html_modal)
-   **swiss-round-viewer** (Type: html, html_modal)

#### MTG ORDER
-   **CK Order Sorter** (Type: html)

#### GAME
-   **🎮 Sudoku** (Type: html_modal)

#### BOARD GAME
-   **etc-mighty-helper** (Type: html, html_modal)
-   **etc-thegang-helper** (Type: html, html_modal)

#### MISC
-   **misc-dice** (Type: html, html_modal)

#### ETC
-   **etc-poker** (Type: html)
-   **etc-blackjack** (Type: html)
-   **etc-lotto** (Type: html, html_modal)
