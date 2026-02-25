export type MoodCategory =
  | 'happy'
  | 'sad'
  | 'confident'
  | 'romantic'
  | 'moody'
  | 'chill'
  | 'energetic'
  | 'dreamy'
  | 'savage'
  | 'motivational'
  | 'funny'
  | 'aesthetic'

export interface MoodQuote {
  text: string
  author?: string
  mood: MoodCategory
}

export const MOOD_QUOTES: MoodQuote[] = [
  // Happy
  { text: "Happiness looks gorgeous on me.", mood: 'happy' },
  { text: "Smile big, laugh often, never take this life for granted.", mood: 'happy' },
  { text: "Be the energy you want to attract.", mood: 'happy' },
  { text: "Good vibes only.", mood: 'happy' },
  { text: "Life is better when you're laughing.", mood: 'happy' },
  { text: "Today is a good day to have a good day.", mood: 'happy' },
  { text: "Radiate positivity.", mood: 'happy' },
  { text: "Choose joy.", mood: 'happy' },
  { text: "Living my best life.", mood: 'happy' },
  { text: "She remembered who she was and the game changed.", mood: 'happy' },
  { text: "Let your smile change the world.", mood: 'happy' },
  { text: "Too glam to give a damn.", mood: 'happy' },
  { text: "Felt cute, might not delete later.", mood: 'happy' },
  { text: "Collect moments, not things.", mood: 'happy' },
  { text: "Sunshine mixed with a little hurricane.", mood: 'happy' },
  { text: "Grateful for this moment.", mood: 'happy' },
  { text: "Keep shining, beautiful one.", mood: 'happy' },
  { text: "The sun is up, the sky is blue, it's beautiful — and so are you.", mood: 'happy' },

  // Sad
  { text: "Heavy hearts, like heavy clouds, are best relieved by letting go.", mood: 'sad' },
  { text: "It's okay to not be okay.", mood: 'sad' },
  { text: "Sometimes you have to let go to let new things in.", mood: 'sad' },
  { text: "The wound is the place where the light enters you.", author: "Rumi", mood: 'sad' },
  { text: "Even the darkest night will end and the sun will rise.", author: "Victor Hugo", mood: 'sad' },
  { text: "Behind every beautiful thing, there's some kind of pain.", mood: 'sad' },
  { text: "Stars can't shine without darkness.", mood: 'sad' },
  { text: "She was brave and strong and broken all at once.", mood: 'sad' },
  { text: "Healing is not linear.", mood: 'sad' },
  { text: "This too shall pass.", mood: 'sad' },
  { text: "Rain makes flowers grow.", mood: 'sad' },
  { text: "Sometimes the strongest people are the ones who cry behind closed doors.", mood: 'sad' },
  { text: "Your feelings are valid.", mood: 'sad' },
  { text: "Broken crayons still color.", mood: 'sad' },
  { text: "Not all storms come to disrupt your life. Some come to clear your path.", mood: 'sad' },

  // Confident
  { text: "Know your worth, then add tax.", mood: 'confident' },
  { text: "I am my own muse.", mood: 'confident' },
  { text: "I didn't come this far to only come this far.", mood: 'confident' },
  { text: "Queens don't compete. They collaborate.", mood: 'confident' },
  { text: "Be yourself — everyone else is taken.", author: "Oscar Wilde", mood: 'confident' },
  { text: "I'm not bossy. I'm the boss.", mood: 'confident' },
  { text: "Confidence level: selfie with no filter.", mood: 'confident' },
  { text: "She believed she could, so she did.", mood: 'confident' },
  { text: "In a world full of trends, I want to remain a classic.", mood: 'confident' },
  { text: "I am the energy I attract.", mood: 'confident' },
  { text: "Walk like you have three men walking behind you.", mood: 'confident' },
  { text: "Some call it arrogant. I call it confident.", mood: 'confident' },
  { text: "Not everyone likes me, but not everyone matters.", mood: 'confident' },
  { text: "The best revenge is massive success.", mood: 'confident' },
  { text: "I'm limited edition.", mood: 'confident' },
  { text: "Born to stand out.", mood: 'confident' },

  // Romantic
  { text: "You are my today and all of my tomorrows.", mood: 'romantic' },
  { text: "In a sea of people, my eyes will always search for you.", mood: 'romantic' },
  { text: "Every love story is beautiful, but ours is my favorite.", mood: 'romantic' },
  { text: "Together is a wonderful place to be.", mood: 'romantic' },
  { text: "You had me at hello.", mood: 'romantic' },
  { text: "I love you more than yesterday, less than tomorrow.", mood: 'romantic' },
  { text: "You are the sun to my moon.", mood: 'romantic' },
  { text: "Falling for you wasn't falling at all — it was walking into a house and knowing you're home.", mood: 'romantic' },
  { text: "And suddenly all the love songs were about you.", mood: 'romantic' },
  { text: "You're the reason I look down at my phone and smile.", mood: 'romantic' },
  { text: "My favorite place is next to you.", mood: 'romantic' },
  { text: "Love is not what you say. Love is what you do.", mood: 'romantic' },
  { text: "You make my heart smile.", mood: 'romantic' },

  // Moody
  { text: "I'm not anti-social. I'm selectively social.", mood: 'moody' },
  { text: "Dark but make it fashion.", mood: 'moody' },
  { text: "I'd rather be someone's shot of whiskey than everyone's cup of tea.", mood: 'moody' },
  { text: "I don't have time for things that have no soul.", mood: 'moody' },
  { text: "Chaos, but make it aesthetic.", mood: 'moody' },
  { text: "Beautifully broken.", mood: 'moody' },
  { text: "I wear black because it matches my soul.", mood: 'moody' },
  { text: "Silence is the most powerful scream.", mood: 'moody' },
  { text: "Overthinking is my cardio.", mood: 'moody' },
  { text: "Some people are like clouds. Life is beautiful when they disappear.", mood: 'moody' },
  { text: "Be a mystery. Keep people guessing.", mood: 'moody' },
  { text: "I'm somewhere between giving up and seeing how much more I can take.", mood: 'moody' },
  { text: "Dead inside but still cute.", mood: 'moody' },
  { text: "I got trust issues because people got lying issues.", mood: 'moody' },

  // Chill
  { text: "Life is simple. It's just not easy.", mood: 'chill' },
  { text: "Less perfection, more authenticity.", mood: 'chill' },
  { text: "Just breathe.", mood: 'chill' },
  { text: "Go with the flow.", mood: 'chill' },
  { text: "Inhale confidence, exhale doubt.", mood: 'chill' },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci", mood: 'chill' },
  { text: "Slow down. Calm down. Don't worry. Don't hurry. Trust the process.", mood: 'chill' },
  { text: "Be still and know.", mood: 'chill' },
  { text: "Not all who wander are lost.", author: "J.R.R. Tolkien", mood: 'chill' },
  { text: "Peace begins with a smile.", author: "Mother Teresa", mood: 'chill' },
  { text: "Let it be.", mood: 'chill' },
  { text: "Everything happens for a reason.", mood: 'chill' },
  { text: "Stay low-key. Not everyone needs to know everything about you.", mood: 'chill' },

  // Energetic
  { text: "Life is short. Make every hair flip count.", mood: 'energetic' },
  { text: "Stay wild, moon child.", mood: 'energetic' },
  { text: "Do it with passion or not at all.", mood: 'energetic' },
  { text: "Turn your can'ts into cans and your dreams into plans.", mood: 'energetic' },
  { text: "Be a voice, not an echo.", mood: 'energetic' },
  { text: "Make today so awesome, yesterday gets jealous.", mood: 'energetic' },
  { text: "Go hard or go home.", mood: 'energetic' },
  { text: "Dream big. Hustle harder.", mood: 'energetic' },
  { text: "Wake up. Slay. Repeat.", mood: 'energetic' },
  { text: "Create the things you wish existed.", mood: 'energetic' },
  { text: "Life's too short for boring hair.", mood: 'energetic' },
  { text: "She was chaos and beauty intertwined. A tornado of roses.", mood: 'energetic' },
  { text: "On my worst behavior.", mood: 'energetic' },

  // Dreamy
  { text: "Lost in the right direction.", mood: 'dreamy' },
  { text: "She was a wildflower in love with the sun.", mood: 'dreamy' },
  { text: "Magic is something you make.", mood: 'dreamy' },
  { text: "I'm in love with places I've never been and people I've never met.", mood: 'dreamy' },
  { text: "Catch flights, not feelings.", mood: 'dreamy' },
  { text: "Take only memories, leave only footprints.", mood: 'dreamy' },
  { text: "And into the forest I go, to lose my mind and find my soul.", mood: 'dreamy' },
  { text: "She had galaxies in her eyes and wildflowers in her veins.", mood: 'dreamy' },
  { text: "Adventure awaits.", mood: 'dreamy' },
  { text: "Wanderlust and city dust.", mood: 'dreamy' },
  { text: "Paradise found.", mood: 'dreamy' },
  { text: "Live in the sunshine, swim in the sea, drink the wild air.", author: "Emerson", mood: 'dreamy' },

  // Savage
  { text: "They told me I couldn't. That's why I did.", mood: 'savage' },
  { text: "I'm the girl your mother warned you about.", mood: 'savage' },
  { text: "Too busy being a baddie.", mood: 'savage' },
  { text: "Not your babe.", mood: 'savage' },
  { text: "Sweet but psycho.", mood: 'savage' },
  { text: "I don't compete. I dominate.", mood: 'savage' },
  { text: "Handle me? Who's gonna handle me? I'm a whole situation.", mood: 'savage' },
  { text: "They hate us 'cause they ain't us.", mood: 'savage' },
  { text: "I'm not heartless. I just learned how to use my heart less.", mood: 'savage' },
  { text: "Sorry, I can't hear you over the sound of how awesome I am.", mood: 'savage' },
  { text: "Built different.", mood: 'savage' },
  { text: "Main character energy.", mood: 'savage' },
  { text: "Not everyone has taste.", mood: 'savage' },

  // Motivational
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs", mood: 'motivational' },
  { text: "Believe you can and you're halfway there.", mood: 'motivational' },
  { text: "Your limitation is only your imagination.", mood: 'motivational' },
  { text: "Great things never come from comfort zones.", mood: 'motivational' },
  { text: "Push yourself, because no one else is going to do it for you.", mood: 'motivational' },
  { text: "Success is not final, failure is not fatal.", author: "Churchill", mood: 'motivational' },
  { text: "Dream it. Wish it. Do it.", mood: 'motivational' },
  { text: "Be stronger than your excuses.", mood: 'motivational' },
  { text: "The future belongs to those who believe in the beauty of their dreams.", mood: 'motivational' },
  { text: "Don't stop when you're tired. Stop when you're done.", mood: 'motivational' },
  { text: "Rise above the storm and you will find the sunshine.", mood: 'motivational' },
  { text: "Strive for progress, not perfection.", mood: 'motivational' },

  // Funny
  { text: "I'm not lazy, I'm on energy saving mode.", mood: 'funny' },
  { text: "My bed is a magical place where I suddenly remember everything I forgot to do.", mood: 'funny' },
  { text: "I need a six-month vacation, twice a year.", mood: 'funny' },
  { text: "Life is short. Smile while you still have teeth.", mood: 'funny' },
  { text: "I followed my heart and it led me to the fridge.", mood: 'funny' },
  { text: "I'm not weird, I'm limited edition.", mood: 'funny' },
  { text: "I'm on a seafood diet. I see food and I eat it.", mood: 'funny' },
  { text: "My excuse is that I'm young. What's yours?", mood: 'funny' },
  { text: "Friday, my second favorite F word.", mood: 'funny' },
  { text: "Life status: currently holding it all together with one bobby pin.", mood: 'funny' },
  { text: "Warning: I have an attitude and I know how to use it.", mood: 'funny' },
  { text: "I'm not arguing, I'm just explaining why I'm right.", mood: 'funny' },

  // Aesthetic
  { text: "Art is not what you see, but what you make others see.", author: "Degas", mood: 'aesthetic' },
  { text: "Create your own sunshine.", mood: 'aesthetic' },
  { text: "Golden hour state of mind.", mood: 'aesthetic' },
  { text: "Bloom where you are planted.", mood: 'aesthetic' },
  { text: "She wore her scars as her best attire. A stunning dress made of hellfire.", mood: 'aesthetic' },
  { text: "Messy bun and getting stuff done.", mood: 'aesthetic' },
  { text: "But first, let me take a selfie.", mood: 'aesthetic' },
  { text: "Elegance is an attitude.", mood: 'aesthetic' },
  { text: "Dripping in finesse.", mood: 'aesthetic' },
  { text: "Life is art. Live yours in color.", mood: 'aesthetic' },
  { text: "Less is more.", mood: 'aesthetic' },
  { text: "Find me where the wild things are.", mood: 'aesthetic' },
  { text: "Soft hearts make the universe worth living in.", mood: 'aesthetic' },
]

export function getQuotesByMood(mood: MoodCategory): MoodQuote[] {
  return MOOD_QUOTES.filter((q) => q.mood === mood)
}

export const MOOD_LABELS: Record<MoodCategory, { emoji: string; label: string }> = {
  happy: { emoji: '😊', label: 'Happy' },
  sad: { emoji: '😢', label: 'Sad' },
  confident: { emoji: '💪', label: 'Confident' },
  romantic: { emoji: '💕', label: 'Romantic' },
  moody: { emoji: '🌙', label: 'Moody' },
  chill: { emoji: '😌', label: 'Chill' },
  energetic: { emoji: '⚡', label: 'Energetic' },
  dreamy: { emoji: '✨', label: 'Dreamy' },
  savage: { emoji: '🔥', label: 'Savage' },
  motivational: { emoji: '🚀', label: 'Motivational' },
  funny: { emoji: '😂', label: 'Funny' },
  aesthetic: { emoji: '🎨', label: 'Aesthetic' },
}

export const ALL_MOODS = Object.keys(MOOD_LABELS) as MoodCategory[]
