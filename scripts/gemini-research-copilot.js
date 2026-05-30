#!/usr/bin/env node

/**
 * Gemini Research Task: Copilot Chat MS Office365 Standard Capabilities
 * Research what Copilot Chat can do in MS Office365 Standard tier
 */

require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not set in .env.local');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function research() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Research and provide a comprehensive answer:

## Question: What can Copilot Chat do in MS Office365 Standard tier?

Please research and answer:

1. **Capabilities in Office365 Standard**
   - Which Office apps support Copilot Chat (Word, Excel, PowerPoint, Teams, Outlook)?
   - What specific tasks can it do in each app?
   - Are there limitations compared to Premium tier?

2. **Integration Potential for CIT IT Support System**
   - Can we embed Copilot Chat in a custom web app?
   - Can we use Microsoft Graph API to access Copilot capabilities?
   - What authentication/permissions are needed?
   - Can we use it for document analysis (ticket attachments, reports)?

3. **Cost & Licensing**
   - Is Copilot Chat included in Office365 Standard?
   - What's the cost if separate? (per user/month)
   - Compare to Groq (free unlimited) vs Claude (pay-per-token)

4. **Use Cases for CIT**
   - Analyze customer tickets in Word
   - Generate solutions in Excel
   - Create presentations in PowerPoint
   - Summarize long email chains
   - Generate SQL queries from natural language

5. **Technical Requirements**
   - API endpoints available?
   - SDK/libraries for integration?
   - Rate limits?
   - Document size limits?

6. **Comparison with Alternatives**
   - Groq: Free, fast, code-focused
   - Claude: Powerful, reasoning, costs money
   - Gemini: Research-focused, free tier
   - **Copilot Chat**: Office-integrated, what's the advantage?

Return a structured analysis with:
- What's possible
- What's NOT possible
- Best use cases for CIT
- Integration difficulty (Easy/Medium/Hard)
- Recommended approach`;

    console.log('🔍 Requesting Gemini research on Copilot Chat MS Office365...\n');

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 GEMINI RESEARCH: COPILOT CHAT MS OFFICE365 STANDARD');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(response);
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ Research complete\n');

  } catch (err) {
    console.error('❌ Gemini research failed:', err.message);
    process.exit(1);
  }
}

research();
