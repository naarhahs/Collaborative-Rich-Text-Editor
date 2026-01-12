import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const DB_NAME = process.env.MONGODB_DB || 'collab_editor';
const DOC_ID = 'main-doc-1';

export async function GET() {
  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const doc = await db.collection('documents').findOne(
    { _id: DOC_ID },
    { projection: { versions: 1 } },
  );

  return NextResponse.json(doc?.versions ?? []);
}
