// Test GitHub AI Models (Azure AI Inference)
import ModelClient from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "your_github_token";
const endpoint = "https://models.github.ai/inference";

// Trying GPT-4o which supports vision
const modelName = "gpt-4o";

// Test image (red pixel)
const testImageUrl = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png";

async function main() {
    console.log(`Testing GitHub Model: ${modelName}...`);

    try {
        const client = new ModelClient(endpoint, new AzureKeyCredential(GITHUB_TOKEN));

        const response = await client.path("/chat/completions").post({
            body: {
                messages: [
                    { role: "system", content: "You are a helpful assistant." },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: "What is in this image? Describe it briefly." },
                            { type: "image_url", image_url: { url: testImageUrl } }
                        ]
                    }
                ],
                model: modelName,
                temperature: 0.5,
                max_tokens: 100
            }
        });

        if (response.status !== "200") {
            console.error("Error:", response.body.error);
            return;
        }

        console.log("✅ Response:", response.body.choices[0].message.content);

    } catch (err) {
        console.error("The sample encountered an error:", err);
    }
}

main();
