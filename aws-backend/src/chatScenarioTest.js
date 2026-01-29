/**
 * Chat Scenario Test
 * Tests the chat agent through HTTP endpoint using various scenarios
 * Scores for accuracy, order taking, efficiency, and phone number collection
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHAT_ENDPOINT = 'http://localhost:3001/chat';

// Load test scenarios
const scenariosPath = path.join(__dirname, '../../restaurant_test_scenarios.json');
const scenarios = JSON.parse(fs.readFileSync(scenariosPath, 'utf-8'));

// Output directory for test results
const outputDir = path.join(__dirname, '../../test_results');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Get next test number
function getNextTestNumber() {
  const files = fs.readdirSync(outputDir).filter(f => f.match(/^chat_test_\d+\.json$/));
  if (files.length === 0) return 1;
  const numbers = files.map(f => parseInt(f.match(/chat_test_(\d+)\.json/)[1]));
  return Math.max(...numbers) + 1;
}

// Sleep utility
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Send a message to the chat endpoint
async function sendChatMessage(sessionId, message) {
  const response = await fetch(CHAT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message })
  });
  const data = await response.json();
  return data.response;
}

// Run a single conversation scenario through chat
async function runScenario(scenario) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running: ${scenario.name} (${scenario.id})`);
  console.log(`Category: ${scenario.category} | Personality: ${scenario.personality}`);
  console.log('='.repeat(60));

  const sessionId = `test_${scenario.id}_${Date.now()}`;
  const transcript = [];

  try {
    // Start conversation with greeting
    const greeting = await sendChatMessage(sessionId, 'Hello');
    transcript.push({ role: 'customer', content: 'Hello' });
    transcript.push({ role: 'agent', content: greeting });
    console.log(`Customer: Hello`);
    console.log(`Agent: ${greeting}`);

    await sleep(500); // Rate limiting

    // Process customer script
    for (const customerLine of scenario.customer_script) {
      console.log(`Customer: ${customerLine}`);
      transcript.push({ role: 'customer', content: customerLine });

      const response = await sendChatMessage(sessionId, customerLine);
      transcript.push({ role: 'agent', content: response });
      console.log(`Agent: ${response}`);

      await sleep(500); // Rate limiting
    }

  } catch (error) {
    console.error('Error in conversation:', error.message);
    transcript.push({ role: 'error', content: error.message });
  }

  return {
    transcript,
    sessionId
  };
}

// Analyze the conversation for key metrics
function analyzeConversation(scenario, result) {
  const transcript = result.transcript;
  const agentResponses = transcript.filter(t => t.role === 'agent').map(t => t.content);
  const allText = agentResponses.join(' ').toLowerCase();

  const analysis = {
    orderSummaryGiven: false,
    phoneNumberCollected: false,
    phoneNumberAskedAtEnd: false,
    sizeAsked: false,
    regularVsComboAsked: false,
    deliveryRefused: false,
    priceGiven: false,
    pickupTimeGiven: false,
    unnecessaryQuestions: 0,
    issues: [],
    positives: []
  };

  // Check if order was summarized
  if (allText.includes('order') && (allText.includes('total') || allText.includes('$'))) {
    analysis.orderSummaryGiven = true;
    analysis.positives.push('Order summary provided');
  }

  // Check if phone number was collected
  const phonePatterns = ['phone', 'number', 'reach you'];
  if (phonePatterns.some(p => allText.includes(p))) {
    analysis.phoneNumberCollected = true;
    analysis.positives.push('Phone number collection attempted');
  }

  // Check if phone was asked at the end (not too early)
  const transcriptStr = transcript.map((t,i) => `${i}:${t.role}:${t.content}`).join('|||');
  const phoneIndex = transcriptStr.toLowerCase().indexOf('phone');
  if (phoneIndex > transcriptStr.length * 0.6) {
    analysis.phoneNumberAskedAtEnd = true;
    analysis.positives.push('Phone number asked at appropriate time (end)');
  } else if (phoneIndex > 0 && phoneIndex < transcriptStr.length * 0.4) {
    analysis.issues.push('Phone number asked too early in conversation');
  }

  // Check for size questions
  if (allText.includes('pint') || allText.includes('quart') || allText.includes('size')) {
    analysis.sizeAsked = true;
    analysis.positives.push('Size clarification asked');
  }

  // Check for regular vs combo clarification
  if (allText.includes('combination') || allText.includes('combo') || allText.includes('regular order')) {
    analysis.regularVsComboAsked = true;
    analysis.positives.push('Regular vs combo clarification asked');
  }

  // Check delivery refusal (for delivery scenarios)
  if (scenario.id === 'order_009' || scenario.customer_script.some(s => s.toLowerCase().includes('delivery'))) {
    if (allText.includes('no delivery') || allText.includes('pickup') || allText.includes('takeout') ||
        (allText.includes('sorry') && allText.includes('deliver'))) {
      analysis.deliveryRefused = true;
      analysis.positives.push('Correctly declined delivery');
    } else {
      analysis.issues.push('Did not clearly decline delivery');
    }
  }

  // Check for price at end
  if (allText.includes('$') || allText.includes('total')) {
    analysis.priceGiven = true;
    analysis.positives.push('Price provided');
  }

  // Check for pickup time
  if (allText.includes('minute') || allText.includes('ready') || allText.includes('pickup')) {
    analysis.pickupTimeGiven = true;
    analysis.positives.push('Pickup time mentioned');
  }

  // Check for unnecessary repetition or questions
  const questionCount = agentResponses.filter(r => r.includes('?')).length;
  if (questionCount > scenario.customer_script.length + 2) {
    analysis.unnecessaryQuestions = questionCount - scenario.customer_script.length - 2;
    analysis.issues.push(`Agent asked ${analysis.unnecessaryQuestions} possibly unnecessary questions`);
  }

  // Check for common issues
  if (allText.includes('credit card') || allText.includes('card number')) {
    analysis.issues.push('CRITICAL: Agent asked for credit card information');
  }

  if (allText.includes('allergen') || allText.includes('allergy advice')) {
    analysis.issues.push('CRITICAL: Agent gave allergen advice');
  }

  // Calculate score
  let score = 50; // Base score
  score += analysis.orderSummaryGiven ? 10 : 0;
  score += analysis.phoneNumberCollected ? 10 : 0;
  score += analysis.phoneNumberAskedAtEnd ? 5 : 0;
  score += analysis.priceGiven ? 10 : 0;
  score += analysis.pickupTimeGiven ? 5 : 0;
  score -= analysis.unnecessaryQuestions * 2;
  score -= analysis.issues.filter(i => i.includes('CRITICAL')).length * 20;
  score -= analysis.issues.filter(i => !i.includes('CRITICAL')).length * 5;

  // Bonus for scenario-specific behaviors
  if (scenario.category === 'basic_ordering' && analysis.sizeAsked) score += 5;
  if (scenario.category === 'unavailable_services' && analysis.deliveryRefused) score += 10;

  analysis.score = Math.max(0, Math.min(100, score));

  return analysis;
}

// Generate markdown report
function generateMarkdownReport(testResults) {
  const timestamp = new Date().toISOString();
  let md = `# Chat Scenario Test Results

**Test Run**: chat_test_${testResults.testNumber}
**Date**: ${timestamp}
**Total Scenarios**: ${testResults.scenarios.length}
**Average Score**: ${testResults.averageScore.toFixed(1)}/100

---

## Summary by Category

| Category | Avg Score | Count |
|----------|-----------|-------|
`;

  // Category summaries
  const categoryScores = {};
  for (const result of testResults.scenarios) {
    const cat = result.scenario.category;
    if (!categoryScores[cat]) {
      categoryScores[cat] = { total: 0, count: 0 };
    }
    categoryScores[cat].total += result.analysis.score;
    categoryScores[cat].count++;
  }

  for (const [category, data] of Object.entries(categoryScores)) {
    const avgScore = data.total / data.count;
    md += `| ${category} | ${avgScore.toFixed(1)} | ${data.count} |\n`;
  }

  md += `\n---\n\n## Key Issues Found\n\n`;

  // Collect all issues
  const allIssues = [];
  for (const result of testResults.scenarios) {
    for (const issue of result.analysis.issues) {
      allIssues.push({ scenario: result.scenario.id, issue });
    }
  }

  if (allIssues.length > 0) {
    for (const { scenario, issue } of allIssues) {
      md += `- **${scenario}**: ${issue}\n`;
    }
  } else {
    md += `*No critical issues found*\n`;
  }

  md += `\n---\n\n## Detailed Results\n\n`;

  // Individual scenario results
  for (const result of testResults.scenarios) {
    const status = result.analysis.score >= 80 ? '[PASS]' : result.analysis.score >= 60 ? '[WARN]' : '[FAIL]';

    md += `### ${status} ${result.scenario.name} (${result.scenario.id})

**Category**: ${result.scenario.category}
**Score**: ${result.analysis.score}/100

#### Analysis
`;

    if (result.analysis.positives.length > 0) {
      md += `**Positives:**\n`;
      for (const pos of result.analysis.positives) {
        md += `- ${pos}\n`;
      }
    }

    if (result.analysis.issues.length > 0) {
      md += `\n**Issues:**\n`;
      for (const issue of result.analysis.issues) {
        md += `- ${issue}\n`;
      }
    }

    md += `\n#### Transcript\n`;
    for (const turn of result.transcript) {
      if (turn.role === 'error') {
        md += `> **[ERROR]** ${turn.content}\n\n`;
      } else {
        const speaker = turn.role === 'agent' ? '**Sarah (Agent)**' : '**Customer**';
        md += `${speaker}: ${turn.content}\n\n`;
      }
    }

    md += `---\n\n`;
  }

  return md;
}

// CLI interface
function printUsage() {
  console.log(`
Chat Scenario Test Runner

Usage:
  node chatScenarioTest.js [options]

Options:
  --scenarios <ids>    Run specific scenarios (comma-separated)
  --limit <n>          Run first n scenarios
  --category <name>    Run all scenarios in a category
  --help               Show this help message

Examples:
  node chatScenarioTest.js --limit 5
  node chatScenarioTest.js --scenarios order_001,order_002
  node chatScenarioTest.js --category guardrails
`);
}

const args = process.argv.slice(2);
let scenarioIds = null;
let limit = null;
let category = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--help') {
    printUsage();
    process.exit(0);
  }
  if (args[i] === '--scenarios' && args[i + 1]) {
    scenarioIds = args[i + 1].split(',').map(s => s.trim());
  }
  if (args[i] === '--limit' && args[i + 1]) {
    limit = parseInt(args[i + 1]);
  }
  if (args[i] === '--category' && args[i + 1]) {
    category = args[i + 1].trim();
  }
}

// Main test runner
async function runTests(scenarioIds = null, limit = null, category = null) {
  console.log('\n' + '='.repeat(60));
  console.log('FAR EAST RESTAURANT CHAT SCENARIO TEST');
  console.log('='.repeat(60));

  const testNumber = getNextTestNumber();
  console.log(`\nTest Run #${testNumber}`);

  // Filter scenarios
  let testScenarios = scenarios.test_scenarios;

  if (category) {
    testScenarios = testScenarios.filter(s => s.category === category);
    console.log(`Running category: ${category}`);
  }

  if (scenarioIds && scenarioIds.length > 0) {
    testScenarios = testScenarios.filter(s => scenarioIds.includes(s.id));
    console.log(`Running specific scenarios: ${scenarioIds.join(', ')}`);
  } else if (limit) {
    testScenarios = testScenarios.slice(0, limit);
    console.log(`Running first ${limit} scenarios`);
  }

  if (testScenarios.length === 0) {
    console.log('No scenarios match the criteria. Exiting.');
    process.exit(1);
  }

  console.log(`Total scenarios to run: ${testScenarios.length}\n`);

  const results = [];
  let totalScore = 0;

  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    console.log(`\nProgress: ${i + 1}/${testScenarios.length}`);

    // Run the scenario
    const conversationResult = await runScenario(scenario);

    // Analyze the conversation
    console.log('\nAnalyzing conversation...');
    const analysis = analyzeConversation(scenario, conversationResult);
    totalScore += analysis.score;

    results.push({
      scenario: {
        id: scenario.id,
        name: scenario.name,
        category: scenario.category,
        personality: scenario.personality,
        description: scenario.description,
        test_objectives: scenario.test_objectives,
        expected_agent_behaviors: scenario.expected_agent_behaviors
      },
      transcript: conversationResult.transcript,
      analysis: analysis
    });

    console.log(`\nScore: ${analysis.score}/100`);
    if (analysis.issues.length > 0) {
      console.log('Issues:', analysis.issues.join('; '));
    }

    // Delay between scenarios
    if (i < testScenarios.length - 1) {
      await sleep(1000);
    }
  }

  const averageScore = results.length > 0 ? totalScore / results.length : 0;

  const testResults = {
    testNumber,
    timestamp: new Date().toISOString(),
    totalScenarios: results.length,
    averageScore,
    categoryFilter: category || 'all',
    scenarios: results
  };

  // Save JSON results
  const jsonPath = path.join(outputDir, `chat_test_${testNumber}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(testResults, null, 2));
  console.log(`\nJSON results saved to: ${jsonPath}`);

  // Save Markdown report
  const mdPath = path.join(outputDir, `chat_test_${testNumber}.md`);
  const mdReport = generateMarkdownReport(testResults);
  fs.writeFileSync(mdPath, mdReport);
  console.log(`Markdown report saved to: ${mdPath}`);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Scenarios: ${results.length}`);
  console.log(`Average Score: ${averageScore.toFixed(1)}/100`);
  console.log(`Pass Rate (>=80): ${(results.filter(r => r.analysis.score >= 80).length / results.length * 100).toFixed(1)}%`);
  console.log('='.repeat(60));

  return testResults;
}

// Run the tests
runTests(scenarioIds, limit, category).catch(console.error);
