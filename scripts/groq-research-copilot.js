#!/usr/bin/env node

/**
 * Groq Research Task: Copilot Chat MS Office365 + Openclaw
 * Research Copilot Chat and Openclaw capabilities for CIT integration
 */

require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

if (!GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY not set');
  process.exit(1);
}

async function research() {
  try {
    const prompt = `You are a technical research expert. Provide a comprehensive analysis:

## RESEARCH TOPICS:

### 1. Microsoft Copilot Chat in Office365 Standard
- **Capabilities**: What can it do in Word, Excel, PowerPoint, Teams, Outlook?
- **Integration**: Can we embed it in web apps? Microsoft Graph API access?
- **Limitations**: What's missing in Standard tier vs Premium?
- **Cost**: Is it included? If separate, what's the cost?
- **Use for CIT**: Document analysis, ticket summaries, SQL generation from natural language?

### 2. Openclaw AI Platform
- **What is it**: Overview and main features
- **Architecture**: How does it work? Multi-agent system?
- **Capabilities**: What can Openclaw do vs Groq vs Claude?
- **Open source**: Is it? Can we self-host?
- **Use case**: Why use Openclaw instead of Groq/Claude?
- **Integration**: How to integrate with Next.js?

### 3. Multi-Agent AI for CIT System
Consider: Groq (fast, free) + Claude (powerful) + Gemini (research) + Openclaw (?)
- **Orchestrator logic**: When to use which AI?
- **Cost efficiency**: Which combinations are cheapest?
- **Best practices**: How to structure multi-agent systems?

### 4. Recommendation for CIT
- **Best AI stack** for CIT IT Support System
- **Copilot Chat integration**: Worth it?
- **Openclaw**: Should we explore it?
- **Groq + Claude combo**: Is this optimal?
- **RAG strategy**: How to connect AI to CIT knowledge base?

Provide a detailed, structured analysis. Be specific about capabilities, limitations, and ROI.`;

    console.log('🔍 Requesting Groq research on Copilot Chat, Openclaw, and Multi-Agent strategy...\n');

    const response = await axios.post(GROQ_URL, {
      model: 'mixtral-8x7b-32768',
      messages: [
        {
          role: 'system',
          content: 'You are a senior technical architect specializing in AI systems and Office365 integration. Provide detailed, practical analysis.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 3000,
      top_p: 0.9
    }, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const research = response.data.choices[0].message.content;
    const usage = response.data.usage;

    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 GROQ RESEARCH: COPILOT CHAT + OPENCLAW + MULTI-AGENT');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(research);
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`✅ Research complete\n📈 Tokens used: ${usage.total_tokens}`);
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (err) {
    console.error('❌ Groq research failed:', err.message);
    if (err.response?.data) {
      console.error('Response:', err.response.data);
    }
    process.exit(1);
  }
}

research();
