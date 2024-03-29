import '../loadEnv.js';
import OpenAI from "openai";
import express from 'express';
import cors from 'cors';

// Initialize Express and middleware
const app = express();
app.use(cors());
app.use(express.json());

const openAIKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({ apiKey: openAIKey });
console.log(process.env)
console.log("api key:" + openAIKey);

//const PORT = process.env.PORT || 5174;
//app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

app.post('/', async (req, res) => {
    console.log("post request reached")
    try {
        const { genres, usedNames } = req.body;
        const genresString = Array.isArray(genres) ? genres.join(', ') : genres;

        let playlistNamesContent = '';

        const stream = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "Take on the persona of an expert name generator. You will help assist me in generating music playlist names based on several data points."},
                { role: "user", content: `Generate a seamless list of Spotify playlist names for a variety of music genres listed in ${genresString}. As an AI music expert, immerse yourself in each genre's depth, drawing upon its rhythm, historical background, emotional resonance, and quintessential aspects to inspire your creativity. For instance, when considering jazz, reflect on its improvisational zest, foundational roots in African-American culture, and its evolution across eras. For electronic dance music, focus on the pulsating energy, technological advancements, and vibrant festival scenes. Craft playlist names that echo the unique attributes and spirit of each genre, combining creativity with insight to produce titles that resonate with both enthusiasts and newcomers to the music styles. Each name should encapsulate the essence of the genre, sparking curiosity and excitement among listeners, and inviting them into the musical landscape it represents. Your response must be a direct list of playlist names, each a thoughtful amalgamation of up to 4 words that capture the genre's soul. Aim for imaginative, emotionally evocative names that intrigue and draw listeners. Provide exactly 35 names in a continuous list without any separators, ensuring no names include words from ${usedNames}. This list should strictly adhere to the format and guidelines specified, focusing intensely on the characteristics, cultural contexts, and distinctive elements that define each genre.` },
            ],
            stream: true,
        });

        for await (const chunk of stream) {
            playlistNamesContent += chunk.choices[0]?.delta?.content || '';
        }

        res.json({ playlistName: playlistNamesContent });

    } catch (error) {
        console.error("Error generating playlist names:", error);
        console.log(err.response.data)
    }
});

module.exports = app

//POST http://localhost:5174/genres net::ERR_CONNECTION_REFUSED
//POST https://namesforspotify.vercel.app/genres 404 (Not Found)


/* {
    "version": 2,
    "builds": [
     {
         "src": "./openAi_api.js",
         "use": "@vercel/node"
     }
    ],
    "routes": [
     {
         "src": "/(.*)",
         "dest": "/genres"
     }
    ]
 } */