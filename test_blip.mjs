// Test Bytez BLIP Image Captioning
import Bytez from "bytez.js"

const key = process.env.BYTEZ_KEY || "your_bytez_key";
const sdk = new Bytez(key)

// Choose BLIP model
const model = sdk.model("Salesforce/blip-image-captioning-base")

// Test with a base64 image (red pixel)
// Or better, a real image URL if possible, or base64. Bytez supports base64 data URIs.
const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYGQwKS4BA/wJAxZ4M8YAAAAASUVORK5CYII=';

async function testBLIP() {
    console.log("Testing BLIP Image Captioning...");
    try {
        // Bytez documentation says model.run(input). Input can be URL or base64.
        const { error, output } = await model.run(testImageBase64);

        console.log("Error:", error);
        console.log("Output:", JSON.stringify(output, null, 2));

        if (output && output.length > 0) {
            // BLIP usually returns an array of objects or strings, let's see structure
            console.log("\n✅ Caption:", output);
        }
    } catch (e) {
        console.error("Test failed:", e);
    }
}

testBLIP();
