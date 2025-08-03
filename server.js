const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Translation endpoint
app.post('/api/translate', async (req, res) => {
    try {
        const { inputText, targetLanguage } = req.body;
        
        if (!inputText || !targetLanguage) {
            return res.status(400).json({ error: 'Missing required fields: inputText and targetLanguage' });
        }

        const prompt = `Translate the following Manipuri text to ${targetLanguage}. Only output the translated text without any prefixes, conversational phrases, or extra information. If the input is Romanized Manipuri, process it as such. If it's Meitei Mayek, process it as Meitei Mayek.
        \nManipuri Text: ${inputText}`;

        const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
        const payload = { contents: chatHistory };
        
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'API key not configured' });
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        const fetch = (await import('node-fetch')).default;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Translation API HTTP error: ${response.status} ${response.statusText}`, errorBody);
            return res.status(500).json({ error: `Translation service error: ${response.status}` });
        }

        const result = await response.json();

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            const translatedText = result.candidates[0].content.parts[0].text;
            res.json({ translatedText });
        } else {
            console.error('Unexpected Translation API response structure:', result);
            res.status(500).json({ error: 'Unexpected API response structure' });
        }
    } catch (error) {
        console.error('Translation error:', error);
        res.status(500).json({ error: 'Translation failed' });
    }
});

// Text-to-Speech endpoint
app.post('/api/tts', async (req, res) => {
    try {
        const { text, targetLanguage } = req.body;
        
        if (!text || !targetLanguage) {
            return res.status(400).json({ error: 'Missing required fields: text and targetLanguage' });
        }

        // Voice mapping based on target language
        let voiceName = 'Kore'; // Default voice
        if (targetLanguage === 'English') voiceName = 'Zephyr';
        else if (targetLanguage === 'Hindi') voiceName = 'Rasalgethi';
        else if (targetLanguage === 'Bengali') voiceName = 'Sadachbia';
        else if (targetLanguage === 'Spanish') voiceName = 'Autonoe';
        else if (targetLanguage === 'French') voiceName = 'Charon';
        else if (targetLanguage === 'German') voiceName = 'Fenrir';
        else if (targetLanguage === 'Japanese') voiceName = 'Leda';
        else if (targetLanguage === 'Korean') voiceName = 'Orus';
        else if (targetLanguage === 'Italian') voiceName = 'Aoede';
        else if (targetLanguage === 'Portuguese') voiceName = 'Callirrhoe';
        else if (targetLanguage === 'Russian') voiceName = 'Enceladus';
        else if (targetLanguage === 'Dutch') voiceName = 'Iapetus';
        else if (targetLanguage === 'Polish') voiceName = 'Umbriel';
        else if (targetLanguage === 'Thai') voiceName = 'Algenib';
        else if (targetLanguage === 'Turkish') voiceName = 'Rasalgethi';
        else if (targetLanguage === 'Vietnamese') voiceName = 'Laomedeia';
        else if (targetLanguage === 'Assamese') voiceName = 'Achernar';

        const payload = {
            contents: [{
                parts: [{ text: text }]
            }],
            generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceName }
                    }
                }
            },
            model: "gemini-2.5-flash-preview-tts"
        };

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'API key not configured' });
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

        const fetch = (await import('node-fetch')).default;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`TTS API HTTP error: ${response.status} ${response.statusText}`, errorBody);
            return res.status(500).json({ error: `TTS service error: ${response.status}` });
        }

        const result = await response.json();

        const part = result?.candidates?.[0]?.content?.parts?.[0];
        const audioData = part?.inlineData?.data;
        const mimeType = part?.inlineData?.mimeType;

        if (audioData && mimeType && mimeType.startsWith("audio/")) {
            res.json({ audioData, mimeType });
        } else {
            console.error('TTS: API response did not contain expected audio data:', result);
            res.status(500).json({ error: 'Unexpected TTS API response structure' });
        }
    } catch (error) {
        console.error('TTS error:', error);
        res.status(500).json({ error: 'TTS failed' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
