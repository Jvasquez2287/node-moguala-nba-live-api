// Test the fixMissingCommas regex
const testJson = `{
  "timestamp": "2024-02-22T14:30:00Z"
  "insights": [
    {
      "game_id": "123",
      "text": "test"
    }
  ]
}`;

const regex = /"\s*\n(\s*)"([^"]*)":/g;

console.log("Input:");
console.log(testJson);
console.log("\n=== Testing regex ===");
console.log("Pattern:", regex);
console.log("Matches:");

const matches = [...testJson.matchAll(regex)];
matches.forEach((m, i) => {
    console.log(`Match ${i}:`, JSON.stringify(m[0]));
    console.log(`  Full match: "${m[0]}"`);
    console.log(`  Group 1 (spaces): "${m[1]}"`);
    console.log(`  Group 2 (key): "${m[2]}"`);
});

console.log("\nApplying replace...");
const result = testJson.replace(regex, (match, spaces, key) => {
    console.log(`Replacing: ${JSON.stringify(match)}`);
    return `",\n${spaces}"${key}":`;
});

console.log("\nResult:");
console.log(result);

console.log("\nTry parsing:");
try {
    JSON.parse(result);
    console.log("✓ Valid JSON");
} catch (e) {
    console.log("✗ Invalid:", e.message);
}
