#!/usr/bin/env -S deno run --allow-write --allow-read --allow-net --allow-env

/**
 * Script for generating images from prompts using OpenRouter API
 *
 * Performs benchmarking of various models on their ability to generate images
 * based on given text descriptions. Supports multiple API response formats.
 */

// import { OpenRouter } from "npm:@openrouter/sdk";

interface Prompt {
  id: string;
  name: string;
  prompt: string;
  checklist?: string[];
  params?: {
    size?: string;
    aspect_ratio?: string;
    [key: string]: unknown;
  };
}

interface Config {
  models: string[];
  prompts: Prompt[];
}

interface ImageGenerationResult {
  success: boolean;
  imagePath?: string;
  url?: string;
  b64_json?: string;
  revisedPrompt?: string;
  error?: string;
}

interface ImageReference {
  url?: string;
  b64_json?: string;
}

interface PromptResult {
  promptId: string;
  promptName: string;
  results: ImageGenerationResult[];
  createdAt: string;
}

interface ModelReport {
  modelId: string;
  modelInfo: Model | null;
  results: PromptResult[];
  stats: {
    totalPrompts: number;
    successfulGenerations: number;
    errors: string[];
  };
}

interface Model {
  id: string;
  object?: string;
  created?: number;
  owned_by?: string;
  permission?: unknown[];
  root?: string;
  parent?: string | null;
  context_length?: number;
  architecture?: {
    modality?: string;
    tokenizer?: string;
    instruct_type?: string | null;
  };
  top_provider?: {
    max_completion_tokens?: number | null;
    is_moderated?: boolean;
  };
  output_modality?: string;
  popularity?: number;
  name?: string;
  description?: string;
  [key: string]: unknown;
}

interface Report {
  createdAt: string;
  models: ModelReport[];
  summary: {
    totalModels: number;
    processedModels: number;
    modelsWithErrors: number;
    totalPrompts: number;
    totalSuccessfulGenerations: number;
    totalErrors: number;
  };
}

const DEFAULT_REQUEST_TIMEOUT_MS = 120_000;
const REQUEST_TIMEOUT_MS = Number(
  Deno.env.get("OPENROUTER_REQUEST_TIMEOUT_MS") ?? DEFAULT_REQUEST_TIMEOUT_MS,
);
const DEFAULT_IMAGE_MAX_TOKENS = 1024;
const IMAGE_MAX_TOKENS = Number(
  Deno.env.get("OPENROUTER_IMAGE_MAX_TOKENS") ?? DEFAULT_IMAGE_MAX_TOKENS,
);
const DEFAULT_MAX_RETRIES = 2;
const MAX_RETRIES = Number(
  Deno.env.get("OPENROUTER_MAX_RETRIES") ?? DEFAULT_MAX_RETRIES,
);
const DEFAULT_RETRY_BACKOFF_MS = 5_000;
const RETRY_BACKOFF_MS = Number(
  Deno.env.get("OPENROUTER_RETRY_BACKOFF_MS") ?? DEFAULT_RETRY_BACKOFF_MS,
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  let didTimeout = false;

  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      didTimeout = true;
      controller.abort();
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    operation(controller.signal)
      .then((result) => {
        if (!didTimeout) {
          resolve(result);
        }
      })
      .catch((error) => {
        if (!didTimeout) {
          reject(error);
        }
      })
      .finally(() => clearTimeout(timeoutId));
  });
}

function withPromiseTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    operation()
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeoutId));
  });
}

function extractTextFromContent(content: unknown): string | null {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return null;
  }

  const parts: string[] = [];
  for (const item of content) {
    if (typeof item === "string") {
      parts.push(item);
      continue;
    }

    if (!isRecord(item)) {
      continue;
    }

    const text = typeof item.text === "string"
      ? item.text
      : typeof item.output_text === "string"
      ? item.output_text
      : typeof item.content === "string"
      ? item.content
      : null;

    if (text) {
      parts.push(text);
    }
  }

  return parts.length > 0 ? parts.join("\n") : null;
}

function normalizeImageReference(candidate: unknown): ImageReference | null {
  if (typeof candidate === "string") {
    if (candidate.startsWith("data:image/") || candidate.startsWith("http")) {
      return { url: candidate };
    }
    return null;
  }

  if (!isRecord(candidate)) {
    return null;
  }

  const imageUrlObject = isRecord(candidate.image_url)
    ? candidate.image_url
    : isRecord(candidate.imageUrl)
    ? candidate.imageUrl
    : null;

  const urlCandidate = typeof candidate.url === "string"
    ? candidate.url
    : imageUrlObject && typeof imageUrlObject.url === "string"
    ? imageUrlObject.url
    : typeof candidate.data === "string" &&
        candidate.data.startsWith("data:image/")
    ? candidate.data
    : null;

  if (urlCandidate) {
    return { url: urlCandidate };
  }

  const b64Candidate = typeof candidate.b64_json === "string"
    ? candidate.b64_json
    : typeof candidate.b64 === "string"
    ? candidate.b64
    : typeof candidate.base64 === "string"
    ? candidate.base64
    : typeof candidate.data === "string"
    ? candidate.data
    : null;

  if (b64Candidate) {
    return { b64_json: b64Candidate };
  }

  return null;
}

function extractImageReferenceFromContent(
  content: unknown,
): ImageReference | null {
  if (typeof content === "string") {
    const dataUrlMatch = content.match(
      /data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/,
    );
    if (dataUrlMatch) {
      return { url: dataUrlMatch[0] };
    }

    const urlMatch = content.match(/https?:\/\/\S+/);
    if (urlMatch) {
      return { url: urlMatch[0] };
    }

    return null;
  }

  if (!Array.isArray(content)) {
    return null;
  }

  for (const item of content) {
    const imageRef = normalizeImageReference(item);
    if (imageRef) {
      return imageRef;
    }

    if (isRecord(item) && "content" in item) {
      const nestedImageRef = extractImageReferenceFromContent(item.content);
      if (nestedImageRef) {
        return nestedImageRef;
      }
    }
  }

  return null;
}

function decodeBase64ImageData(data: string): Uint8Array {
  const normalized = data.startsWith("data:image/")
    ? data.slice(data.indexOf(",") + 1)
    : data;

  return Uint8Array.from(atob(normalized), (char) => char.charCodeAt(0));
}

function isRetriableError(error: string | undefined): boolean {
  if (!error) {
    return false;
  }

  const normalized = error.toLowerCase();
  return normalized.includes("request timed out") ||
    normalized.includes("rate limit") ||
    normalized.includes(" 429 ") ||
    normalized.includes('code":429') ||
    normalized.includes("temporarily unavailable");
}

function parseRetryDelayMs(error: string | undefined): number | null {
  if (!error) {
    return null;
  }

  const match = error.match(/try again in (\d+)(ms|s)/i);
  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  return unit === "s" ? amount * 1000 : amount;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Loads configuration from YAML file
 */
async function loadConfig(configFile: string): Promise<Config> {
  try {
    const yamlContent = await Deno.readTextFile(configFile);
    const { parse } = await import("https://deno.land/std@0.224.0/yaml/mod.ts");
    const data = parse(yamlContent) as Config;
    if (!data || typeof data !== "object") {
      throw new Error("Config file must contain an object");
    }
    if (!Array.isArray(data.models)) {
      throw new Error("Config must contain 'models' array");
    }
    if (!Array.isArray(data.prompts)) {
      throw new Error("Config must contain 'prompts' array");
    }
    return data;
  } catch (error) {
    console.error(
      `❌ Error loading config from ${configFile}:`,
      error instanceof Error ? error.message : String(error),
    );
    Deno.exit(1);
  }
}

/**
 * Gets model IDs from config
 */
function getModelsFromConfig(config: Config): string[] {
  return config.models;
}

/**
 * Gets model information by ID (simplified - returns basic info since we use config models)
 */
async function getModelInfo(
  modelId: string,
): Promise<Model | null> {
  try {
    // Since we now use only models from config.yaml, return basic model info
    // In the future, this could be extended to fetch individual model info if needed
    return {
      id: modelId,
      name: modelId, // Use ID as name for now
      object: "model",
    };
  } catch (error) {
    console.error(
      `❌ Error creating model info for ${modelId}:`,
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

/**
 * Generates image through OpenRouter API with automatic model type detection
 *
 * Supports multiple response formats:
 * - Direct access to message.images (SDK format)
 * - Standard OpenAI chat completions format in finalResponse.choices
 * - Direct access to response.choices
 * - Image URLs in message content (fallback option)
 */
/**
 * Generates image through OpenRouter API using fetch
 */
async function generateImage(
  prompt: Prompt,
  modelId: string,
  apiKey: string,
  verbose: boolean = false,
): Promise<ImageGenerationResult> {
  // Use native fetch for image generation to match working curl example
  try {
    const requestPayload: any = {
      model: modelId,
      messages: [
        {
          role: "user",
          content: prompt.prompt,
        },
      ],
      modalities: ["image", "text"],
      max_tokens: IMAGE_MAX_TOKENS,
      stream: false,
    };

    // Add optional parameters if present
    if (prompt.params) {
      if (prompt.params.aspect_ratio) {
        requestPayload.image_config = {
          aspect_ratio: prompt.params.aspect_ratio,
        };
      }
      // Merge other params
      Object.entries(prompt.params).forEach(([key, value]) => {
        if (key !== "aspect_ratio" && key !== "size") {
          requestPayload[key] = value;
        }
      });
    }

    if (verbose) {
      console.error(`🔍 [VERBOSE] Generating image with model: ${modelId}`);
      console.error(
        `🔍 [VERBOSE] Prompt: ${prompt.prompt.substring(0, 100)}...`,
      );
      console.error(
        `🔍 [VERBOSE] Full request:`,
        JSON.stringify(requestPayload, null, 2),
      );
    }

    const response = await withTimeout(
      (signal) =>
        fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestPayload),
          signal,
        }),
      REQUEST_TIMEOUT_MS,
    );

    const responseText = await withPromiseTimeout(
      () => response.text(),
      REQUEST_TIMEOUT_MS,
    );

    if (!response.ok) {
      const errorText = responseText;
      throw new Error(
        `API Error: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const responseData = JSON.parse(responseText);

    if (isRecord(responseData.error)) {
      const errorMessage = typeof responseData.error.message === "string"
        ? responseData.error.message
        : JSON.stringify(responseData.error);
      return {
        success: false,
        error: `API Error: ${errorMessage}`,
      };
    }

    // Extract result from chat response
    const message = responseData.choices?.[0]?.message;
    const messageText = extractTextFromContent(message?.content);

    // In verbose mode, output the full response for problem diagnostics
    if (verbose) {
      console.error(
        `🔍 [VERBOSE] Full response:`,
        JSON.stringify(responseData, null, 2),
      );
      console.error(
        `🔍 [VERBOSE] Response structure:`,
        JSON.stringify(
          {
            hasMessage: !!message,
            hasImages: !!(message && message.images),
            imagesCount: Array.isArray(message?.images)
              ? message.images.length
              : 0,
            contentType: Array.isArray(message?.content)
              ? "array"
              : typeof message?.content,
            hasContent: !!messageText,
            contentPreview: messageText ? messageText.substring(0, 200) : null,
            hasReasoning: !!(message && (message.reasoning || message.thought)),
            hasChoices: !!responseData.choices,
            choicesCount: responseData.choices
              ? responseData.choices.length
              : 0,
          },
          null,
          2,
        ),
      );
    }

    const messageImages = Array.isArray(message?.images) ? message.images : [];
    if (messageImages.length > 0 && verbose) {
      console.error(
        `🔍 [VERBOSE] Found images in message.images: ${messageImages.length}`,
      );
    }

    for (const image of messageImages) {
      const imageRef = normalizeImageReference(image);
      if (imageRef) {
        if (verbose) {
          console.error(
            `🔍 [VERBOSE] Extracted image from message.images (${
              imageRef.url ? "url" : "base64"
            })`,
          );
        }
        return {
          success: true,
          ...imageRef,
          revisedPrompt: messageText ?? undefined,
        };
      }
    }

    const contentImageRef = extractImageReferenceFromContent(message?.content);
    if (contentImageRef) {
      if (verbose) {
        console.error(`🔍 [VERBOSE] Extracted image from message.content`);
      }
      return {
        success: true,
        ...contentImageRef,
        revisedPrompt: messageText ?? undefined,
      };
    }

    const topLevelImages = Array.isArray(responseData.images)
      ? responseData.images
      : [];
    for (const image of topLevelImages) {
      const imageRef = normalizeImageReference(image);
      if (imageRef) {
        if (verbose) {
          console.error(
            `🔍 [VERBOSE] Extracted image from top-level response.images`,
          );
        }
        return {
          success: true,
          ...imageRef,
          revisedPrompt: messageText ?? undefined,
        };
      }
    }

    // Check if we have reasoning but no image
    if (
      message && (message.reasoning || message.thought) &&
      messageImages.length === 0
    ) {
      const reasoning = message.reasoning || message.thought;
      if (verbose) {
        console.error(
          `🔍 [VERBOSE] Model returned reasoning but no image. Reasoning preview: ${
            reasoning.substring(0, 100)
          }...`,
        );
      }
      return {
        success: false,
        error:
          `Model returned reasoning (${reasoning.length} chars) but no image. Try increasing max_tokens or adjusting prompt.`,
      };
    }

    return {
      success: false,
      error: messageText
        ? `No image data in response. Message preview: ${
          messageText.substring(0, 200)
        }`
        : "No image data in response",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (verbose) {
      console.error(`🔍 [VERBOSE] Generation failed:`, errorMessage);
    }
    return {
      success: false,
      error: errorMessage.includes("aborted")
        ? `Request timed out after ${REQUEST_TIMEOUT_MS}ms`
        : errorMessage,
    };
  }
}

/**
 * Downloads and saves an image
 */
async function saveImage(
  result: ImageGenerationResult,
  modelId: string,
  promptId: string,
  outputDir: string,
  verbose: boolean = false,
): Promise<string | null> {
  try {
    const safeModelId = modelId.replace(/[^a-zA-Z0-9]/g, "_");
    const safePromptId = promptId.replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `${safeModelId}_${safePromptId}.png`;
    const filepath = `${outputDir}/${filename}`;

    let imageBuffer: Uint8Array;

    if (result.b64_json) {
      if (verbose) {
        console.error(`🔍 [VERBOSE] Decoding base64 image data`);
      }
      imageBuffer = decodeBase64ImageData(result.b64_json);
    } else if (result.url) {
      if (result.url.startsWith("data:image/")) {
        if (verbose) {
          console.error(`🔍 [VERBOSE] Decoding data URL image`);
        }
        imageBuffer = decodeBase64ImageData(result.url);
      } else {
        if (verbose) {
          console.error(`🔍 [VERBOSE] Downloading image from ${result.url}`);
        }
        const imageResponse = await withTimeout(
          (signal) => fetch(result.url!, { signal }),
          REQUEST_TIMEOUT_MS,
        );
        if (!imageResponse.ok) {
          throw new Error(
            `Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`,
          );
        }
        imageBuffer = new Uint8Array(
          await withPromiseTimeout(
            () => imageResponse.arrayBuffer(),
            REQUEST_TIMEOUT_MS,
          ),
        );
      }
    } else {
      throw new Error("No image data available");
    }

    await Deno.writeFile(filepath, imageBuffer);
    if (verbose) {
      console.error(`🔍 [VERBOSE] Saved image to ${filepath}`);
    }

    return filepath;
  } catch (error) {
    console.error(
      `❌ Error saving image for ${modelId}/${promptId}:`,
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

/**
 * Shows usage help
 */
function showHelp() {
  console.error(`
🚀 Image Generation Benchmarking

USAGE:
  ./bench.ts [options] <output_dir> [--model <model_id>]

OPTIONS:
  --help, -h         Show this help
  --check            Run quick test with first model and first prompt only
  --model <id>       Model ID(s) to use, comma-separated (if not specified, reads from config.yaml)
  --prompt <id>      Prompt ID(s) to run, comma-separated
  --limit <n>        Limit prompts after filters are applied
  --config <file>    Path to config YAML file (default: ./public/config.yaml)
  --verbose, -v      Output raw API requests and responses

PARAMETERS:
  output_dir         Directory to save results and generated images.

EXAMPLES:
  ./bench.ts ./results/
  ./bench.ts ./results/ --model stability-ai/stable-diffusion-3-medium
  ./bench.ts ./results/ --model model1,model2,model3
  ./bench.ts ./results/ --prompt TC-01,TC-02
  ./bench.ts ./results/ --limit 3
  ./bench.ts ./results/ --verbose

ENVIRONMENT VARIABLES:
  OPENROUTER_API_KEY    OpenRouter API key (required)
  OPENROUTER_REQUEST_TIMEOUT_MS
                       Request timeout in milliseconds (default: 120000)
  OPENROUTER_IMAGE_MAX_TOKENS
                       Max completion tokens for image requests (default: 1024)
  OPENROUTER_MAX_RETRIES
                       Retries for timeout/rate-limit errors (default: 2)
  OPENROUTER_RETRY_BACKOFF_MS
                       Base backoff in milliseconds (default: 5000)
`);
}

/**
 * Processes prompts for a single model and returns results
 */
async function processModel(
  modelId: string,
  prompts: Prompt[],
  apiKey: string,
  outputDir: string,
  verbose: boolean,
  createdAt: string,
): Promise<ModelReport> {
  console.error("\n==================================================");
  console.error(`🔄 Processing model: ${modelId}`);

  // Get model information
  const modelInfo = await getModelInfo(modelId);
  if (!modelInfo) {
    console.error(`❌ Model ${modelId} not found in API`);
    return {
      modelId,
      modelInfo: null,
      results: [],
      stats: {
        totalPrompts: 0,
        successfulGenerations: 0,
        errors: [`Model ${modelId} not found in API`],
      },
    };
  }

  console.error(`📊 Prompts to process: ${prompts.length}`);

  const promptResults: PromptResult[] = [];
  let totalPrompts = 0;
  let successfulGenerations = 0;
  const errors: string[] = [];

  for (const prompt of prompts) {
    const safeModelId = modelId.replace(/[^a-zA-Z0-9]/g, "_");
    const safePromptId = prompt.id.replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `${safeModelId}_${safePromptId}.png`;
    const filepath = `${outputDir}/${filename}`;

    // Check if file already exists
    try {
      await Deno.stat(filepath);
      console.error(
        `⏭️  Skipping prompt: ${prompt.id} - ${prompt.name} (file already exists: ${filename})`,
      );
      continue;
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) {
        console.error(
          `❌ Error checking file existence for ${filename}:`,
          error instanceof Error ? error.message : String(error),
        );
      }
      // File doesn't exist, continue processing
    }

    console.error(`🔄 Processing prompt: ${prompt.id} - ${prompt.name}`);

    let result: ImageGenerationResult = {
      success: false,
      error: "Generation did not start",
    };

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const retryDelayMs = Math.max(
          parseRetryDelayMs(result.error) ?? RETRY_BACKOFF_MS * attempt,
          1_000,
        );
        console.error(
          `🔁 Retrying ${prompt.id} for ${modelId} (${attempt}/${MAX_RETRIES}) after ${retryDelayMs}ms`,
        );
        await sleep(retryDelayMs);
      }

      result = await generateImage(prompt, modelId, apiKey, verbose);
      if (
        result.success || !isRetriableError(result.error) ||
        attempt === MAX_RETRIES
      ) {
        break;
      }
    }

    if (result.success) {
      // Save the image
      const imagePath = await saveImage(
        result,
        modelId,
        prompt.id,
        outputDir,
        verbose,
      );
      if (imagePath) {
        result.imagePath = imagePath;
        // Clean up large data/urls from report
        delete result.url;
        delete result.b64_json;

        console.error(`✅ ${prompt.id}: Generated and saved to ${imagePath}`);
        successfulGenerations++;
      } else {
        const errorMsg = `Failed to save image for prompt: ${prompt.id}`;
        console.error(`❌ ${prompt.id}: Save failed`);
        errors.push(errorMsg);
        result.success = false;
        result.error = errorMsg;
      }
    } else {
      const errorMsg =
        `Image generation failed for prompt: ${prompt.id} - ${result.error}`;
      console.error(`❌ ${prompt.id}: ${result.error}`);
      errors.push(errorMsg);
    }

    promptResults.push({
      promptId: prompt.id,
      promptName: prompt.name,
      results: [result], // Single result per prompt for now
      createdAt,
    });

    totalPrompts++;

    // Small delay between requests to not exceed limits
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.error("");
  console.error("📈 RESULTS:");
  console.error(`📝 Prompts processed: ${totalPrompts}`);
  console.error(`✅ Successful generations: ${successfulGenerations}`);
  if (errors.length > 0) {
    console.error(`❌ Errors: ${errors.length}`);
  }

  return {
    modelId,
    modelInfo,
    results: promptResults,
    stats: {
      totalPrompts,
      successfulGenerations,
      errors,
    },
  };
}

/**
 * Main function
 */
async function main() {
  const args = Deno.args;

  // Handle options (don't require API key)
  if (args.includes("--help") || args.includes("-h")) {
    showHelp();
    return;
  }

  const verbose = args.includes("--verbose") || args.includes("-v");
  const isCheckMode = args.includes("--check");

  // Get API key (required for image generation and --check)
  const API_KEY = Deno.env.get("OPENROUTER_API_KEY");
  if (!API_KEY) {
    console.error("❌ OPENROUTER_API_KEY not found in environment variables");
    console.error("Set the variable: export OPENROUTER_API_KEY=your_key_here");
    console.error("Run './bench.ts --help' for help");
    Deno.exit(1);
  }

  // Create OpenRouter client
  // const client = new OpenRouter({
  //   apiKey: API_KEY
  // });

  // Parse arguments
  const modelIndex = args.indexOf("--model");
  const specifiedModelId = modelIndex !== -1 && modelIndex + 1 < args.length
    ? args[modelIndex + 1]
    : null;
  const promptIndex = args.indexOf("--prompt");
  const specifiedPromptId = promptIndex !== -1 && promptIndex + 1 < args.length
    ? args[promptIndex + 1]
    : null;
  const limitIndex = args.indexOf("--limit");
  const limitValue = limitIndex !== -1 && limitIndex + 1 < args.length
    ? args[limitIndex + 1]
    : null;
  const promptLimit = limitValue ? Number(limitValue) : null;

  const configIndex = args.indexOf("--config");
  const configFile = configIndex !== -1 && configIndex + 1 < args.length
    ? args[configIndex + 1]
    : "./public/config.yaml";

  // Get output path (first non-option argument)
  const excludedArgs = new Set(
    [
      "--model",
      "--prompt",
      "--limit",
      "--config",
      "--check",
      specifiedModelId,
      specifiedPromptId,
      limitValue,
      configFile,
    ].filter(Boolean),
  );
  const outputDir = args.find((arg) =>
    !arg.startsWith("--") && !excludedArgs.has(arg)
  );

  if (!outputDir) {
    console.error("❌ Output directory path not specified");
    showHelp();
    Deno.exit(1);
  }

  // Check if output directory exists
  try {
    const fileInfo = await Deno.stat(outputDir);
    if (!fileInfo.isDirectory) {
      console.error(`❌ Error: '${outputDir}' is not a directory`);
      Deno.exit(1);
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.error(`❌ Output directory '${outputDir}' does not exist`);
      console.error(`💡 Please create it first: mkdir -p ${outputDir}`);
      Deno.exit(1);
    }
    console.error(
      `❌ Error checking directory:`,
      error instanceof Error ? error.message : String(error),
    );
    Deno.exit(1);
  }

  console.error("🚀 Starting image generation benchmarking via OpenRouter API");
  console.error("==================================================");
  console.error(`📄 Output directory: ${outputDir}`);

  // Load config
  const config = await loadConfig(configFile);
  console.error(
    `📋 Loaded config from ${configFile}: ${config.prompts.length} prompts, ${config.models.length} models`,
  );

  // Get list of models to process
  const modelIds: string[] = [];
  let promptsToUse: Prompt[] = config.prompts;

  if (specifiedPromptId) {
    const promptIds = new Set(
      specifiedPromptId.split(",").map((id) => id.trim()).filter((id) =>
        id.length > 0
      ),
    );
    promptsToUse = promptsToUse.filter((prompt) => promptIds.has(prompt.id));
    console.error(
      `📋 Applied prompt filter: ${promptIds.size} requested, ${promptsToUse.length} matched`,
    );
  }

  if (promptLimit !== null) {
    if (!Number.isInteger(promptLimit) || promptLimit <= 0) {
      console.error(`❌ Invalid --limit value: ${limitValue}`);
      Deno.exit(1);
    }
    promptsToUse = promptsToUse.slice(0, promptLimit);
    console.error(`📋 Applied prompt limit: ${promptsToUse.length}`);
  }

  if (specifiedModelId) {
    // Split by comma and trim each model ID, filter out empty strings
    const models = specifiedModelId
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
    modelIds.push(...models);
    console.error(`📋 Using specified model(s): ${models.length} model(s)`);
  } else {
    const modelsFromConfig = getModelsFromConfig(config);
    if (isCheckMode) {
      // In check mode, use only first model and first prompt
      modelIds.push(modelsFromConfig[0]);
      promptsToUse = config.prompts.slice(0, 1);
      console.error(`🔍 Running quick check with first model and first prompt`);
    } else {
      modelIds.push(...modelsFromConfig);
      console.error(`📋 Using models from config: ${modelIds.length} model(s)`);
    }
  }

  if (modelIds.length === 0) {
    console.error("❌ No models specified");
    console.error("💡 Use --model <id> or create models.txt file");
    Deno.exit(1);
  }

  if (promptsToUse.length === 0) {
    console.error("❌ No prompts selected after applying filters");
    console.error("💡 Check --prompt values or remove the filter");
    Deno.exit(1);
  }

  // Create timestamp for report
  const now = new Date();
  const createdAt = now.toISOString();
  const timestamp =
    now.toISOString().replace(/[:.]/g, "-").replace("T", "_").split("Z")[0];

  // Process each model and collect results
  const modelReports: ModelReport[] = [];
  for (const modelId of modelIds) {
    const report = await processModel(
      modelId,
      promptsToUse,
      API_KEY,
      outputDir,
      verbose,
      createdAt,
    );
    modelReports.push(report);
  }

  // Calculate summary statistics
  const totalModels = modelReports.length;
  const processedModels =
    modelReports.filter((r) => r.modelInfo !== null).length;
  const modelsWithErrors =
    modelReports.filter((r) => r.stats.errors.length > 0).length;
  const totalPrompts = modelReports.reduce(
    (sum, r) => sum + r.stats.totalPrompts,
    0,
  );
  const totalSuccessfulGenerations = modelReports.reduce(
    (sum, r) => sum + r.stats.successfulGenerations,
    0,
  );
  const totalErrors = modelReports.reduce(
    (sum, r) => sum + r.stats.errors.length,
    0,
  );

  // Create report
  const report: Report = {
    createdAt,
    models: modelReports,
    summary: {
      totalModels,
      processedModels,
      modelsWithErrors,
      totalPrompts,
      totalSuccessfulGenerations,
      totalErrors,
    },
  };

  // Save report only if there are successful generations
  if (totalSuccessfulGenerations === 0) {
    console.error(
      "\n⚠️  No successful image generations. Skipping report save.",
    );
    return;
  }

  // Save report
  try {
    const filename =
      `${timestamp}_${totalModels}models_${totalPrompts}prompts.json`;
    const fullPath = outputDir.endsWith("/")
      ? `${outputDir}${filename}`
      : `${outputDir}/${filename}`;

    await Deno.writeTextFile(fullPath, JSON.stringify(report, null, 2));
    console.error(`\n💾 Report saved to: ${fullPath}`);

    // Update reports.json
    const reportsFile = outputDir.endsWith("/")
      ? `${outputDir}reports.json`
      : `${outputDir}/reports.json`;
    let reports: any[] = [];
    try {
      const existingContent = await Deno.readTextFile(reportsFile);
      const parsed = JSON.parse(existingContent);
      if (Array.isArray(parsed)) {
        reports = parsed;
      }
    } catch {
      // File doesn't exist or is invalid, start new
    }

    // Create summary entry for reports.json
    const reportIndexEntry = {
      filename,
      timestamp,
      summary: report.summary,
    };

    reports.push(reportIndexEntry);
    await Deno.writeTextFile(reportsFile, JSON.stringify(reports, null, 2));
    console.error(`➕ Added to: ${reportsFile}`);
  } catch (error) {
    console.error(
      `❌ Error saving report:`,
      error instanceof Error ? error.message : String(error),
    );
    Deno.exit(1);
  }

  // Print summary
  console.error("");
  console.error("==================================================");
  console.error("📊 SUMMARY");
  console.error("==================================================");
  console.error(`🤖 Models processed: ${processedModels} of ${totalModels}`);
  if (modelsWithErrors > 0) {
    console.error(`❌ Models with errors: ${modelsWithErrors}`);
  }
  console.error(`📝 Total prompts processed: ${totalPrompts}`);
  console.error(`✅ Successfully generated: ${totalSuccessfulGenerations}`);
  if (totalErrors > 0) {
    console.error(`❌ Total errors: ${totalErrors}`);
  }

  // Print detailed errors
  const modelsWithErrorDetails = modelReports.filter((r) =>
    r.stats.errors.length > 0
  );
  if (modelsWithErrorDetails.length > 0) {
    console.error("");
    console.error("==================================================");
    console.error("⚠️  ERRORS DETAILS");
    console.error("==================================================");
    for (const modelReport of modelsWithErrorDetails) {
      console.error(
        `\n❌ ${modelReport.modelId} (${modelReport.stats.errors.length} error(s)):`,
      );
      for (const error of modelReport.stats.errors) {
        console.error(`   - ${error}`);
      }
    }
  }

  console.error("");
  console.error("==================================================");
  console.error("✅ All models processed!");
}

if (import.meta.main) {
  await main();
}
