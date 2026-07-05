import { create } from 'zustand';

interface EditorMetaStore {
  comments: Record<string, string>;
  setComments: (comments: Record<string, string>) => void;
  updateNodeComment: (nodeId: string, comment: string) => void;
  removeNodeComment: (nodeId: string) => void;
  clearComments: () => void;
}

export const useEditorMetaStore = create<EditorMetaStore>((set) => ({
  comments: {},

  setComments: (comments) => set({ comments }),

  updateNodeComment: (nodeId, comment) =>
    set((s) => ({
      comments: comment.trim()
        ? { ...s.comments, [nodeId]: comment.trim() }
        : Object.fromEntries(Object.entries(s.comments).filter(([k]) => k !== nodeId)),
    })),

  removeNodeComment: (nodeId) =>
    set((s) => ({
      comments: Object.fromEntries(Object.entries(s.comments).filter(([k]) => k !== nodeId)),
    })),

  clearComments: () => set({ comments: {} }),
}));
