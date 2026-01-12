'use client';

import { useEffect, useState } from 'react';

type Version = {
  versionId: string;
  createdAt: string;
  content: any;
};

type Props = {
  onLoadVersion: (content: any) => void;
};

export default function VersionHistory({ onLoadVersion }: Props) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/document/versions');
      const data = await res.json();
      setVersions(data);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div>Loading versions…</div>;
  if (!versions.length) return <div>No versions yet.</div>;

  return (
    <div className="border rounded p-2 text-sm max-h-64 overflow-auto">
      <div className="font-semibold mb-2">Version history</div>
      <ul className="space-y-1">
        {versions
          .slice()
          .reverse()
          .map((v) => (
            <li key={v.versionId} className="flex items-center justify-between">
              <span>
                {new Date(v.createdAt).toLocaleString()}
              </span>
              <button
                className="ml-2 text-blue-600 underline"
                onClick={() => onLoadVersion(v.content)}
              >
                Load
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
}
