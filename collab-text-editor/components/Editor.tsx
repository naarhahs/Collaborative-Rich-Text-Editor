'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useState, useRef  } from 'react';

type DocType = {
  _id: string;
  content: any;
};

export default function Editor() {
  const [loading, setLoading] = useState(true);
  const [wordCount, setWordCount] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content: '',
    onUpdate({ editor }) {
      const text = editor.getText();
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      setWordCount(words);
      
      const json = editor.getJSON();
      localStorage.setItem('editor-content', JSON.stringify(json));
      
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
            JSON.stringify({ type: 'content', content: json }),
        );
      }
    },
  });

  // Load from server or localStorage
  useEffect(() => {
    if (!editor) return;

    const load = async () => {
      // 1) Try server
      const res = await fetch('/api/document');
      const data: DocType = await res.json();

      if (data.content) {
        editor.commands.setContent(data.content);
      } else {
        // 2) fallback to localStorage
        const stored = localStorage.getItem('editor-content');
        if (stored) {
          editor.commands.setContent(JSON.parse(stored));
        }
      }

      const text = editor.getText();
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      setWordCount(words);
      setLoading(false);
    };

    load();
  }, [editor]);

  // WebSocket connection for real-time collaboration
  useEffect(() => {
  if (!editor) return;

  // ensure WS route is initialized
  fetch('/api/ws');

  const ws = new WebSocket(`ws://localhost:3000/api/ws`);
  socketRef.current = ws;

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === 'content') {
      // apply remote document (naive; will be refined)
      editor.commands.setContent(msg.content);
    }
    if (msg.type === 'cursor' && msg.userId !== myUserId) {
      // later: render remote cursor positions
    }
  };

  return () => {
    ws.close();
  };
}, [editor]);

  if (!editor || loading) return <div>Loading editor...</div>;

  const handleClear = () => {
    editor.commands.setContent('');
    localStorage.removeItem('editor-content');
    setWordCount(0);
  };

  const handleSaveToServer = async () => {
    const content = editor.getJSON();
    await fetch('/api/document', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
  };

  return (
    <div className="max-w-3xl mx-auto mt-10">
      <div className="flex gap-2 mb-2">
        <button onClick={() => editor.chain().focus().toggleBold().run()}>Bold</button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()}>Italic</button>
        <button onClick={handleClear}>Clear</button>
        <button onClick={handleSaveToServer}>Save</button>
      </div>

      <div className="border rounded p-2 min-h-[200px]">
        <EditorContent editor={editor} />
      </div>

      <div className="mt-2 text-sm text-gray-500">
        Word count: {wordCount}
      </div>
    </div>
  );
}
