const clientId = "f73816622e6e4ad5a1b511dfa3513504";
const redirectUri = "https://namesforspotify.vercel.app/callback"; // Ensure your Spotify app redirect URI matches
let usedNames = new Set();

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const generateButton = document.getElementById("generatePlaylistButton");


    if (!code) {
        document.getElementById("loginButton").onclick = () => redirectToAuthCodeFlow(clientId);
    } else {
        try {
            const accessToken = await getAccessToken(clientId, code);
            const artists = await fetchArtists(accessToken);
            const tracks = await fetchTracks(accessToken);
            const genres = await fetchGenres(artists);
            

            // Assume populateUI is an async function and waits for completion
            await populateUI(genres);

            // Restore the original button text after generation is complete

            document.getElementById("login").style.display = "none";

            const contentElement = document.getElementById("content");
            contentElement.style.display = 'flex';
            contentElement.style.flexDirection = 'column';
            contentElement.style.justifyContent = 'center';
            contentElement.style.alignItems = 'center';
            contentElement.style.height = '100%';       
            
            document.querySelector('.copy-button').addEventListener('click', copyToClipboard);

        } catch (error) {
            console.error("Authentication failed:", error);
        }
    }
});

function copyToClipboard() {
    const playlistNameElement = document.getElementById("playlistName");
    if (playlistNameElement.textContent) {
        navigator.clipboard.writeText(playlistNameElement.textContent)
    } else {
        console.log("No playlist name to copy");
    }
}

function parsePlaylistNames(namesString) {
    const namePattern = /\d+\.\s(.+)/g;

    let match;
    let names = [];

    while ((match = namePattern.exec(namesString)) !== null) {
        names.push(match[1]);
    }

    return names;
}

async function fetchChatCompletion(genres) {
    try {
        const apiUrl = `https://namesforspotify.vercel.app/genres`; // Use the root URL

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json", // Set the content type to JSON
            },
            body: JSON.stringify({ genres}), // Send genres as JSON data in the request body
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Check if 'playlistName' property exists in the response
        if (data.playlistName) {
            console.log(data.playlistName);
            try {
                const playlistNames = parsePlaylistNames(data.playlistName);
                console.log("Parsed Names:", playlistNames); // Debugging line
                if (usedNames.length > 0){
                    usedNames.clear();
                }
                return playlistNames;
            } catch (error) {
                console.error("error parsing playlist names")
                return []; // Return an empty array if there's an error

            }
        } else {
            console.error("Invalid response from the backend:", data);
        }
    } catch (error) {
        console.error("Error fetching chat completion: ", error);
    }
}



export async function redirectToAuthCodeFlow(clientId) {
    const verifier = generateCodeVerifier(128);
    const challenge = await generateCodeChallenge(verifier);

    localStorage.setItem("verifier", verifier);

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("response_type", "code");
    params.append("redirect_uri", redirectUri);
    params.append("scope", "user-top-read");
    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);

    document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function generateCodeVerifier(length) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(codeVerifier) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}


export async function getAccessToken(clientId, code) {
    const verifier = localStorage.getItem("verifier");

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", redirectUri);
    params.append("code_verifier", verifier);

    const result = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });

    const { access_token } = await result.json();
    return access_token;
}

async function fetchTracks(token) {
    const result = await fetch("https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=50&offset=0", {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    return await result.json();
}

async function fetchArtists(token) {
    const result = await fetch("https://api.spotify.com/v1/me/top/artists?time_range=short_term&limit=50&offset=0", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
    });
    return await result.json();
}


async function fetchGenres(artists) {
    const artistData = artists

    // Count the frequency of each genre
    const genreFrequency = artistData.items.reduce((acc, artist) => {
        artist.genres.forEach(genre => {
            acc[genre] = (acc[genre] || 0) + 1;
        });
        return acc;
    }, {});

    // Sort genres based on frequency
    const sortedGenres = Object.entries(genreFrequency).sort((a, b) => b[1] - a[1]);

    // Extract just the genre names in sorted order
    const sortedGenreNames = sortedGenres.map(item => item[0]);

    return sortedGenreNames;
}


async function populateUI(genres) {
    let availableNames = [];
    const generatePlaylistButton = document.getElementById("generatePlaylistButton");

    // Clear previous click listeners to prevent multiple bindings
    generatePlaylistButton.removeEventListener('click', handleGenerateClick);
    
    // Define the event handler function
    async function handleGenerateClick() {
        // Change button text to "Generating..." with animation for dots
        generatePlaylistButton.innerHTML = 'Generating<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>';

        // Add CSS class for animation if not already in your stylesheet
        document.querySelectorAll('.dot').forEach((dot, index) => {
            dot.style.animation = `jump 1s infinite ${index * 0.2}s`;
        });

        if (availableNames.length === 0) {
            availableNames = await fetchChatCompletion(genres); // Fetch new names if the list is empty
            console.log("Available Names After Fetch:", availableNames); // Debugging line
        }

        if (availableNames.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableNames.length);
            const selectedName = availableNames.splice(randomIndex, 1)[0]; // Remove the selected name
            usedNames.add(selectedName); // Add to used names

            // Display the selected playlist name
            const playlistNameElement = document.getElementById("playlistName");
            playlistNameElement.textContent = selectedName;

            // Reset the generate button text to "Generate" after displaying the name
            generatePlaylistButton.textContent = 'Generate';
        } else {
            // Handle the case where no names are available
            console.log("No available names were fetched.");
            generatePlaylistButton.textContent = 'Generate'; // Reset button text
        }
    }

    // Attach the click event handler
    generatePlaylistButton.addEventListener('click', handleGenerateClick);
}





/* 
function populateUI(songs) {
    if (songs.items && songs.items.length > 0) {

        songs.items.forEach((song, index) => {
            let songContainer = document.createElement('div');
            songContainer.id = `song-${index}`;
            songContainer.classList.add('song-container');

            // Set song name
            let songName = document.createElement('p');
            songName.innerText = song.track.name;
            songName.style.fontWeight = 'bold';

            // Set artist name
            let artistName = document.createElement('p');
            artistName.innerText = song.track.artists.map(artist => artist.name).join(', ');

            // Set song image
            let songImage = new Image(100, 100);
            songImage.src = song.track.album.images[1].url;

            songContainer.appendChild(songImage);
            songContainer.appendChild(songName);
            songContainer.appendChild(artistName);


            document.getElementById("recent-songs").appendChild(songContainer);
        });
    } else {
        document.getElementById("recent-songs").innerText = "No recent songs found";
    }
}

function findDuplicateSongs(songs) {
    let songOccurrences = {};

    songs.items.forEach(song => {
        let songName = song.track.name;
        let playedAt = song.played_at;

        if (!songOccurrences[songName]) {
            songOccurrences[songName] = { count: 0, playedAt: [] };
        }
        songOccurrences[songName].count++;
        songOccurrences[songName].playedAt.push(playedAt);
    });

    let duplicates = [];
    for (let songName in songOccurrences) {
        if (songOccurrences[songName].count > 1) {
            duplicates.push({ 
                name: songName, 
                count: songOccurrences[songName].count,
                playedAt: songOccurrences[songName].playedAt
            });
        }
    }

    return duplicates;
}

function displayDuplicateSongs(duplicateSongs) {
    let duplicatesContainer = document.getElementById('song-occurences');
    duplicatesContainer.innerHTML = '';

    if (duplicateSongs.length === 0) {
        duplicatesContainer.innerHTML = '<p>No duplicate songs found.</p>';
        return;
    }

    let list = document.createElement('ul');
    duplicateSongs.forEach(song => {
        let listItem = document.createElement('li');
        listItem.innerHTML = `<strong>${song.name}</strong>: ${song.count} occurrences`;

        let timesList = document.createElement('ul');
        song.playedAt.forEach(time => {
            let timeItem = document.createElement('li');
            let date = new Date(time);
            timeItem.innerText = `${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
            timesList.appendChild(timeItem);
        });

        listItem.appendChild(timesList);
        list.appendChild(listItem);
    });

    duplicatesContainer.appendChild(list);
} */
