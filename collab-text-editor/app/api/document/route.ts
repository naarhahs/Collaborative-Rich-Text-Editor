import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const DB_NAME = process.env.MONGODB_DB || 'collab_editor';
const DOC_ID = 'main-doc-1';

export async function GET() {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const doc = await db.collection('documents').findOne({ _id: DOC_ID });

  return NextResponse.json(
    doc ?? { _id: DOC_ID, content: null, versions: [], comments: [] },
  );
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { content, createVersion } = body;

  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const now = new Date();
  const versionId = now.getTime().toString();

  const update: any = {
    $set: { content, updatedAt: now },
    $setOnInsert: {
      comments: [],
      createdAt: now,
    },
  };

  if (createVersion) {
    update.$push = {
      versions: {
        versionId,
        createdAt: now,
        content,
      },
    };
  }

  await db.collection('documents').updateOne(
    { _id: DOC_ID },
    update,
    { upsert: true },
  );

  return NextResponse.json({ ok: true });
}
