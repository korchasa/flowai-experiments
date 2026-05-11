# Images-Hard: Text-to-Image Benchmark Suite

## Overview

Images-Hard is a comprehensive benchmark suite designed to evaluate the capabilities of
text-to-image generation models on challenging, real-world tasks. Unlike typical benchmarks that
focus on general image quality, Images-Hard emphasizes "hard" scenarios that expose model
limitations in accuracy, consistency, and complex reasoning.

## Key Features

- **12 Challenging Test Cases**: Carefully designed prompts that test specific model capabilities
- **Multiple Model Support**: Compatible with major AI image generation services via OpenRouter API
- **Automated Benchmarking**: Command-line tool for running systematic evaluations
- **Web-based Results Viewer**: Interactive interface for analyzing benchmark results
- **Detailed Evaluation Criteria**: Each test case includes specific checklists for objective
  scoring

## Current Supported Models

- Google Gemini 2.5 Flash Image
- Google Gemini 3.1 Flash Image Preview
- OpenAI GPT-5 Image
- OpenAI GPT-5.4 Image 2
- Google Gemini 3 Pro Image Preview
- Black Forest Labs Flux 2 Max

## Test Cases Overview

### TC-01: Text & Typography Poster

Tests multilingual text rendering accuracy, kerning, and readability with complex layouts.

### TC-02: Hands / Fingers / Contact + Reflection

Evaluates anatomical accuracy, contact physics, and reflective surface rendering.

### TC-03: Exact Counting + Spatial Rules

Tests precise counting, geometric consistency, and rule-based positioning.

### TC-04: Identity Consistency Across 6 Views

Assesses character consistency across multiple viewing angles.

### TC-05: 3×3 Comic (9 panels) + Exact Dialog

Evaluates narrative continuity and exact text reproduction in sequential art.

### TC-06: Electrical Schematic (Formal correctness)

Tests technical drawing accuracy and symbol recognition.

### TC-07: Floor Plan (Geometry + dimensions + areas)

Evaluates architectural drawing precision and dimensional accuracy.

### TC-08: District Map (Topology + labeled POIs)

Tests cartographic accuracy and spatial relationships.

### TC-10: Catalog Product Render (DIN-rail PSU) + Readable Markings

Assesses industrial product rendering and technical labeling.

### TC-11: Optics/Physics (Prism + water + spectrum + caustics)

Evaluates physical optics simulation and light behavior.

### TC-12: Combined Stress Test (A-D set, invariants + minimal diffs)

Tests consistency across similar scenes with controlled variations.

## Quick Start

1. **Install Dependencies**
   ```bash
   # Ensure Deno is installed
   curl -fsSL https://deno.land/install.sh | sh
   ```

2. **Set API Key**
   ```bash
   echo 'OPENROUTER_API_KEY=your_api_key_here' > .env
   ```

3. **Run Benchmark**
   ```bash
   deno run --env-file=.env --allow-write --allow-read --allow-net --allow-env ./bench.ts ./public/results
   ```

   Targeted runs:
   ```bash
   deno run --env-file=.env --allow-write --allow-read --allow-net --allow-env ./bench.ts ./public/results --model google/gemini-3.1-flash-image-preview --prompt TC-01,TC-02
   deno run --env-file=.env --allow-write --allow-read --allow-net --allow-env ./bench.ts ./public/results --model openai/gpt-5.4-image-2 --limit 1
   ```

   Optional tuning:
   ```bash
   OPENROUTER_IMAGE_MAX_TOKENS=1024 OPENROUTER_REQUEST_TIMEOUT_MS=60000 deno run --env-file=.env --allow-write --allow-read --allow-net --allow-env ./bench.ts ./public/results --model openai/gpt-5.4-image-2 --limit 1
   ```

4. **View Results**
   ```bash
   # Start local HTTP server
   python3 -m http.server 8000
   # Open http://localhost:8000/public/
   ```

## Project Structure

```
images-hard/
├── bench.ts              # Main benchmarking script
├── public/
│   ├── config.yaml       # Test case definitions and model list
│   ├── index.html        # Web results viewer
│   └── results/          # Generated images and reports
├── documents/            # Project documentation
├── deno.json            # Deno configuration
└── .gitignore          # Git ignore rules
```

## Methodology

Images-Hard employs a rigorous evaluation methodology:

1. **Objective Criteria**: Each test case includes specific, measurable requirements
2. **Consistency Checks**: Models are evaluated on their ability to maintain invariants
3. **Error Categorization**: Failures are classified by type (anatomical, spatial, textual, etc.)
4. **Comparative Analysis**: Results enable direct comparison between models

## Contributing

### Adding New Test Cases

1. Add test case definition to `public/config.yaml`
2. Include detailed prompt, checklist, and evaluation criteria
3. Test with multiple models to ensure discriminability
4. Update documentation

### Adding New Models

1. Add model ID to `models` list in `config.yaml`
2. Ensure model is available via OpenRouter API
3. Run benchmark to validate compatibility

## License

This project is open source. See individual file headers for licensing information.

## Contact

For questions or contributions, please open an issue or pull request on the project repository.
