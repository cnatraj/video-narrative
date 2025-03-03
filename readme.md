# YouTube Narrative Service

A web application that analyzes YouTube videos and generates narrative descriptions of their content using AI.

## Features

- Process YouTube videos by URL
- Upload and process local video files
- Generate detailed narratives and summaries
- Create video timelines with frame-by-frame descriptions
- Extract and analyze audio transcripts
- Intelligent frame selection to focus on significant changes

## Tech Stack

- **Frontend**: Vue.js with Vuetify
- **Backend**: Node.js with Express
- **AI**: OpenAI GPT-4o-mini for image analysis and narrative generation
- **Video Processing**: FFmpeg for frame extraction and audio processing
- **YouTube Integration**: ytdl-core for downloading and processing YouTube videos

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- FFmpeg (installed automatically via ffmpeg-static)
- OpenAI API key (optional, mock data will be used if not provided)

### Installation

1. Clone the repository:

   ```
   git clone https://github.com/yourusername/youtube-narrative.git
   cd youtube-narrative-service
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following content:
   ```
   PORT=3001
   VITE_API_URL=http://localhost:3001/api
   OPENAI_API_KEY=your_openai_api_key_here
   ```

### Running the Application

1. Start the development server:

   ```
   npm run dev
   ```

2. In a separate terminal, start the backend server:

   ```
   npm run server
   ```

3. Open your browser and navigate to `http://localhost:5173`

## Usage

1. Enter a YouTube URL or upload a video file
2. Click "Generate Narrative" or "Upload & Generate Narrative"
3. Wait for the processing to complete
4. View the generated narrative, summary, and timeline

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenAI for providing the AI models
- FFmpeg for video processing capabilities
- Vue.js and Vuetify for the frontend framework
