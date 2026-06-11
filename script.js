// DOM Elements
const addNoteBtn = document.getElementById('addNoteBtn');
const addTodoBtn = document.getElementById('addTodoBtn');
const playYoutubeBtn = document.getElementById('playYoutubeBtn');
const playSpotifyBtn = document.getElementById('playSpotifyBtn');
const toggleFocusModeBtn = document.getElementById('toggleFocusModeBtn');
const saveBtn = document.getElementById('saveBtn');
const loadBtn = document.getElementById('loadBtn');
const bgTypeSelect = document.getElementById('bgTypeSelect');
const bgImageUpload = document.getElementById('bgImageFile');
const bgVideoInput = document.getElementById('youtubeVideoId');
const bgMp4Input = document.getElementById('bgMp4File');
const customBackgroundUrl = document.getElementById('customBackgroundUrl');
const clearBgBtn = document.getElementById('clearBgBtn');

// State management
let state = {
    notes: [],
    todos: [],
    background: {
        type: 'image',
        image: '',
        video: '',
        mp4: '',
        custom: ''
    },
    focusMode: false
};

// App state
let activeApps = new Set();
let draggedWindow = null;
let resizeWindow = null;
let windowZIndex = 10;
let startX, startY, startLeft, startTop;

// Initialize app
function init() {
    // Start with all windows closed
    closeAllApps();

    loadState();
    renderNotes();
    renderTodos();

    // Set up event listeners
    setupEventListeners();

    // Set up drag functionality
    setupDraggableWindows();

    // Set up time display
    updateTimeDisplay();
    setInterval(updateTimeDisplay, 1000);

    // Apply background
    applyBackground();
}

// Close all apps initially
function closeAllApps() {
    const windows = document.querySelectorAll('.app-window');
    windows.forEach(window => {
        window.classList.add('hidden');
        window.classList.remove('active');
    });
    activeApps.clear();
    updateActiveIcons();
}

// Set up event listeners
function setupEventListeners() {
    // Add buttons
    addNoteBtn.addEventListener('click', addNote);
    addTodoBtn.addEventListener('click', addTodo);

    // Music player buttons
    playYoutubeBtn.addEventListener('click', playYouTube);
    playSpotifyBtn.addEventListener('click', playSpotify);

    // Focus mode
    toggleFocusModeBtn.addEventListener('click', toggleFocusMode);

    // Background settings
    bgTypeSelect.addEventListener('change', handleBgTypeChange);

    // Save and Load buttons
    saveBtn.addEventListener('click', saveState);
    loadBtn.addEventListener('click', loadStateFromDialog);

    // Background image upload handler
    bgImageUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                state.background.image = event.target.result;
                applyBackground();
                saveState();
            };
            reader.readAsDataURL(file);
        }
    });

    // MP4 video upload handler
    bgMp4Input.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                state.background.mp4 = event.target.result;
                applyBackground();
                saveState();
            };
            reader.readAsDataURL(file);
        }
    });

    // Custom background URL handler
    customBackgroundUrl.addEventListener('change', function() {
        const url = this.value.trim();
        if (url) {
            state.background.custom = url;
            applyBackground();
            saveState();
        }
    });

    // Clear background button
    clearBgBtn.addEventListener('click', function() {
        state.background = {
            type: 'image',
            image: '',
            video: '',
            mp4: '',
            custom: ''
        };
        applyBackground();
        bgImageUpload.value = '';
        bgVideoInput.value = '';
        bgMp4Input.value = '';
        customBackgroundUrl.value = '';
        saveState();
    });
}

// Handle background type change
function handleBgTypeChange() {
    const bgType = bgTypeSelect.value;

    bgImageUpload.classList.toggle('hidden', bgType !== 'image');
    bgVideoInput.classList.toggle('hidden', bgType !== 'youtube');
    bgMp4Input.classList.toggle('hidden', bgType !== 'mp4');
    customBackgroundUrl.classList.toggle('hidden', bgType !== 'custom');

    // Handle YouTube video ID
    if (bgType === 'youtube') {
        const videoId = bgVideoInput.value;
        if (videoId) {
            state.background.video = videoId;
            applyBackground();
            saveState();
        }
    }

    // Handle custom URL
    if (bgType === 'custom') {
        const url = customBackgroundUrl.value;
        if (url) {
            state.background.custom = url;
            applyBackground();
            saveState();
        }
    }
}

// Update time display using device clock
function updateTimeDisplay() {
    const now = new Date();
    const timeElement = document.getElementById('currentTime');
    const dateElement = document.getElementById('currentDate');

    timeElement.textContent = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
    dateElement.textContent = now.toLocaleDateString([], {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
}

// Open app window
function openApp(appName) {
    const window = document.getElementById(appName);
    if (window) {
        window.classList.remove('hidden');
        window.classList.add('active');
        activeApps.add(appName);
        updateActiveIcons();
        // Bring to front
        windowZIndex += 1;
        window.style.zIndex = windowZIndex;
    }
}

// Close app window
function closeApp(appName) {
    const window = document.getElementById(appName);
    if (window) {
        window.classList.remove('active');
        window.classList.add('hidden');
        activeApps.delete(appName);
        updateActiveIcons();
    }
}

// Minimize app window
function minimizeApp(appName) {
    const window = document.getElementById(appName);
    if (window) {
        window.classList.remove('active');
        activeApps.delete(appName);
        updateActiveIcons();
    }
}

// Update active icons in bottom bar
function updateActiveIcons() {
    const appIcons = document.querySelectorAll('.app-icon');
    appIcons.forEach(icon => icon.classList.remove('active'));

    activeApps.forEach(appName => {
        const icon = document.querySelector(`[onclick="openApp('${appName}')"]`);
        if (icon) icon.classList.add('active');
    });
}

// Setup draggable windows
function setupDraggableWindows() {
    const windows = document.querySelectorAll('.app-window');

    windows.forEach(window => {
        const header = window.querySelector('.app-header');
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        window.appendChild(resizeHandle);

        let isDragging = false;
        let isResizing = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;
        let initialWidth;
        let initialHeight;
        let initialMouseX;
        let initialMouseY;

        header.addEventListener('mousedown', dragStart);
        resizeHandle.addEventListener('mousedown', resizeStart);
        document.addEventListener('mouseup', dragEnd);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mousemove', resize);

        // Prevent text selection while dragging
        header.addEventListener('selectstart', function(e) {
            e.preventDefault();
        });

        function dragStart(e) {
            if (e.target === resizeHandle) return;
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;

            if (e.target === header || e.target.closest('.app-header')) {
                isDragging = true;
                window.classList.add('window-dragging');
                draggedWindow = window;
                // Bring window to front when dragging starts
                windowZIndex += 1;
                window.style.zIndex = windowZIndex;

                // Store starting positions for drag
                startX = e.clientX;
                startY = e.clientY;
                startLeft = parseInt(window.style.left) || 0;
                startTop = parseInt(window.style.top) || 0;
            }
        }

        function resizeStart(e) {
            if (e.target !== resizeHandle) return;
            initialWidth = window.offsetWidth;
            initialHeight = window.offsetHeight;
            initialMouseX = e.clientX;
            initialMouseY = e.clientY;
            isResizing = true;
            window.classList.add('window-resizing');
            resizeWindow = window;
        }

        function dragEnd(e) {
            if (isDragging) {
                isDragging = false;
                window.classList.remove('window-dragging');
                draggedWindow = null;
            }
            if (isResizing) {
                isResizing = false;
                window.classList.remove('window-resizing');
                resizeWindow = null;
            }
        }

        function drag(e) {
            if (isDragging && draggedWindow === window) {
                e.preventDefault();

                // Calculate new position
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;

                // Update window position
                window.style.left = (startLeft + deltaX) + 'px';
                window.style.top = (startTop + deltaY) + 'px';
            }
        }

        function resize(e) {
            if (isResizing && resizeWindow === window) {
                const newWidth = initialWidth + (e.clientX - initialMouseX);
                const newHeight = initialHeight + (e.clientY - initialMouseY);

                if (newWidth > 300) {
                    window.style.width = newWidth + 'px';
                }
                if (newHeight > 200) {
                    window.style.height = newHeight + 'px';
                }
            }
        }
    });
}

// Add new note
function addNote() {
    const noteText = prompt("Enter your note:");
    if (noteText) {
        const newNote = {
            id: Date.now(),
            text: noteText,
            timestamp: new Date().toISOString()
        };
        state.notes.push(newNote);
        saveState();
        renderNotes();
    }
}

// Render notes
function renderNotes() {
    const container = document.getElementById('notesContainer');
    container.innerHTML = '';

    state.notes.forEach(note => {
        const noteElement = document.createElement('div');
        noteElement.className = 'note-item';
        noteElement.innerHTML = `
                    <p class="text-gray-300 mb-2">${note.text}</p>
                    <div class="flex justify-between items-center">
                        <span class="text-xs text-gray-500">${new Date(note.timestamp).toLocaleString()}</span>
                        <button onclick="deleteNote(${note.id})" class="text-red-400 hover:text-red-300 text-sm">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
        container.appendChild(noteElement);
    });
}

// Delete note
function deleteNote(id) {
    state.notes = state.notes.filter(note => note.id !== id);
    saveState();
    renderNotes();
}

// Add new todo
function addTodo() {
    const taskText = prompt("Enter your task:");
    if (taskText) {
        const newTodo = {
            id: Date.now(),
            text: taskText,
            completed: false
        };
        state.todos.push(newTodo);
        saveState();
        renderTodos();
    }
}

// Render todos
function renderTodos() {
    const list = document.getElementById('todoList');
    list.innerHTML = '';

    state.todos.forEach(todo => {
        const li = document.createElement('div');
        li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        li.innerHTML = `
                    <input type="checkbox" ${todo.completed ? 'checked' : ''} onchange="toggleTodo(${todo.id})" class="mr-3">
                    <span class="flex-1">${todo.text}</span>
                    <button onclick="deleteTodo(${todo.id})" class="text-red-400 hover:text-red-300 ml-2">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
        list.appendChild(li);
    });
}

// Toggle todo completion
function toggleTodo(id) {
    const todo = state.todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        saveState();
        renderTodos();
    }
}

// Delete todo
function deleteTodo(id) {
    state.todos = state.todos.filter(todo => todo.id !== id);
    saveState();
    renderTodos();
}

// Play YouTube video
function playYouTube() {
    const videoId = document.getElementById('musicUrlInput').value;
    if (videoId) {
        const iframe = document.getElementById('musicPlayer');
        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }
}

// Play Spotify playlist
function playSpotify() {
    const uri = document.getElementById('musicUrlInput').value;
    if (uri) {
        const iframe = document.getElementById('musicPlayer');
        if (uri.includes('spotify.com/playlist/')) {
            const playlistId = uri.split('/').pop();
            iframe.src = `https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=0`;
        } else if (uri.includes('spotify.com/track/')) {
            const trackId = uri.split('/').pop();
            iframe.src = `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`;
        }
    }
}

// Toggle focus mode
function toggleFocusMode() {
    if (state.focusMode) {
        // Exit focus mode
        state.focusMode = false;
        document.body.classList.remove('focus-mode');

        // Remove focus mode overlay if it exists
        const focusOverlay = document.querySelector('.focus-mode');
        if (focusOverlay) {
            focusOverlay.remove();
        }
    } else {
        // Enter focus mode
        state.focusMode = true;
        document.body.classList.add('focus-mode');

        // Create focus mode overlay
        const overlay = document.createElement('div');
        overlay.className = 'focus-mode';
        overlay.innerHTML = `
                    <div class="bg-overlay"></div>
                    <div class="content">
                        <h1>Focus Mode Activated</h1>
                        <p>Everything is hidden except the background. Press the button below to exit.</p>
                        <button class="btn" onclick="toggleFocusMode()">Exit Focus Mode</button>
                    </div>
                `;
        document.body.appendChild(overlay);
    }
    saveState();
}

// Apply background based on settings
function applyBackground() {
    const backgroundElement = document.getElementById('desktopBackground');
    const bgType = state.background.type;

    // Reset background properties
    backgroundElement.style.backgroundImage = 'none';
    backgroundElement.style.backgroundColor = '#0f172a';

    switch (bgType) {
        case 'image':
            if (state.background.image) {
                backgroundElement.style.backgroundImage = `url(${state.background.image})`;
                backgroundElement.style.backgroundSize = 'cover';
                backgroundElement.style.backgroundPosition = 'center';
                backgroundElement.style.backgroundRepeat = 'no-repeat';
            }
            break;
        case 'youtube':
            if (state.background.video) {
                backgroundElement.style.backgroundImage = `url('https://img.youtube.com/vi/${state.background.video}/maxresdefault.jpg')`;
                backgroundElement.style.backgroundSize = 'cover';
                backgroundElement.style.backgroundPosition = 'center';
                backgroundElement.style.backgroundRepeat = 'no-repeat';
            }
            break;
        case 'mp4':
            if (state.background.mp4) {
                // For MP4 videos, we need to create a video element instead of using background
                backgroundElement.innerHTML = `<video autoplay muted loop class="absolute inset-0 w-full h-full object-cover" style="z-index: -1;">
                            <source src="${state.background.mp4}" type="video/mp4">
                            Your browser does not support the video tag.
                        </video>`;
            } else {
                // Default background if no video
                backgroundElement.style.backgroundColor = '#0f172a';
            }
            break;
        case 'custom':
            if (state.background.custom) {
                backgroundElement.style.backgroundImage = `url(${state.background.custom})`;
                backgroundElement.style.backgroundSize = 'cover';
                backgroundElement.style.backgroundPosition = 'center';
                backgroundElement.style.backgroundRepeat = 'no-repeat';
            }
            break;
        default:
            backgroundElement.style.backgroundColor = '#0f172a';
    }
}

// Save state to localStorage
function saveState() {
    localStorage.setItem('studyAppState', JSON.stringify(state));
    alert('State saved successfully!');
}

// Load state from localStorage with dialog
function loadStateFromDialog() {
    if (confirm('Are you sure you want to load the saved state? This will overwrite your current data.')) {
        loadState();
        renderNotes();
        renderTodos();
        applyBackground();
        alert('State loaded successfully!');
    }
}

// Load state from localStorage
function loadState() {
    const savedState = localStorage.getItem('studyAppState');
    if (savedState) {
        state = JSON.parse(savedState);
    }
}

// Initialize the app when the page loads
window.onload = init;
