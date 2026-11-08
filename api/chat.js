export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: "No prompt provided" });
    }

    if (!process.env.GROQ_API_KEY) {
        return res.status(500).json({ error: "API key not configured" });
    }

    const apiKey = process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.trim() : null;
    if (!apiKey) {
        return res.status(500).json({ error: "API key not configured in Vercel" });
    }

    try {
        // 1. Fetch live active models list for this API key from Groq
        let activeModel = "llama-3.1-8b-instant";
        try {
            const modelsRes = await fetch("https://api.groq.com/openai/v1/models", {
                headers: { "Authorization": `Bearer ${apiKey}` }
            });
            if (modelsRes.ok) {
                const modelsData = await modelsRes.json();
                const chatModels = (modelsData.data || [])
                    .map(m => m.id)
                    .filter(id => !id.includes("whisper") && !id.includes("guard") && !id.includes("embed") && !id.includes("vision"));

                // Prefer llama-3.1-8b-instant, then any active llama/gemma/mixtral chat model
                const preferred = chatModels.find(id => id === "llama-3.1-8b-instant")
                    || chatModels.find(id => id.includes("8b"))
                    || chatModels.find(id => id.includes("llama"))
                    || chatModels[0];

                if (preferred) {
                    activeModel = preferred;
                }
            }
        } catch (e) {
            // if model list fetch fails, continue with default
        }

        // 2. Call chat completion with the active model
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: activeModel,
                messages: [{ role: "user", content: prompt }],
                max_tokens: 1024
            })
        });

        const data = await response.json();

        if (!response.ok || !data.choices || !data.choices[0]) {
            const errorMsg = data.error?.message || (typeof data.error === "string" ? data.error : "Invalid response from Groq");
            return res.status(response.status || 500).json({ error: errorMsg });
        }

        res.status(200).json({ result: data.choices[0].message.content });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}