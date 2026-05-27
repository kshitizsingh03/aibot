import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Save user message to DB
    await prisma.message.create({
      data: {
        role: 'user',
        content: message,
      },
    });

    // Initialize Gemini
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // Fetch previous history (limit to last 10 for context)
    const history = await prisma.message.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    
    history.reverse(); // put in chronological order

    // Format for Gemini Chat
    const chatContents = history.map((msg) => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    // Send to Gemini
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: chatContents,
    });

    const aiText = response.text || "I'm sorry, I couldn't generate a response.";

    // Save AI response to DB
    const savedAiMsg = await prisma.message.create({
      data: {
        role: 'model',
        content: aiText,
      },
    });

    return NextResponse.json(savedAiMsg);
  } catch (error: any) {
    console.error("Chat Error:", error);
    return NextResponse.json({ error: error.message || 'Something went wrong' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const messages = await prisma.message.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(messages);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await prisma.message.deleteMany({});
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
