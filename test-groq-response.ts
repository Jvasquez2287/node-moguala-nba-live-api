// Quick test to call generateBatchedAIInsights and see raw Groq response
import { predictGamesForDate } from './src/services/predictions';

async function test() {
    console.log('Testing generateBatchedAIInsights with sample data...');
    
    // Try to fetch predictions for a date that should have cached data
    const result = await predictGamesForDate('2024-02-22', '2023-24');
    
    console.log('\n========== RESULT ==========');
    console.log(JSON.stringify(result, null, 2).substring(0, 1000));
    console.log('\nTest complete');
    process.exit(0);
}

test().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
