// Test User Suggested Model: unography/blip-large-long-cap
import Bytez from "bytez.js"

// User provided key (same as before)
const key = process.env.BYTEZ_KEY || "your_bytez_key";
const sdk = new Bytez(key)

const model = sdk.model("unography/blip-large-long-cap")

async function testModel() {
    console.log("Testing unography/blip-large-long-cap...");
    try {
        // Test with a complex image URL (User provided example)
        const imageUrl = "https://ocean.si.edu/sites/default/files/styles/3_2_largest/public/2023-11/Screen_Shot_2018-04-16_at_1_42_56_PM.png.webp";

        console.log("Running...");
        const { error, output } = await model.run(imageUrl);

        if (error) {
            console.error("Error:", error);
        } else {
            console.log("Output:", JSON.stringify(output, null, 2));
        }

    } catch (e) {
        console.error("Test exception:", e);
    }
}

testModel();
