# MediRead

MediRead is an accessibility-focused web application designed to make medicine-label information easier to understand and access. It aims to support elderly users and people with visual impairments through simplified medicine information, audio assistance, and a straightforward interface.

## Overview

Medicine packaging can be difficult to read, particularly for users with visual difficulties or those who struggle with complex medical terminology. MediRead aims to address this challenge by presenting medicine information in a more accessible format and providing audio assistance for users who prefer listening over reading.

The current version demonstrates the core user experience using sample medicine data and simulated text recognition.

## Features

- **Medicine Scanning:** Demonstrates a medicine-label scanning workflow using simulated OCR results.
- **Simplified Information:** Presents sample medicine information in a clear and accessible format.
- **Text-to-Speech:** Supports audio playback of text using the browser's Web Speech API, subject to available voices and language support.
- **Language Support:** Provides English and Hindi listening options where supported.
- **Medicine History:** Allows users to revisit previous demo scans.
- **Saved Medicines:** Provides access to saved medicine information.
- **Expiry Awareness:** Highlights expiry information available in the sample data.
- **Pharmacist Guidance:** Helps users prepare simple questions to ask a pharmacist when information is missing or unclear.
- **Accessible Interface:** Uses readable typography, clear navigation, and responsive layouts.

## Technology Stack

- React — user interface
- Vite — development server and build tooling
- JavaScript — application logic
- CSS — styling and responsive design
- Web Speech API — browser-based text-to-speech

## Installation and Setup

### Prerequisites

Ensure the following are installed:

- [Node.js](https://nodejs.org/) (LTS recommended)
- [Git](https://git-scm.com/)

### 1. Clone the repository

```bash
git clone https://github.com/YOUR-GITHUB-USERNAME/MediRead.git
cd MediRead
```

Replace `YOUR-GITHUB-USERNAME` with the repository owner's GitHub username.

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

### 4. Open the application

Open the local URL displayed in the terminal, typically:

`http://localhost:5173`

Keep the terminal running while using the application.

*Note: These instructions assume the frontend's `package.json` is in the repository root. If the project uses a separate frontend directory, run the commands from that directory instead.*

## Testing the Demo

For evaluation, users can explore the application and try the available demo workflows:

1. Open the landing page and navigate to the main application.
2. Explore the simulated medicine-scanning process.
3. Review the sample medicine information and expiry details.
4. Test the available text-to-speech and language controls.
5. Explore saved medicines, scan history, and pharmacist guidance.

Audio functionality depends on browser support and the voices available on the system.

## Current Limitations

The current version uses simulated OCR and sample medicine data. Uploading an image does not necessarily mean its contents are being recognized or medically verified. Features and persistence may also depend on the current implementation and browser.

Real medicine-label recognition, secure authentication, database-backed storage, and private image handling are potential future enhancements.

## Medical Disclaimer

MediRead is a demonstration project intended to improve access to medicine information. It does not replace professional medical advice, diagnosis, or treatment. Users should verify medicine details and instructions with the original packaging or a qualified healthcare professional.

## Project Objective

The objective of MediRead is to explore how accessible interface design and audio-based assistance can help make medicine information easier to access and understand.
