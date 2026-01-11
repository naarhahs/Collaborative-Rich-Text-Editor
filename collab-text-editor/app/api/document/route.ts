// app/api/document/route.ts
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const DB_NAME = process.env.MONGODB_DB || 'collab_editor';
const DOC_ID = 'main-doc-1'; // single document for the assessment

export async function GET() {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const doc = await db.collection('documents').findOne({ _id: DOC_ID });

  return NextResponse.json(doc ?? { _id: DOC_ID, content: null, versions: [], comments: [] });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const { content } = body;

  await db.collection('documents').updateOne(
    { _id: DOC_ID },
    {
      $set: { content, updatedAt: new Date() },
      $setOnInsert: { versions: [], comments: [], createdAt: new Date() },
    },
    { upsert: true },
  );

  return NextResponse.json({ ok: true });
}
