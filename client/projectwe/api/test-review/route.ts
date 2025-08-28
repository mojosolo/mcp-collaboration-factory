import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

export async function GET(request: NextRequest) {
  try {
    console.log("Test review endpoint called");

    // Simple test prompt
    const prompt = `Review these metrics:
    - Documents: 71
    - Extractions: 4,110  
    - Avg Confidence: 0.82
    
    Provide 3 quality points.`;

    console.log("Attempting GPT-5...");
    let content = "";
    let modelUsed = "";

    try {
      const gpt5Response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 200,
      });
      content = gpt5Response.choices[0]?.message?.content || "";
      modelUsed = "gpt-5";
      console.log("GPT-5 response:", content ? "SUCCESS" : "EMPTY");
    } catch (e: any) {
      console.log("GPT-5 error:", e.message);
    }

    if (!content) {
      console.log("Falling back to GPT-4o...");
      const gpt4oResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 200,
      });
      content = gpt4oResponse.choices[0]?.message?.content || "";
      modelUsed = "gpt-4o";
      console.log("GPT-4o response:", content ? "SUCCESS" : "EMPTY");
    }

    return NextResponse.json({
      success: true,
      model: modelUsed,
      review: content,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Test review error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}
