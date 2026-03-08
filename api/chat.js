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

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 1024
            })
        });

        const data = await response.json();

        if (!data.choices || !data.choices[0]) {
            return res.status(500).json({ error: "Invalid response from Groq" });
        }

        res.status(200).json({ result: data.choices[0].message.content });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}