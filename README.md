# ContractEngine

A React-based application for generating Schedule A/B-style physician contracts.

## Features

- Template management for contract generation
- Provider data management
- Bulk contract generation
- Audit logging for FMV overrides

## Tech Stack

- React 18 + TypeScript
- Redux Toolkit
- Tailwind CSS + shadcn/ui
- React Router
- react-hook-form + zod
- docx + pdf-lib (for document generation)
- papaparse (for CSV handling)

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Project Structure

```
src/
├── components/       # Shared UI components
├── features/         # Feature modules
│   ├── templates/    # Template management
│   ├── providers/    # Provider data management
│   ├── generator/    # Contract generation
│   └── audit/        # Audit logging
├── store/           # Redux store configuration
├── types/           # TypeScript type definitions
└── utils/           # Utility functions
```

# Redeploy Trigger

This line was added to trigger a redeployment on AWS Amplify. (2024-06-19) 