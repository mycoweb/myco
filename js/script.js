const imageOverlay = document.getElementById('image-overlay');
const enlargedImage = document.getElementById('enlarged-image');

function getRandomImages() {
    const imageNames = Array.from({
        length: 40 // Assuming max 20 images named 1.jpg to 40.jpg
    }, (_, i) => `${i + 1}.jpg`);
    const randomImagesContainer = document.getElementById('random-images');
    randomImagesContainer.innerHTML = ''; // Clear previous images

    // Shuffle the array to get a random order
    const shuffledImages = imageNames.sort(() => Math.random() - 0.5);

    // Display all shuffled images and add click listener
    shuffledImages.forEach(image => {
        const imagePath = `/myco/img/${image}`; // Updated path for GitHub Pages
        const img = document.createElement('img');
        img.src = imagePath;
        img.alt = `Research Image ${image}`; // Add alt text
        img.onerror = function() { this.style.display='none'; }; // Hide if image fails to load
        img.onclick = function() { showEnlargedImage(this.src); }; // Add click handler
        randomImagesContainer.appendChild(img);
    });
}

async function loadTimelapseVideos() {
    const videoContainer = document.getElementById('live-feed');
    videoContainer.innerHTML = '';
    const numVideosToLoad = 15; // Adjust this number as needed (1.mp4 to 9.mp4)

    for (let i = 1; i <= numVideosToLoad; i++) {
        const videoName = `${i}.mp4`;
        const videoPath = `/myco/img/${videoName}`; // Updated path for GitHub Pages
        const video = document.createElement('video');
        video.controls = true;
        video.loop = true;
        video.muted = true;
        video.preload = 'metadata'; // Load only metadata initially
        const source = document.createElement('source');
        source.src = videoPath;
        source.type = 'video/mp4';
        video.appendChild(source);
        video.innerHTML += 'Your browser does not support the video tag.';
        video.onerror = function() { this.style.display='none'; console.error(`Failed to load video: ${videoPath}`); }; // Hide on error
        videoContainer.appendChild(video);
    }
}

function showEnlargedImage(imageSrc) {
    enlargedImage.src = imageSrc;
    imageOverlay.classList.add('show');
}

function closeEnlargedImage() {
    imageOverlay.classList.remove('show');
    enlargedImage.src = ""; // Clear the source when closing
}

// --- Journal Entry Functions ---
const latestEntries = document.getElementById('latest-entries');
const moreEntries = document.getElementById('more-entries');
const showMoreButton = document.getElementById('show-more-button');
let allEntries = []; // Array to hold formatted entry strings

// Function to safely encode potentially problematic characters for URLs/attributes
function safeEncode(str) {
    return btoa(unescape(encodeURIComponent(str)));
}

// Function to safely decode
function safeDecode(str) {
    try {
        return decodeURIComponent(escape(atob(str)));
    } catch (e) {
        console.error("Error decoding string:", e);
        return ''; // Return empty string or handle error appropriately
    }
}


function deleteEntry(encodedEntry) {
    // Decode the entry content first to show a confirmation
    const entryContentToDelete = safeDecode(encodedEntry);
    // Optional: Add a confirmation dialog
    if (!confirm(`Are you sure you want to delete this entry?\n\n"${entryContentToDelete.substring(0, 100)}..."`)) {
        return; // Stop if user cancels
    }

    // Proceed with deletion using the original base64 encoded string
    // **WARNING: DELETE functionality to a static file on GitHub Pages won't work.**
    // This will likely result in a 404 error. You'll need a backend to handle this.
    fetch(`/myco/delete/${encodeURIComponent(encodedEntry)}`, {
        method: 'DELETE',
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'OK') {
            loadJournalEntries(); // Reload entries after successful deletion
        } else {
            console.error('Error deleting entry:', data.message);
            alert(`Error deleting entry: ${data.message}`);
        }
    })
    .catch(error => {
        console.error('Fetch error during deletion:', error);
        alert('An error occurred while deleting the entry. Check the console.');
    });
}

function updateDisplay() {
    latestEntries.innerHTML = '';
    moreEntries.innerHTML = '';

    // Display latest 3 entries in 'latestEntries'
    const latest = allEntries.slice(-3).reverse(); // Show newest first in the latest section
    latest.forEach(entryHTML => {
        latestEntries.innerHTML += entryHTML;
    });

    // Display all entries (newest first) in 'moreEntries'
    const allReversed = [...allEntries].reverse(); // Show newest first in the "more" section too
    allReversed.forEach(entryHTML => {
        moreEntries.innerHTML += entryHTML;
    });


    // Control visibility of "More" button and sections
    if (allEntries.length > 3) {
        showMoreButton.style.display = 'block';
        // Ensure correct initial state when > 3 entries
        if (moreEntries.style.display !== 'block') { // If "more" is not shown
            latestEntries.style.display = 'block'; // Show "latest"
            moreEntries.style.display = 'none';    // Hide "more"
            showMoreButton.textContent = ">> More (" + (allEntries.length - 3) + ")";
        } else { // If "more" is shown
            latestEntries.style.display = 'none'; // Hide "latest"
            showMoreButton.textContent = "<< Less";
        }
    } else {
        showMoreButton.style.display = 'none';
        latestEntries.style.display = 'block'; // Always show latest if <= 3 entries
        moreEntries.style.display = 'none';
    }
}


function toggleEntries() {
    if (moreEntries.style.display === 'none' || moreEntries.style.display === '') {
        // Show "more", hide "latest"
        moreEntries.style.display = 'block';
        latestEntries.style.display = 'none';
        showMoreButton.textContent = "<< Less";
    } else {
        // Hide "more", show "latest"
        moreEntries.style.display = 'none';
        latestEntries.style.display = 'block';
        showMoreButton.textContent = ">> More (" + (allEntries.length - 3) + ")";
    }
}

function loadJournalEntries() {
    fetch('/myco/journal.txt?t=' + Date.now()) // Updated path for GitHub Pages
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(text => {
            // Normalize line endings and split robustly
            const entriesRaw = text.trim().split(/\n?---\s/);
            allEntries = []; // Clear existing entries before loading

            entriesRaw.forEach((entry, index) => {
                if (entry.trim() === '' || index === 0) return; // Skip empty entries or potential split artifacts at the beginning

                const lines = entry.trim().split('\n');
                const timestamp = lines[0].replace(/---$/, '').trim(); // Clean up timestamp
                const contentLines = lines.slice(1).filter(line => line.trim() !== ''); // Get non-empty content lines
                const content = contentLines.join('\n').trim(); // Rejoin content lines

                if (content === '') return; // Skip entries with only a timestamp

                const entryNumber = allEntries.length + 1; // Calculate entry number based on valid entries processed
                const encodedContentForDelete = safeEncode(content); // Encode content for the delete button

                // Format content as a list
                let formattedContentHTML = '<ul>';
                contentLines.forEach(line => {
                    // Basic formatting: remove leading list markers if present
                    formattedContentHTML += `<li>${line.replace(/^\s*[-•*+]\s*/, '')}</li>`;
                });
                formattedContentHTML += '</ul>';

                // Create the HTML for the entry
                const formattedEntryHTML = `
                    <div class="log-entry">
                        <h3>Entry ${entryNumber}: ${timestamp}</h3>
                        ${formattedContentHTML}
                        <button class="delete-note" title="Delete this note" onclick="deleteEntry('${encodedContentForDelete}')">X</button>
                    </div>`;

                allEntries.push(formattedEntryHTML);
            });
            updateDisplay(); // Update the page with the loaded entries
        })
        .catch(error => {
            console.error("Error loading journal entries:", error);
            latestEntries.innerHTML = "<p>Error loading journal entries. See console.</p>"; // Display error to user
        });
}

function addEntry() {
    const entryText = journalInput.value.trim(); // Use trim()
    if (entryText === '') return; // Don't add empty entries

    saveJournal(entryText); // Call save function
    journalInput.value = ''; // Clear the textarea
    // loadJournalEntries(); // Reload is called within saveJournal's success path now
}

function saveJournal(entryText) {
    const now = new Date();
    const timestamp = now.toLocaleString();

    // Prepare the data to send.
    const dataToSend = `\n--- ${timestamp} ---\n${entryText}\n`;

    // **WARNING: POST functionality to a static file on GitHub Pages won't work.**
    // This will likely result in a 404 error. You'll need a backend to handle this.
    fetch('/myco/journal.txt', {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
        },
        body: dataToSend,
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`Server error: ${response.status} ${response.statusText}. ${text}`);
            });
        }
        return response.text();
    })
    .then(data => {
        console.log("Entry added successfully:", data);
        loadJournalEntries(); // Reload entries to show the new one
    })
    .catch(error => {
        console.error("Error adding entry:", error);
        alert(`Error adding entry: ${error.message}`);
    });
}

// --- Initial calls to load data ---
getRandomImages();
loadTimelapseVideos();
loadJournalEntries(); // Load journal on page start
