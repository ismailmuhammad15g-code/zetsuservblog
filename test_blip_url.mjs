// Test Bytez BLIP with a real public URL
import Bytez from "bytez.js"

const key = process.env.BYTEZ_KEY || "your_bytez_key";
const sdk = new Bytez(key)

const model = sdk.model("Salesforce/blip-image-captioning-base")

async function testBLIP() {
    console.log("Testing BLIP with public URL...");
    try {
        // Use a stable, public image URL
        const simpleImageUrl = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png"; // Pikachu

        const { error, output } = await model.run(simpleImageUrl);

        console.log("Error:", error);
        console.log("Output:", JSON.stringify(output, null, 2));
    } catch (e) {
        console.error("Test failed:", e);
    }
}

testBLIP();
