/* // Node.js server-side code
import './loadEnv.js';
import OpenAI from "openai";
import cors from 'cors';
import express from 'express';

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 5174;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const openAIKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI(openAIKey);
console.log(process.env)
console.log("api key:" + openAIKey);

const generatedPlaylists = new Set(); // Set to store generated playlist names

app.post('/genres', async (req, res) => {
    try {
        const { genres, usedNames } = req.body; // Parse genres from the request body
        const genresString = Array.isArray(genres) ? genres.join(', ') : genres;
        console.log(genresString)

        let playlistName;
        do {
            playlistName = await generatePlaylistName(genresString, usedNames);
        } while (generatedPlaylists.has(playlistName));

        // Add the generated playlist name to the set
        generatedPlaylists.add(playlistName);

        const response = {
            playlistName
        };
        res.json(response);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


async function generatePlaylistName(genresString, usedNames) {
    const stream = await openai.chat.completions.create({
        messages: [
            { role: "system", content: "Take on the persona of an expert name generator. You will help assist me in generating music playlist names based on several data points."},
            { role: "user", content: `My next message will be a list of several music genres. Imagine you are an AI assistant similar to ChatGPT, specialized in music. Your task is to create a single unique and appealing Spotify playlist names for these musical genres: ${genresString}. When provided with a genre, you must delve deeply into the characteristics, cultural contexts, and distinctive elements of that genre. Consider the rhythm, history, emotional impact, and the core essence of each genre. For example, if the genre is jazz, think about the improvisational nature of jazz, its roots in African-American communities, and its evolution through different eras. If it's electronic dance music, consider the energy, the technological evolution, and the festival culture associated with it.Your playlist names should not only resonate with the specific attributes of each genre but should also be creative and engaging. They should appeal to both dedicated fans and new listeners who are exploring these musical styles. Use your understanding of the genre to craft names that are both reflective and inventive, offering a glimpse into the world that each type of music represents. Keep in mind the emotions and experiences that listeners might associate with these genres. Your goal is to create playlist names that not only define the genre but also spark curiosity and excitement in the listener, drawing them into the musical journey that awaits. Make sure to use a creative, whimsical and varied vocabulary reflecting emotions. You will respond ONLY with playlist names. The names should be a bundle of words without any semicolons. Maximum 4 words per playlist name. You will STRICTLY return 35 playlist names.nothing more. Make sure that none of the playlist names include these words: ${usedNames}` },
        ],
        model: "gpt-3.5-turbo",
        stream: true,
    });
    for await (const chunk of stream) {
        process.stdout.write(chunk.choices[0]?.delta?.content || '');
    } */
/* } */

import './loadEnv.js';
import OpenAI from "openai";
import express from 'express';
import cors from 'cors';

// Initialize Express and middleware
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5174;
const openAIKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({ apiKey: openAIKey });
console.log(process.env)
console.log("api key:" + openAIKey);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

app.post('/genres', async (req, res) => {
    try {
        const { genres, usedNames } = req.body;
        const genresString = Array.isArray(genres) ? genres.join(', ') : genres;

        // Initialize a variable to store the streamed content
        let playlistNamesContent = '';

        const stream = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "Take on the persona of an expert name generator. You will help assist me in generating music playlist names based on several data points."},
                { role: "user", content: `Generate a seamless list of Spotify playlist names for a variety of music genres listed in ${genresString}. As an AI music expert, immerse yourself in each genre's depth, drawing upon its rhythm, historical background, emotional resonance, and quintessential aspects to inspire your creativity. For instance, when considering jazz, reflect on its improvisational zest, foundational roots in African-American culture, and its evolution across eras. For electronic dance music, focus on the pulsating energy, technological advancements, and vibrant festival scenes. Craft playlist names that echo the unique attributes and spirit of each genre, combining creativity with insight to produce titles that resonate with both enthusiasts and newcomers to the music styles. Each name should encapsulate the essence of the genre, sparking curiosity and excitement among listeners, and inviting them into the musical landscape it represents. Your response must be a direct list of playlist names, each a thoughtful amalgamation of up to 4 words that capture the genre's soul. Aim for imaginative, emotionally evocative names that intrigue and draw listeners. Provide exactly 35 names in a continuous list without any separators, ensuring no names include words from ${usedNames}. This list should strictly adhere to the format and guidelines specified, focusing intensely on the characteristics, cultural contexts, and distinctive elements that define each genre.` },
            ],
            stream: true,
        });

        // Collect streamed data
        for await (const chunk of stream) {
            playlistNamesContent += chunk.choices[0]?.delta?.content || '';
        }

        // Once all data is collected, send it as a response
        res.json({ playlistName: playlistNamesContent });

    } catch (error) {
        console.error("Error generating playlist names:", error);
        res.status(500).json({ error: error.message });
    }
});
