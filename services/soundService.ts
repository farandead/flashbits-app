import { Audio } from 'expo-av';

// Sound instances
let correctSound: Audio.Sound | null = null;
let incorrectSound: Audio.Sound | null = null;
let isSoundEnabled = true;
let soundsInitialized = false;

// Initialize sounds
export const initializeSounds = async () => {
  try {
    // Set audio mode
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });

    // Try to load correct answer sound
    try {
      const { sound: correct } = await Audio.Sound.createAsync(
        require('@/assets/sounds/correct.mp3'),
        { shouldPlay: false }
      );
      correctSound = correct;
    } catch (error) {
      console.log('✨ Correct sound file not found (assets/sounds/correct.mp3). Add it to enable sound effects.');
    }

    // Try to load incorrect answer sound
    try {
      const { sound: incorrect } = await Audio.Sound.createAsync(
        require('@/assets/sounds/incorrect.mp3'),
        { shouldPlay: false }
      );
      incorrectSound = incorrect;
    } catch (error) {
      console.log('✨ Incorrect sound file not found (assets/sounds/incorrect.mp3). Add it to enable sound effects.');
    }

    soundsInitialized = true;
  } catch (error) {
    console.log('Sound system initialized without audio files. Add sound files to enable audio feedback.');
  }
};

// Play correct answer sound
export const playCorrectSound = async () => {
  if (!isSoundEnabled || !soundsInitialized || !correctSound) return;
  
  try {
    await correctSound.replayAsync();
  } catch (error) {
    // Silently fail if sound can't play
    console.log('Could not play correct sound');
  }
};

// Play incorrect answer sound
export const playIncorrectSound = async () => {
  if (!isSoundEnabled || !soundsInitialized || !incorrectSound) return;
  
  try {
    await incorrectSound.replayAsync();
  } catch (error) {
    // Silently fail if sound can't play
    console.log('Could not play incorrect sound');
  }
};

// Enable/disable sounds
export const setSoundEnabled = (enabled: boolean) => {
  isSoundEnabled = enabled;
};

// Get sound enabled status
export const getSoundEnabled = () => {
  isSoundEnabled;
};

// Cleanup sounds
export const cleanupSounds = async () => {
  try {
    if (correctSound) {
      await correctSound.unloadAsync();
      correctSound = null;
    }
    if (incorrectSound) {
      await incorrectSound.unloadAsync();
      incorrectSound = null;
    }
  } catch (error) {
    console.error('Error cleaning up sounds:', error);
  }
};

