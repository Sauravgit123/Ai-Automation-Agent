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

    const candidateModels = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "llama3-8b-8192"];

    for (const model of candidateModels) {
        try {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.GROQ_API_KEY.trim()}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: "user", content: prompt }],
                    max_tokens: 1024
                })
            });

            const data = await response.json();

            if (response.ok && data.choices && data.choices[0]) {
                return res.status(200).json({ result: data.choices[0].message.content });
            }

            // If this is the last candidate or error is not model-related, return error
            const isModelMissing = response.status === 404 || data.error?.message?.includes("does not exist");
            if (!isModelMissing || model === candidateModels[candidateModels.length - 1]) {
                const errorMsg = data.error?.message || (typeof data.error === "string" ? data.error : "Invalid response from Groq");
                return res.status(response.status || 500).json({ error: errorMsg });
            }
        } catch (error) {
            if (model === candidateModels[candidateModels.length - 1]) {
                return res.status(500).json({ error: error.message });
            }
        }
    }
}