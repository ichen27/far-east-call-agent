# Far East Call Agent

A Twilio-powered voice agent built with Express and OpenAI.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- A [Twilio](https://www.twilio.com/) account
- An [OpenAI](https://openai.com/) API key

## Setup

1. **Navigate to the backend source directory:**
   ```bash
   cd backend/src
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create a `.env` file** in `backend/src/` with your credentials:
   ```env
   OPENAI_API_KEY=your_openai_api_key
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   ```

4. **Run the server:**
   ```bash
   npm run dev
   ```

## Dependencies

| Package | Description |
|---------|-------------|
| express | Web server framework |
| twilio | Twilio SDK for voice calls |
| @openai/agents | OpenAI Agents SDK |
| @openai/agents-extensions | OpenAI Agents extensions |
| ws | WebSocket support |
| dotenv | Environment variable management |

