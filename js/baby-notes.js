(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BellyHavenBabyNotes = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * Curated weekly letters written from baby's perspective (Weeks 4–40, plus 41–42).
   */
  const BABY_NOTES = {
    4: {
      title: 'Hello, Mama',
      message:
        'I am just the size of a tiny poppy seed right now, settling softly into my cozy new home inside you. Even before you feel a thing, my very first cells are working around the clock because you already hold me so safely.',
      signOff: 'With tiny beginnings, Baby'
    },
    5: {
      title: 'My First Little Spark',
      message:
        'As small as a sesame seed, I just began forming my very first rhythmic pulse—a tiny flutter echoing beside your own steady heart. Take a deep breath today, Mama; we have all the time in the world to grow together.',
      signOff: 'Nestled close, Baby'
    },
    6: {
      title: 'Curled Up Like a Lentil',
      message:
        'Little buds are appearing where my arms and legs will one day reach up to hug you. If you feel extra sleepy or queasy this week, please rest guilt-free—I am building big dreams in here.',
      signOff: 'Sleepy & growing, Baby'
    },
    7: {
      title: 'Blueberry Dreams',
      message:
        'My brain hemispheres are blossoming faster than stars in the night sky, and tiny shadows are shaping where my eyes and sweet button nose will be. Thank you for every sip of water and gentle nap you give us.',
      signOff: 'Growing brightly, Baby'
    },
    8: {
      title: 'My Very First Stretches',
      message:
        'Did you know I already wiggle my tiny raspberry-sized body? I am far too weightless for you to feel yet, though my microscopic fingers and toes are unfurling like petals waiting for your touch.',
      signOff: 'Wiggling softly, Baby'
    },
    9: {
      title: 'Cherry-Sized Heartbeats',
      message:
        'My tiny heart now has all four chambers beating strong and clear like a little drum beside yours. Whenever you place your hand on your belly, it feels like warmth shining right into my quiet world.',
      signOff: 'Always listening, Baby'
    },
    10: {
      title: 'Past the Earliest Milestones',
      message:
        'All of my essential organs are in place now, Mama, and I am officially kicking off my fetal growth journey! Even tiny tooth buds are tucked neatly beneath my gums for the first smile I will give you.',
      signOff: 'Smiling in waiting, Baby'
    },
    11: {
      title: 'Tiny Fig Fists',
      message:
        'This week I practiced opening and closing my microscopic hands into little fists. One day soon, these very fingers will wrap tightly around yours and refuse to let go.',
      signOff: 'Reaching for you soon, Baby'
    },
    12: {
      title: 'New Reflexes & Sommersaults',
      message:
        'I am the size of a ripe plum and discovering how fun it is to stretch and curl my toes! Thank you for carrying me patiently through these quiet first-trimester days.',
      signOff: 'Dancing softly, Baby'
    },
    13: {
      title: 'One-of-a-Kind Fingerprints',
      message:
        'We made it through the first trimester together, Mama! This week my tiny fingertips are tracing swirled patterns that nobody else in the entire universe will ever share.',
      signOff: 'Uniquely yours, Baby'
    },
    14: {
      title: 'Practicing Tiny Expressions',
      message:
        'Inside my warm amber glow, I am trying out little squints, frowns, and peaceful sighs with brand-new facial muscles. I hope the second trimester brings a bright burst of energy your way.',
      signOff: 'Warm & cozy, Baby'
    },
    15: {
      title: 'Seeing Soft Sunlight',
      message:
        'Even though my eyelids are still sealed gently shut, I can sense soft amber light when sunshine falls across your belly. Keep stepping into the light, Mama—it feels wonderful in here.',
      signOff: 'Basking in your warmth, Baby'
    },
    16: {
      title: 'I Can Hear Your Voice Now',
      message:
        'My little ears finished moving into place, and my favorite symphony is the low rumble of your voice and the steady whoosh of your heartbeat. Talk or sing to me anytime—I already know it is you.',
      signOff: 'Your biggest fan, Baby'
    },
    17: {
      title: 'Getting Stronger Every Day',
      message:
        'My soft cartilage skeleton is steadily turning into sturdy bone while I practice grasping my umbilical cord. Every nourishing meal you enjoy helps build me stronger.',
      signOff: 'Growing sturdy, Baby'
    },
    18: {
      title: 'Yawns & Secret Hiccups',
      message:
        'Have you felt a tiny butterfly flutter or bubble pop yet? That might be me doing a big stretch or having quiet hiccups after sipping a taste of warm amniotic fluid.',
      signOff: 'Fluttering gently, Baby'
    },
    19: {
      title: 'Wrapped in Cozy Comfort',
      message:
        'A silky protective layer called vernix just began blanketing my skin like soft lotion while I float weightlessly inside you. Nothing in the world could feel safer than right here.',
      signOff: 'Snuggled tight, Baby'
    },
    20: {
      title: 'Halfway to Meeting You!',
      message:
        'Look how far we have come—twenty weeks together, Mama! My hearing and taste buds are sharpening, and I love doing happy little tumbles whenever you pause to rest.',
      signOff: 'Halfway there, Baby'
    },
    21: {
      title: 'Eyebrows & Sweet Kicks',
      message:
        'Tiny eyelashes and delicate eyebrows just framed my face, and my legs are strong enough to send real little thumps your way. Keep your hand on your bump—I love saying hello back!',
      signOff: 'Kicking with love, Baby'
    },
    22: {
      title: 'Exploring by Touch',
      message:
        'Right now I am discovering the world with my hands—stroking my own cheeks, clasping my ankles, and floating through my peaceful sanctuary while your voice hums softly above me.',
      signOff: 'Curious & calm, Baby'
    },
    23: {
      title: 'Practicing Big Breaths',
      message:
        'My lungs are rehearsing tiny rhythmic breathing motions to prepare for our very first breath of fresh air together. Take a slow, soothing breath for yourself right now, Mama.',
      signOff: 'Breathing with you, Baby'
    },
    24: {
      title: 'Sweet Rhythms & Dreams',
      message:
        'I have started keeping cozy little sleep-and-wake cycles of my own—often drifting off while your daytime footsteps rock me to sleep, then waking up for midnight somersaults!',
      signOff: 'Your night owl, Baby'
    },
    25: {
      title: 'Recognizing Familiar Voices',
      message:
        'Not only do I know your heartbeat by heart, Mama, I am beginning to recognize the warm voices of the people who love you most when they speak close to your belly.',
      signOff: 'Listening closely, Baby'
    },
    26: {
      title: 'Opening My Eyes for the First Time',
      message:
        'For the very first time this week, I fluttered my eyelids open inside my soft rose-colored world! Everything is gentle here while my optic nerves prepare to see your smile.',
      signOff: 'Dreaming of your face, Baby'
    },
    27: {
      title: 'Brainwaves & Quiet Wonder',
      message:
        'As we wrap up the second trimester, my brain is weaving millions of tender connections—perhaps even dreaming my very first baby dreams of your warmth and rhythmic sway.',
      signOff: 'Dreaming softly, Baby'
    },
    28: {
      title: 'Welcome to the Home Stretch!',
      message:
        'Third trimester, Mama! My tiny eyelashes are complete and I blink freely now. Every roll and nudge is my secret way of reminding you that we are getting closer every single day.',
      signOff: 'Almost there, Baby'
    },
    29: {
      title: 'Filling Out Chubby Cheeks',
      message:
        'I am adding cozy layers of warm baby fat beneath my skin this week, shaping soft cheeks made specifically for your kisses. Thank you for taking such tender care of both of us.',
      signOff: 'Getting rounder, Baby'
    },
    30: {
      title: 'Counting Down Together',
      message:
        'Only ten weeks to go until your arms replace this cozy womb! My brain is folding into clever ridges and my grip gets firmer every day as I get ready to hold your pinky finger.',
      signOff: 'Ten weeks away, Baby'
    },
    31: {
      title: 'Using All Five Senses',
      message:
        'Sight, sound, touch, taste, and warmth—all my senses are awake! I can even taste hints of your favorite meals and calm down instantly when you rub gentle circles over your belly.',
      signOff: 'Soothed by you, Baby'
    },
    32: {
      title: 'Toenails, Fingernails & Hiccups',
      message:
        'Every tiny fingernail and toenail has reached the tips of my fingers and toes! I am running out of somersault room, so pardon my elbows when I stretch out sideways.',
      signOff: 'Running out of elbow room, Baby'
    },
    33: {
      title: 'Stronger Bones, Soft Cradle',
      message:
        'Most of my bones are firm and strong now while my skull stays gently flexible to help me navigate safely into your arms. Thank you for every extra pillow you tuck behind your back tonight.',
      signOff: 'Safe in your strength, Baby'
    },
    34: {
      title: 'Listening for Lullabies',
      message:
        'Play your favorite gentle song or hum while you fold tiny clothes—after birth, the melodies I heard inside you will soothe me faster than anything else on earth.',
      signOff: 'Humming along, Baby'
    },
    35: {
      title: 'Cozy Rolls & Gentle Nudges',
      message:
        'It is getting delightfully snug in here, so my punches and kicks have turned into slow, rolling stretches. Whenever you pause to count my kicks, I love checking right back in with you.',
      signOff: 'Counting with you, Baby'
    },
    36: {
      title: 'Getting Lower, Getting Ready',
      message:
        'My cheeks are plump and smooth, and I may start settling a little lower into your pelvis soon so you can take an easier breath. We are truly on the threshold now, Mama.',
      signOff: 'Getting closer, Baby'
    },
    37: {
      title: 'Early Term Ready',
      message:
        'I am practicing sucking my thumb and rehearsing smooth breathing movements all week long. Your patience through heavy ankles and sleepless nights is pure magic to me.',
      signOff: 'Ready for cuddles, Baby'
    },
    38: {
      title: 'Putting on Final Touches',
      message:
        'Every organ system is tuned and ready for life on the outside, Mama. I am simply soaking up these last golden days wrapped safely beneath your heart.',
      signOff: 'Nearly in your arms, Baby'
    },
    39: {
      title: 'Full Term & Full of Love',
      message:
        'Full term! My lungs and brain are adding their final polish while we wait patiently for our exact birthday to arrive. Trust your amazing body—you were made for this moment.',
      signOff: 'Waiting on your cue, Baby'
    },
    40: {
      title: 'Birthday Week Is Here!',
      message:
        'Happy due week, Mama! Look in the mirror and breathe in how strong and brave you are. Whether today or just a few days from now, the very next face I see will be yours—and I cannot wait.',
      signOff: 'See you so soon, Baby'
    },
    41: {
      title: 'Taking My Sweet Time',
      message:
        'Your heartbeat is simply too cozy to rush! Doctors keep close watch on us in late term, so rest up, drink plenty of water, and know I am packing extra cheek dimples for you.',
      signOff: 'Still snuggled in, Baby'
    },
    42: {
      title: 'Right Around the Corner',
      message:
        'Any hour or day now, Mama! Thank you for carrying me every single step of this extraordinary journey—our very first skin-to-skin hug is moments away.',
      signOff: 'All my love forever, Baby'
    }
  };

  function getBabyNote(week) {
    const num = Number.parseInt(week, 10);
    const clamped = Number.isFinite(num) ? Math.max(4, Math.min(42, num)) : 4;
    const entry = BABY_NOTES[clamped] || BABY_NOTES[4];
    return {
      week: clamped,
      title: entry.title,
      message: entry.message,
      signOff: entry.signOff
    };
  }

  function pickGentleVoice(synth) {
    if (!synth || typeof synth.getVoices !== 'function') return null;
    const voices = synth.getVoices() || [];
    if (voices.length === 0) return null;

    const englishVoices = voices.filter((v) => v && typeof v.lang === 'string' && v.lang.toLowerCase().startsWith('en'));
    const pool = englishVoices.length > 0 ? englishVoices : voices;

    const preferredTokens = ['samantha', 'ava', 'allison', 'serena', 'victoria', 'aria', 'jenny', 'zira', 'karen', 'natural', 'female'];
    for (let i = 0; i < preferredTokens.length; i++) {
      const token = preferredTokens[i];
      const match = pool.find((v) => (v.name || '').toLowerCase().includes(token));
      if (match) return match;
    }

    return pool.find((v) => v.default) || pool[0] || null;
  }

  function createSpeechReader() {
    let speaking = false;
    let activeUtterance = null;

    function isSupported() {
      return (
        typeof window !== 'undefined' &&
        'speechSynthesis' in window &&
        typeof window.SpeechSynthesisUtterance === 'function'
      );
    }

    function stop() {
      speaking = false;
      activeUtterance = null;
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch (_) {
          // Ignore speech synthesis cancel errors
        }
      }
    }

    function speak(noteObj, callbacks = {}) {
      if (!isSupported() || !noteObj) {
        if (typeof callbacks.onUnsupported === 'function') callbacks.onUnsupported();
        return false;
      }

      stop();

      const textToRead = [noteObj.title, noteObj.message, noteObj.signOff].filter(Boolean).join('. ');
      const utterance = new window.SpeechSynthesisUtterance(textToRead);
      const preferredVoice = pickGentleVoice(window.speechSynthesis);
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      utterance.lang = (preferredVoice && preferredVoice.lang) || 'en-US';
      utterance.rate = 0.88;
      utterance.pitch = 1.06;
      utterance.volume = 0.92;

      utterance.onstart = () => {
        speaking = true;
        if (typeof callbacks.onStart === 'function') callbacks.onStart();
      };

      utterance.onend = () => {
        if (activeUtterance !== utterance) return;
        speaking = false;
        activeUtterance = null;
        if (typeof callbacks.onEnd === 'function') callbacks.onEnd();
      };

      utterance.onerror = () => {
        if (activeUtterance !== utterance) return;
        speaking = false;
        activeUtterance = null;
        if (typeof callbacks.onError === 'function') callbacks.onError();
      };

      activeUtterance = utterance;
      speaking = true;
      try {
        window.speechSynthesis.speak(utterance);
        if (typeof callbacks.onStart === 'function') callbacks.onStart();
        return true;
      } catch (_) {
        speaking = false;
        activeUtterance = null;
        if (typeof callbacks.onError === 'function') callbacks.onError();
        return false;
      }
    }

    return {
      isSupported,
      isSpeaking: () => speaking,
      speak,
      stop
    };
  }

  return {
    BABY_NOTES,
    getBabyNote,
    createSpeechReader
  };
});
