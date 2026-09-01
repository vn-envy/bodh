import type { TamilOverlayEntry } from "../tamil-overlay.ts";

/**
 * Tamil overlay keyed by the exact English source string.
 *
 * Hand-written entries are marked `reviewed: true`. Entries appended by
 * `scripts/generate-tamil-overlay.mjs` arrive with `reviewed: false` and stay
 * that way until a Tamil-speaking reviewer flips them. Glossary terms from
 * `lib/concept-bridge.ts` are never translated at runtime; they are pinned here.
 */
export const TAMIL_OVERLAY_ENTRIES: Readonly<Record<string, TamilOverlayEntry>> = {
  // Language toggle and shared chrome
  "Lesson language and Bodh voice": { ta: "பாடத்தின் மொழி மற்றும் போதின் குரல்", reviewed: true },
  "Skip to main content": { ta: "முக்கிய உள்ளடக்கத்திற்குச் செல்", reviewed: true },
  "What did you notice?": { ta: "நீ என்ன கவனித்தாய்?", reviewed: true },
  "Not yet—": { ta: "இன்னும் இல்லை—", reviewed: true },
  "Bodh will point here": { ta: "போத் இங்கே சுட்டிக்காட்டும்", reviewed: true },

  // Bodh Van world
  "Bodh Van": { ta: "போத் வனம்", reviewed: true },
  "Enter Bodh Van": { ta: "போத் வனத்திற்குள் செல்", reviewed: true },
  "A world you walk through. The map is your own growth.": {
    ta: "நீ நடந்து செல்லும் ஒரு உலகம். வரைபடம் உன் சொந்த வளர்ச்சி.",
    reviewed: true,
  },
  "Puddle Ghat": { ta: "குட்டைக் கரை", reviewed: true },
  "Roti Chowk": { ta: "ரொட்டி சந்தை", reviewed: true },
  "Where the puddle disappears": { ta: "குட்டை மறையும் இடம்", reviewed: true },
  "Where rotis are torn into equal pieces": { ta: "ரொட்டிகள் சம துண்டுகளாகக் கிழிக்கப்படும் இடம்", reviewed: true },
  "Still in the mist": { ta: "இன்னும் பனிமூட்டத்தில்", reviewed: true },
  "Lit": { ta: "ஒளிரும்", reviewed: true },
  "Worth a return": { ta: "மீண்டும் செல்லத் தகுந்தது", reviewed: true },
  "Walk here": { ta: "இங்கே நட", reviewed: true },
  "Enter": { ta: "உள்ளே செல்", reviewed: true },
  "Leave": { ta: "வெளியேறு", reviewed: true },
  "Try it": { ta: "முயற்சி செய்", reviewed: true },
  "Try again": { ta: "மீண்டும் முயற்சி செய்", reviewed: true },
  "Ask Bodh": { ta: "போதிடம் கேள்", reviewed: true },
  "Hint": { ta: "குறிப்பு", reviewed: true },
  "Explain": { ta: "விளக்கு", reviewed: true },
  "Replay": { ta: "மீண்டும் கேள்", reviewed: true },
  "Where am I?": { ta: "நான் எங்கே இருக்கிறேன்?", reviewed: true },
  "Zoom out to the map": { ta: "வரைபடத்தைப் பார்", reviewed: true },
  "Back to the world": { ta: "உலகத்திற்குத் திரும்பு", reviewed: true },
  "Your growth map": { ta: "உன் வளர்ச்சி வரைபடம்", reviewed: true },
  "Bodhi seed": { ta: "போதி விதை", reviewed: true },
  "Copy seed": { ta: "விதையை நகலெடு", reviewed: true },
  "Restore from seed": { ta: "விதையிலிருந்து மீட்டெடு", reviewed: true },
  "Sun": { ta: "சூரியன்", reviewed: true },
  "Lid": { ta: "மூடி", reviewed: true },
  "Wind": { ta: "காற்று", reviewed: true },
  "Liquid": { ta: "திரவம்", reviewed: true },
  "Vapour": { ta: "ஆவி", reviewed: true },
  "Droplets": { ta: "துளிகள்", reviewed: true },
  "Total water": { ta: "மொத்த நீர்", reviewed: true },
  "Balanced": { ta: "சமநிலை", reviewed: true },
  "Not balanced yet": { ta: "இன்னும் சமநிலை இல்லை", reviewed: true },
  "Add a piece": { ta: "ஒரு துண்டைச் சேர்", reviewed: true },
  "Remove a piece": { ta: "ஒரு துண்டை எடு", reviewed: true },

  // Evidence ladder
  "unseen": { ta: "பார்க்கவில்லை", reviewed: true },
  "noticed": { ta: "கவனித்தது", reviewed: true },
  "tinkered": { ta: "கையாண்டது", reviewed: true },
  "explained": { ta: "விளக்கப்பட்டது", reviewed: true },
  "transferred": { ta: "வேறு இடத்திலும் பயன்படுத்தியது", reviewed: true },
  "taught-back": { ta: "போதுக்குக் கற்பித்தது", reviewed: true },
};
