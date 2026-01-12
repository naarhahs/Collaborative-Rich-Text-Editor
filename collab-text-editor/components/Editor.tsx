'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useState, useRef } from 'react';
import VersionHistory from '@/components/VersionHistory';

import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { BulletList } from '@tiptap/extension-bullet-list';
import { OrderedList } from '@tiptap/extension-ordered-list';
import { TextAlign } from '@tiptap/extension-text-align';

// allow fontSize style on text
const CustomTextStyle = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: element => element.style.fontSize || null,
        renderHTML: attributes => {
          if (!attributes.fontSize) return {};
          return { style: `font-size: ${attributes.fontSize}` };
        },
      },
    };
  },
});

type DocType = {
  _id: string;
  content: any;
};

const myUserId = 'user-' + Math.random().toString(36).slice(2);

export default function Editor() {
  const [loading, setLoading] = useState(true);
  const [wordCount, setWordCount] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: true,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: true,
        },
      }),
      BulletList,
      OrderedList,
      CustomTextStyle,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
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
      const res = await fetch('/api/document');
      const data: DocType = await res.json();

      if (data.content) {
        editor.commands.setContent(data.content);
      } else {
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

  // WebSocket connection to separate server
  useEffect(() => {
    if (!editor) return;

    const ws = new WebSocket('ws://localhost:4000');
    socketRef.current = ws;

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data as string);

      if (msg.type === 'content') {
        editor.commands.setContent(msg.content);
      }

      if (msg.type === 'cursor' && msg.userId !== myUserId) {
        // TODO: render remote cursor positions
      }
    };

    return () => {
      ws.close();
    };
  }, [editor]);

  // Broadcast cursor position
  useEffect(() => {
    if (!editor) return;

    const updateCursor = () => {
      const sel = editor.state.selection;
      const from = sel.from;
      const to = sel.to;

      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({ type: 'cursor', from, to, userId: myUserId }),
        );
      }
    };

    editor.on('selectionUpdate', updateCursor);

    return () => {
      editor.off('selectionUpdate', updateCursor);
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
      body: JSON.stringify({ content, createVersion: true }),
    });
  };

  const handleLoadVersion = (content: any) => {
    if (!editor) return;
    editor.commands.setContent(content);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-6xl mx-auto py-5 px-3 sm:px-4">
        {/* Top nav with toggle */}
        <nav className="mb-4 flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight">
            Collaborative Rich Text Editor
          </h1>

          <button
            className="text-xs sm:text-sm px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100"
            onClick={() => setShowHistory((v) => !v)}
          >
            {showHistory ? 'Hide versions' : 'Show versions'}
          </button>
        </nav>

        {/* Layout: editor + optional side panel on md+ */}
        <div
          className={`grid gap-4 lg:gap-6 ${
            showHistory ? 'md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]' : ''
          }`}
        >
          {/* Editor column */}
          <section className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-2 sm:px-3 py-2 text-xs sm:text-sm bg-slate-50">
              {/* Text styling */}
              <div className="flex items-center gap-1 border-slate-200 sm:border-r sm:pr-2">
                <span className="hidden sm:inline text-slate-400 text-[11px] uppercase tracking-wide mr-1">
                  Text
                </span>
                <button
                  className="px-2 py-1 rounded hover:bg-slate-100"
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  aria-label="Bold"
                >
                  <span className="font-semibold">B</span>
                </button>
                <button
                  className="px-2 py-1 rounded hover:bg-slate-100 italic"
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  aria-label="Italic"
                >
                  I
                </button>

                {/* Font size (pt options) */}
                <select
                  className="ml-1 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[11px] sm:text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  onChange={(e) => {
                    const pt = e.target.value;
                    if (!pt) return;

                    const map: Record<string, string> = {
                      '10': '13px',
                      '12': '16px',
                      '14': '19px',
                      '16': '21px',
                    };

                    const px = map[pt] || '16px';

                    editor
                      .chain()
                      .focus()
                      .setMark('textStyle', { fontSize: px })
                      .run();
                  }}
                  defaultValue=""
                >
                  <option value="">Size</option>
                  <option value="10">10 pt</option>
                  <option value="12">12 pt</option>
                  <option value="14">14 pt</option>
                  <option value="16">16 pt</option>
                </select>

                {/* Font color */}
                <label className="ml-1 inline-flex items-center gap-1 text-[11px] text-slate-500">
                  <span className="hidden sm:inline">Color</span>
                  <input
                    type="color"
                    className="h-5 w-5 cursor-pointer rounded border border-slate-300 bg-white"
                    onChange={(e) => {
                      const color = e.target.value;
                      editor.chain().focus().setColor(color).run();
                    }}
                  />
                </label>
              </div>

              {/* Lists */}
              <div className="flex items-center gap-1 sm:border-l sm:border-r border-slate-200 sm:px-2">
                <span className="hidden sm:inline text-slate-400 text-[11px] uppercase tracking-wide mr-1">
                  Lists
                </span>
                <button
                  className="px-2 py-1 rounded hover:bg-slate-100"
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                >
                  • List
                </button>
                <button
                  className="px-2 py-1 rounded hover:bg-slate-100"
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                >
                  1. List
                </button>
              </div>

              {/* Alignment */}
              <div className="flex items-center gap-1 sm:border-r border-slate-200 sm:pr-2">
                <span className="hidden sm:inline text-slate-400 text-[11px] uppercase tracking-wide mr-1">
                  Align
                </span>
                <button
                  className="px-2 py-1 rounded hover:bg-slate-100"
                  onClick={() => editor.chain().focus().setTextAlign('left').run()}
                  aria-label="Align left"
                >
                  ⬅
                </button>
                <button
                  className="px-2 py-1 rounded hover:bg-slate-100"
                  onClick={() => editor.chain().focus().setTextAlign('center').run()}
                  aria-label="Align center"
                >
                  ⬌
                </button>
                <button
                  className="px-2 py-1 rounded hover:bg-slate-100"
                  onClick={() => editor.chain().focus().setTextAlign('right').run()}
                  aria-label="Align right"
                >
                  ➡
                </button>
                <button
                  className="px-2 py-1 rounded hover:bg-slate-100"
                  onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                  aria-label="Justify"
                >
                  ≋
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  className="px-3 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs sm:text-sm"
                  onClick={handleClear}
                >
                  Clear
                </button>
                <button
                  className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-500 text-xs sm:text-sm"
                  onClick={handleSaveToServer}
                >
                  Save version
                </button>
              </div>
            </div>

            {/* Editor area + word count */}
            <div className="px-3 py-3 flex-1 flex flex-col">
              <div className="rounded-md border border-slate-300 bg-white min-h-[220px] sm:min-h-[260px] px-3 py-2">
                <EditorContent editor={editor} />
              </div>

              <div className="mt-2 text-xs sm:text-sm text-slate-500 text-center">
                Word count: {wordCount}
              </div>

              {showHistory === false && (
                <div className="mt-1 text-xs text-slate-400 sm:hidden text-center">
                  Versions are hidden. Use the button in the header to show them.
                </div>
              )}
            </div>
          </section>

          {/* Desktop side panel */}
          {showHistory && (
            <aside className="hidden md:block bg-white rounded-lg border border-slate-200 shadow-sm">
              <div className="px-3 py-2 border-b border-slate-200">
                <h2 className="text-sm font-semibold text-slate-800">
                  Version history
                </h2>
              </div>
              <div className="max-h-[420px] overflow-y-auto px-3 pb-3 pt-1">
                <VersionHistory onLoadVersion={handleLoadVersion} />
              </div>
            </aside>
          )}
        </div>

        {/* Mobile drawer */}
        {showHistory && (
          <div className="mt-4 md:hidden bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">
                Version history
              </h2>
              <span className="text-[11px] text-slate-500">
                Tap a version to load
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto px-3 pb-3 pt-1">
              <VersionHistory onLoadVersion={handleLoadVersion} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
