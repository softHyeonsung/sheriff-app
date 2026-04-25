// src/store/postStore.ts
import { create } from 'zustand';

interface PostStore {
  savedPostIds: string[];
  savePost:        (id: string)   => void;
  unsavePost:      (id: string)   => void;
  loadSavedPosts:  (ids: string[]) => void;
}

export const usePostStore = create<PostStore>((set) => ({
  savedPostIds: [],

  savePost: (id) => set((state) => ({
    savedPostIds: state.savedPostIds.includes(id)
      ? state.savedPostIds
      : [...state.savedPostIds, id],
  })),

  unsavePost: (id) => set((state) => ({
    savedPostIds: state.savedPostIds.filter((p) => p !== id),
  })),

  loadSavedPosts: (ids) => set({ savedPostIds: ids }),
}));
