export type AnchorPoint =
  | 'eyes'
  | 'forehead'
  | 'nose'
  | 'mouth'
  | 'chin'
  | 'left-cheek'
  | 'right-cheek'
  | 'full-face'

export interface FaceStickerDef {
  id: string
  label: string
  emoji: string
  anchor: AnchorPoint
  offsetY: number
  scale: number
  rotation?: number
}

export interface StickerCategory {
  id: string
  label: string
  stickers: FaceStickerDef[]
}

export const FACE_STICKER_CATEGORIES: StickerCategory[] = [
  {
    id: 'glasses',
    label: 'Glasses',
    stickers: [
      { id: 'sunglasses', label: 'Sunglasses', emoji: '🕶️', anchor: 'eyes', offsetY: 0, scale: 1.6 },
      { id: 'nerd-glasses', label: 'Nerd', emoji: '🤓', anchor: 'full-face', offsetY: 0, scale: 1 },
      { id: 'monocle', label: 'Monocle', emoji: '🧐', anchor: 'full-face', offsetY: 0, scale: 1 },
      { id: 'glasses-round', label: 'Round', emoji: '👓', anchor: 'eyes', offsetY: 0, scale: 1.6 },
      { id: 'disguise', label: 'Disguise', emoji: '🥸', anchor: 'full-face', offsetY: 0, scale: 1 },
    ],
  },
  {
    id: 'headwear',
    label: 'Headwear',
    stickers: [
      { id: 'crown', label: 'Crown', emoji: '👑', anchor: 'forehead', offsetY: -0.45, scale: 1.3 },
      { id: 'top-hat', label: 'Top Hat', emoji: '🎩', anchor: 'forehead', offsetY: -0.5, scale: 1.3 },
      { id: 'cowboy', label: 'Cowboy', emoji: '🤠', anchor: 'full-face', offsetY: 0, scale: 1 },
      { id: 'party-hat', label: 'Party', emoji: '🥳', anchor: 'full-face', offsetY: 0, scale: 1 },
      { id: 'halo', label: 'Halo', emoji: '😇', anchor: 'full-face', offsetY: 0, scale: 1 },
      { id: 'horns', label: 'Devil Horns', emoji: '😈', anchor: 'full-face', offsetY: 0, scale: 1 },
      { id: 'helmet', label: 'Helmet', emoji: '⛑️', anchor: 'forehead', offsetY: -0.4, scale: 1.4 },
      { id: 'cap', label: 'Cap', emoji: '🧢', anchor: 'forehead', offsetY: -0.45, scale: 1.3 },
    ],
  },
  {
    id: 'decorations',
    label: 'Decorations',
    stickers: [
      { id: 'heart-eyes', label: 'Heart Eyes', emoji: '😍', anchor: 'full-face', offsetY: 0, scale: 1 },
      { id: 'star-eyes', label: 'Star Eyes', emoji: '🤩', anchor: 'full-face', offsetY: 0, scale: 1 },
      { id: 'heart-l', label: 'Heart L', emoji: '❤️', anchor: 'left-cheek', offsetY: -0.1, scale: 0.6 },
      { id: 'heart-r', label: 'Heart R', emoji: '❤️', anchor: 'right-cheek', offsetY: -0.1, scale: 0.6 },
      { id: 'sparkle-l', label: 'Sparkle L', emoji: '✨', anchor: 'left-cheek', offsetY: -0.15, scale: 0.5 },
      { id: 'sparkle-r', label: 'Sparkle R', emoji: '✨', anchor: 'right-cheek', offsetY: -0.15, scale: 0.5 },
      { id: 'star-l', label: 'Star L', emoji: '⭐', anchor: 'left-cheek', offsetY: -0.1, scale: 0.5 },
      { id: 'butterfly', label: 'Butterfly', emoji: '🦋', anchor: 'forehead', offsetY: -0.5, scale: 0.8 },
      { id: 'flower-crown', label: 'Flower', emoji: '🌸', anchor: 'forehead', offsetY: -0.4, scale: 0.7 },
    ],
  },
  {
    id: 'mouth',
    label: 'Mouth',
    stickers: [
      { id: 'tongue', label: 'Tongue', emoji: '😛', anchor: 'full-face', offsetY: 0, scale: 1 },
      { id: 'mask', label: 'Mask', emoji: '😷', anchor: 'full-face', offsetY: 0, scale: 1 },
      { id: 'clown-nose', label: 'Clown Nose', emoji: '🔴', anchor: 'nose', offsetY: 0, scale: 0.4 },
      { id: 'moustache', label: 'Moustache', emoji: '🥸', anchor: 'full-face', offsetY: 0, scale: 1 },
      { id: 'lips', label: 'Kiss', emoji: '💋', anchor: 'mouth', offsetY: 0.05, scale: 0.6 },
      { id: 'teeth', label: 'Vampire', emoji: '🧛', anchor: 'full-face', offsetY: 0, scale: 1 },
    ],
  },
  {
    id: 'animals',
    label: 'Animals',
    stickers: [
      { id: 'dog-nose', label: 'Dog', emoji: '🐶', anchor: 'nose', offsetY: 0.15, scale: 0.8 },
      { id: 'cat-face', label: 'Cat', emoji: '🐱', anchor: 'full-face', offsetY: 0, scale: 1 },
      { id: 'bunny', label: 'Bunny', emoji: '🐰', anchor: 'full-face', offsetY: 0, scale: 1 },
      { id: 'pig-nose', label: 'Pig Nose', emoji: '🐽', anchor: 'nose', offsetY: 0.1, scale: 0.7 },
      { id: 'fox', label: 'Fox', emoji: '🦊', anchor: 'full-face', offsetY: 0, scale: 1 },
      { id: 'bear', label: 'Bear', emoji: '🐻', anchor: 'full-face', offsetY: 0, scale: 1 },
      { id: 'panda', label: 'Panda', emoji: '🐼', anchor: 'full-face', offsetY: 0, scale: 1 },
      { id: 'lion', label: 'Lion', emoji: '🦁', anchor: 'full-face', offsetY: 0, scale: 1 },
    ],
  },
  {
    id: 'fun',
    label: 'Fun',
    stickers: [
      { id: 'thinking', label: 'Thinking', emoji: '🤔', anchor: 'full-face', offsetY: 0, scale: 1 },
      { id: 'money-mouth', label: 'Money', emoji: '🤑', anchor: 'full-face', offsetY: 0, scale: 1 },
      { id: 'zany', label: 'Zany', emoji: '🤪', anchor: 'full-face', offsetY: 0, scale: 1 },
      { id: 'cool', label: 'Cool', emoji: '😎', anchor: 'full-face', offsetY: 0, scale: 1 },
      { id: 'crying', label: 'Crying', emoji: '😭', anchor: 'full-face', offsetY: 0, scale: 1 },
      { id: 'robot', label: 'Robot', emoji: '🤖', anchor: 'full-face', offsetY: 0, scale: 1 },
      { id: 'alien', label: 'Alien', emoji: '👽', anchor: 'full-face', offsetY: 0, scale: 1 },
      { id: 'skull', label: 'Skull', emoji: '💀', anchor: 'full-face', offsetY: 0, scale: 1 },
      { id: 'fire', label: 'Fire', emoji: '🔥', anchor: 'forehead', offsetY: -0.5, scale: 0.8 },
      { id: 'hundred', label: '100', emoji: '💯', anchor: 'forehead', offsetY: -0.45, scale: 0.6 },
    ],
  },
]

export const ALL_STICKERS = FACE_STICKER_CATEGORIES.flatMap((c) => c.stickers)
