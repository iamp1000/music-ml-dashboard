import { create } from 'zustand'

interface AppState {
  valence: number
  arousal: number
  setEmotion: (valence: number, arousal: number) => void
}

export const useStore = create<AppState>((set) => ({
  valence: 0,
  arousal: 0,
  setEmotion: (valence, arousal) => set({ valence, arousal }),
}))
