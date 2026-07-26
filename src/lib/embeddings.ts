import OpenAI from "openai";

const nvidia = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1",
});

export async function embedText(text: string): Promise<number[]> {
  // Safety net: hard-cap character length as a rough token safeguard
  const safeText = text.length > 1800 ? text.slice(0, 1800) : text;

  const response = await nvidia.embeddings.create({
    input: [safeText],
    model: "nvidia/nv-embedqa-e5-v5",
    encoding_format: "float",
    // @ts-expect-error - NVIDIA-specific param not in OpenAI's types
    input_type: "passage",
  });

  return response.data[0].embedding;
}