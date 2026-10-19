# TaskFlow - To-Do List

A responsive productivity app built with **HTML5, CSS3, and vanilla JavaScript**.

## Features
- Add tasks and mark them complete or active.
- Filter between All, Active, and Completed tasks.
- Delete individual tasks or clear all completed tasks.
- Persistent task storage using `localStorage`.
- Light/dark mode preference is saved between visits.
- Responsive layout for desktop, tablet, and mobile.
- Keyboard-friendly controls, focus styles, and accessible labels.
- Task titles are escaped before rendering to avoid interpreting user input as HTML.

## Run locally
1. Download and extract the project.
2. Open `index.html` in a browser.

For the most consistent local development experience, use VS Code's **Live Server** extension and open `index.html` through it.

## Files
- `index.html` - page structure
- `style.css` - layout, responsive styles, light and dark themes
- `script.js` - task state, filtering, local storage, and interactions

## Storage note
Tasks and the theme are saved in the current browser using `localStorage`. They stay on that browser/device and are not synced to an account or another device. Clearing browser site data will remove saved tasks.
