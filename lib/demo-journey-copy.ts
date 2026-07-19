import type { RepairEntryAtomId } from "./adaptive-repair";
import type { LocalizedText, NarrationLanguage } from "./narration-language";

const hiEn = (hi: string, en: string): LocalizedText => ({ hi, en });

export type JourneyEntryCopy = Readonly<{
  number: number;
  label: LocalizedText;
  reason: LocalizedText;
}>;

export const JOURNEY_ENTRY_COPY: Readonly<Record<RepairEntryAtomId, JourneyEntryCopy>> = {
  "chosen-whole": {
    number: 1,
    label: hiEn("पूरा पहचानना", "Choose the whole"),
    reason: hiEn(
      "पहले यह पक्का करेंगे कि fraction किस पूरी चीज़ का हिस्सा बता रहा है।",
      "We will first make sure which complete thing the fraction is describing.",
    ),
  },
  "equal-parts": {
    number: 2,
    label: hiEn("बराबर हिस्से", "Equal parts"),
    reason: hiEn(
      "तुमने पूरा सही पहचाना। अब देखेंगे कि fraction बनाने के लिए उस पूरे के हिस्से बराबर क्यों होने चाहिए।",
      "You identified the whole. Next, we will see why a fraction needs equal parts of that whole.",
    ),
  },
  "unit-and-denominator": {
    number: 3,
    label: hiEn("एक हिस्से का आकार", "Size of one part"),
    reason: hiEn(
      "तुम्हारा जवाब बताता है कि denominator और एक हिस्से के आकार का connection फिर बनाना उपयोगी होगा।",
      "Your answer suggests it will help to rebuild the connection between the denominator and one part's size.",
    ),
  },
  "numerator-count": {
    number: 4,
    label: hiEn("कितने हिस्से लिए", "Count the chosen parts"),
    reason: hiEn(
      "तुमने उसी whole में 1/8 को छोटा पहचाना। अब numerator को उन बराबर आकार की इकाइयों की गिनती से जोड़ेंगे।",
      "You identified 1/8 as the smaller unit in the same whole. Next, we will connect the numerator to a count of those equal-size units.",
    ),
  },
  "equivalent-repartition": {
    number: 5,
    label: hiEn("मात्रा वही, हिस्से नए", "Same amount, new parts"),
    reason: hiEn(
      "तुम्हारा जवाब बताता है कि हिस्सों का नाम बदलने पर मात्रा वही कैसे रहती है, उस picture को फिर बनाना उपयोगी होगा।",
      "Your answer suggests it will help to rebuild the picture of how an amount can stay the same when the parts are renamed.",
    ),
  },
  "repeated-composition": {
    number: 6,
    label: hiEn("छोटे हिस्सों से मात्रा बनाना", "Build an amount from units"),
    reason: hiEn(
      "तुमने पहचाना कि दोबारा बाँटने से मात्रा नहीं बदलती। अब छोटे units को बार-बार जोड़कर वही मात्रा बनाएँगे।",
      "You saw that repartitioning does not change the amount. Next, we will build that amount by repeatedly composing the smaller units.",
    ),
  },
  "division-unknown-factor": {
    number: 7,
    label: hiEn("Division में छुपी गिनती", "The hidden count in division"),
    reason: hiEn(
      "अब fraction picture को multiplication और division की missing-count relationship से जोड़ेंगे।",
      "Now we will connect the fraction picture to multiplication and division as a missing-count relationship.",
    ),
  },
};

export const DEMO_JOURNEY_COPY = {
  header: {
    back: hiEn("वापस", "Back"),
    backAria: hiEn("Bodh home पर वापस जाएँ", "Go back to the Bodh home page"),
    homeAria: hiEn("Bodh home", "Bodh home"),
    demoLabel: hiEn("तैयार किया गया demo", "Curated demo"),
  },
  loading: {
    title: hiEn("तुम्हारा रास्ता तैयार हो रहा है…", "Preparing your learning path…"),
  },
  route: {
    eyebrow: hiEn("तुम्हारी समझ का रास्ता", "Your learning path"),
    counter: hiEn("Probe → idea", "Probe → idea"),
    title: hiEn("Bodh ने शुरू करने की एक जगह सुझाई है।", "Bodh suggests a place to begin."),
    lead: hiEn(
      "यह तुम्हारे एक probe answer से चुनी गई सावधान शुरुआत है। पहले की ideas को पूरा या mastered नहीं माना गया है।",
      "This is a conservative starting point chosen from one probe answer. Earlier ideas are not marked complete or mastered.",
    ),
    chosen: hiEn("तुमने चुना", "You chose"),
    pathAria: hiEn("सात ideas वाला Bodh learning path", "Bodh's seven-idea learning path"),
    suggested: hiEn("यहाँ से शुरू करने का सुझाव", "Suggested start"),
    before: hiEn("जाँचा नहीं गया · review उपलब्ध", "Not assessed · review available"),
    after: hiEn("इस रास्ते में आगे", "Later on this path"),
    startPrefix: hiEn("यहाँ से शुरू · idea", "Start here · idea"),
    startAll: hiEn("शुरुआत से सब देखें", "Review everything from the beginning"),
  },
  confirm: {
    eyebrow: hiEn("तुम्हारा सवाल", "Your question"),
    counter: hiEn("1 / 5", "1 / 5"),
    title: hiEn("पहले जाँच लें कि हमने सही सुना।", "First, let us check that we heard you correctly."),
    lead: hiEn(
      "तुम्हारा original सवाल और तुम्हारे शब्द, बिल्कुल वैसे ही रखे गए हैं।",
      "Your original question and your own words are kept exactly as you gave them.",
    ),
    equationAria: hiEn("तीन चौथाई को एक आठवें से भाग", "Three quarters divided by one eighth"),
    learnerSaid: hiEn("तुमने कहा", "You said"),
    calmNote: hiEn(
      "Bodh तुम्हें grade नहीं कर रहा। वह बस यह देख रहा है कि कौन-सी छोटी idea पहले काम आएगी।",
      "Bodh is not grading you. It is only looking for the smallest helpful idea to begin with.",
    ),
    continue: hiEn("हाँ, यही मेरा सवाल है", "Yes, that is my question"),
  },
  path: {
    eyebrow: hiEn("छुपी हुई idea", "The idea underneath"),
    counter: hiEn("2 / 5", "2 / 5"),
    title: hiEn("एक ही whole को बदलते हुए देखें।", "Watch the same whole change."),
    lead: hiEn(
      "हर screen पर सिर्फ एक idea: पहले picture पर action, फिर उसी picture से evidence।",
      "One idea per screen: first act on the picture, then use that same picture as evidence.",
    ),
    reviewAll: hiEn("Idea 1 से सब दोहराएँ", "Review every idea from the beginning"),
  },
  probe: {
    eyebrow: hiEn("एक छोटी जाँच", "A quick check"),
    counter: hiEn("2 / 5", "2 / 5"),
    title: hiEn("एक whole में कितने 1/4 आते हैं?", "How many 1/4 pieces make one whole?"),
    lead: hiEn(
      "अपनी पहली सोच चुनो। Bodh उसे picture में रखकर देखेगा—यह grade नहीं है।",
      "Choose your first thought. Bodh will place it in the picture—this is not a grade.",
    ),
    stripLabel: hiEn("एक पूरा whole", "One whole"),
    optionsAria: hiEn("एक whole में कितने एक बटे चार", "Choose how many one-fourths make a whole"),
    pieces: hiEn("टुकड़े", "pieces"),
    feedbackFour: hiEn(
      "देखो—चार बराबर 1/4 ने tray को ठीक-ठीक भर दिया।",
      "Look—four equal 1/4 pieces fill the tray exactly.",
    ),
    feedbackOther: hiEn(
      "अच्छी कोशिश। Picture में gap या extra pieces दिख रहे हैं—Bodh वहीं से साथ बनाएगा।",
      "Good try. The picture shows a gap or extra pieces—Bodh will build from there with you.",
    ),
    continue: hiEn("Bodh के साथ idea बनाएँ", "Build the idea with Bodh"),
  },
  lab: {
    eyebrow: hiEn("खुद करके देखो", "Build it yourself"),
    counter: hiEn("3 / 5", "3 / 5"),
    title: hiEn("3/4 के अंदर कितने 1/8 पूरे-पूरा बैठते हैं?", "How many complete 1/8 pieces fit inside 3/4?"),
    lead: hiEn(
      "पहले एक tile चुनो, फिर peach वाली जगहों पर tap करके उसे रखो। रखे हुए tile को हटाने के लिए फिर tap करो।",
      "Choose a tile, then tap the peach spaces to place it. Tap a placed tile again to remove it.",
    ),
    equationAria: hiEn("रखे गए एक आठवें के groups मिलकर तीन चौथाई", "Placed one-eighth groups compose three quarters"),
    tileSelected: hiEn("Tile चुना गया है—अब जगह tap करो", "Tile selected—now tap a space"),
    chooseTile: hiEn("एक 1/8 tile चुनें", "Choose a 1/8 tile"),
    targetLabel: hiEn("3/4", "3/4"),
    wholeLabel: hiEn("पूरा whole", "One whole"),
    barAria: hiEn(
      "आठ बराबर हिस्सों का whole; पहले छह हिस्सों में tiles रखे या हटाए जा सकते हैं",
      "A whole with eight equal parts; tiles can be placed or removed in the first six parts",
    ),
    slot: hiEn("जगह", "Slot"),
    placedSlot: hiEn("एक बटे आठ रखा गया; हटाने के लिए tap करें", "one eighth placed; tap to remove"),
    emptySlot: hiEn("एक बटे आठ रखने के लिए tap करें", "tap to place one eighth"),
    outsideSlot: hiEn("तीन चौथाई से बाहर", "outside three quarters"),
    successLead: hiEn("तुमने देख लिया:", "You showed it:"),
    success: hiEn(
      "3/4 में छह 1/8 बैठते हैं। इसलिए 3/4 ÷ 1/8 = 6।",
      "Six 1/8 pieces fit inside 3/4. Therefore, 3/4 ÷ 1/8 = 6.",
    ),
    reset: hiEn("फिर से देखें", "Reset all tiles"),
    continue: hiEn("एक नए सवाल में आज़माएँ", "Try it in a new question"),
  },
  transfer: {
    eyebrow: hiEn("अब एक नया सवाल", "Now a new question"),
    counter: hiEn("4 / 5", "4 / 5"),
    title: hiEn("क्या वही idea नई कहानी में भी काम करती है?", "Does the same idea work in a new story?"),
    lead: hiEn(
      "पहले ribbon में 2/3 बनाओ। फिर हर 1/6 bookmark-piece tap करके अपनी गिनती बनाओ।",
      "First build 2/3 of the ribbon. Then tap each 1/6 bookmark piece to build your count.",
    ),
    problem: hiEn(
      "रिया के पास 2/3 metre ribbon है। हर bookmark के लिए 1/6 metre ribbon चाहिए। कितने bookmarks बनेंगे?",
      "Riya has 2/3 metre of ribbon. Each bookmark needs 1/6 metre. How many bookmarks can she make?",
    ),
    hintLabel: hiEn("Hint picture: 2/3 को sixths में देखें", "Hint picture: see 2/3 in sixths"),
    answerLabel: hiEn("तुम्हारा जवाब", "Your answer"),
    answerPlaceholder: hiEn("यहाँ लिखो", "Type here"),
    hintFeedback: hiEn(
      "पहले तीन बराबर हिस्सों में से दो चुनो। फिर coloured 1/6 pieces को एक-एक करके tap करो।",
      "First choose two of the three equal parts. Then tap the coloured 1/6 pieces one by one.",
    ),
    correctFeedback: hiEn(
      "तुम्हारी picture ने चार groups बनाए। अब बताओ—इस कहानी में 4 क्या गिन रहा है?",
      "Your picture made four groups. Now tell Bodh—what is the 4 counting in this story?",
    ),
    meaningEyebrow: hiEn("सिर्फ answer नहीं—meaning भी", "Not only the answer—the meaning"),
    meaningTitle: hiEn("यहाँ 4 किस चीज़ की गिनती है?", "What is the 4 counting here?"),
    meaningAria: hiEn("4 का meaning चुनें", "Choose what 4 means"),
    meaningCorrect: hiEn(
      "हाँ—चार 1/6-size के groups, 2/3 ribbon में fit होते हैं।",
      "Yes—four groups of size 1/6 fit inside 2/3 of the ribbon.",
    ),
    meaningRepair: hiEn(
      "Number मिल गया, लेकिन relationship अभी rule से जुड़ी है। Bodh उसी छोटी idea को फिर दिखाएगा।",
      "You found the number, but its meaning is still tied to a rule. Bodh will revisit that one small idea.",
    ),
    check: hiEn("अपनी picture जाँचें", "Check my picture"),
    return: hiEn("अब अपना पहला सवाल करें", "Return to my first question"),
    repair: hiEn("इस idea को फिर समझें", "Repair this idea"),
    chooseMeaning: hiEn("पहले meaning चुनें", "Choose the meaning first"),
  },
  return: {
    eyebrow: hiEn("वही सवाल, अब तुम्हारी समझ के साथ", "The same question, now with your understanding"),
    counter: hiEn("5 / 5", "5 / 5"),
    title: hiEn("अब उसी picture से अपना पहला सवाल बनाओ।", "Now build your first question with the same picture."),
    equationAria: hiEn("तीन चौथाई को एक आठवें से भाग", "Three quarters divided by one eighth"),
    youAsked: hiEn("यही वह बात थी जहाँ तुम अटके थे", "This is where you were stuck"),
    answerLabel: hiEn("तुम्हारा जवाब", "Your answer"),
    answerPlaceholder: hiEn("यहाँ लिखो", "Type here"),
    hint: hiEn(
      "पहले चार quarters में से तीन चुनो। फिर हर coloured 1/8 को tap करके अपनी गिनती बनाओ।",
      "First choose three of the four quarters. Then tap every coloured 1/8 to build your count.",
    ),
    correct: hiEn(
      "हाँ—तुमने छह 1/8 groups खुद बनाए। इस बार answer picture से आया, rule याद करने से नहीं।",
      "Yes—you built six 1/8 groups yourself. This time the answer came from the picture, not from memorising a rule.",
    ),
    check: hiEn("अपनी picture जाँचें", "Check my picture"),
    receipt: hiEn("आज की समझ देखें", "See today's understanding"),
  },
  receipt: {
    eyebrow: hiEn("इस session में क्या evidence मिला", "Evidence from this session"),
    independentTitle: hiEn(
      "तुमने वही idea एक नए सवाल में अपने दम पर समझाई।",
      "You explained the same idea independently in a new question.",
    ),
    supportedTitle: hiEn(
      "तुमने support के बाद वही idea एक नए सवाल में समझाई।",
      "You explained the same idea in a new question after support.",
    ),
    curatedTitle: hiEn(
      "तुमने एक idea को दो अलग सवालों में इस्तेमाल किया।",
      "You used one idea in two different questions.",
    ),
    unavailableTitle: hiEn(
      "Learning journey पूरा हुआ, लेकिन adaptive evidence receipt जारी नहीं हुई।",
      "The learning journey is complete, but an adaptive evidence receipt was not issued.",
    ),
    trust: hiEn(
      "यह आज के actions का receipt है—long-term mastery, grade, या score का दावा नहीं।",
      "This is a receipt of today's actions—not a claim of long-term mastery, a grade, or a score.",
    ),
    unavailableTrust: hiEn(
      "ज़रूरी evidence पूरा या valid नहीं था, इसलिए Bodh कोई adaptive learning claim नहीं कर रहा।",
      "The required evidence was incomplete or invalid, so Bodh is not making an adaptive learning claim.",
    ),
    fractionEvidence: hiEn("तुम्हारा fraction evidence", "Your fraction evidence"),
    transferEvidence: hiEn("तुम्हारा transfer evidence", "Your transfer evidence"),
    timelineAria: hiEn("इस session का evidence timeline", "Evidence timeline for this session"),
    timeline: {
      probeLabel: hiEn("Probe", "Probe"),
      probe: hiEn("Starting point चुनी गई", "A starting point was selected"),
      repairLabel: hiEn("Visual repair", "Visual repair"),
      repairSuffix: hiEn("concept checkpoints evidence के साथ पूरे", "concept checkpoints completed with evidence"),
      buildLabel: hiEn("Build", "Build"),
      build: hiEn("3/4 में 1/8 tiles खुद रखे", "Placed 1/8 tiles inside 3/4"),
      transferLabel: hiEn("Transfer", "Transfer"),
      transferIndependent: hiEn("नई कहानी बिना support समझी", "Understood the new story without support"),
      transferSupported: hiEn("नई कहानी support के बाद समझी", "Understood the new story after support"),
      returnLabel: hiEn("Meaning + return", "Meaning + return"),
      return: hiEn("4 का meaning बताया और original सवाल पर लौटे", "Explained what 4 means and returned to the original question"),
    },
    ideaLabel: hiEn("IDEA", "IDEA"),
    idea: hiEn(
      "Division पूछ सकती है: इस size के कितने groups यहाँ fit होते हैं?",
      "Division can ask: how many groups of this size fit here?",
    ),
    evidenceLabel: hiEn("तुमने evidence दिया", "Evidence you gave"),
    evidence: hiEn(
      "तुमने 3/4 में छह 1/8 रखे और 2/3 में चार 1/6-size groups का meaning पहचाना।",
      "You placed six 1/8 pieces inside 3/4 and identified the meaning of four 1/6-size groups inside 2/3.",
    ),
    wordsLabel: hiEn("शब्द जो याद रखें", "Words to remember"),
    words: hiEn(
      "हर (denominator) size बताता है · अंश (numerator) units गिनता है",
      "Denominator names the unit size · numerator counts those units",
    ),
    connectionLabel: hiEn("Connection", "Connection"),
    connection: hiEn(
      "Multiplication मात्रा बनाती है; division वही missing count पूछती है।",
      "Multiplication builds an amount; division asks for that missing count.",
    ),
    original: hiEn("तुम्हारा original", "Your original question"),
    transfer: hiEn("तुम्हारा transfer", "Your transfer question"),
    share: hiEn("Image card share करें", "Share image card"),
    shareAria: hiEn("Privacy-safe learning receipt image share करें", "Share a privacy-safe learning receipt image"),
    download: hiEn("PNG download करें", "Download PNG"),
    downloadAria: hiEn("Learning receipt को PNG image में download करें", "Download the learning receipt as a PNG image"),
    print: hiEn("Receipt print करें", "Print receipt"),
    printAria: hiEn("Learning receipt print करें", "Print the learning receipt"),
    preparing: hiEn("Image card तैयार हो रही है…", "Preparing the image card…"),
    sharedImage: hiEn("Image card share हो गई।", "Image card shared."),
    shared: hiEn("Receipt share हो गई।", "Receipt shared."),
    copied: hiEn("Receipt clipboard पर copy हो गई।", "Receipt copied to the clipboard."),
    downloaded: hiEn("PNG download हो गई।", "PNG downloaded."),
    shareFailed: hiEn("Share नहीं हो सका। फिर कोशिश करें या print चुनें।", "Could not share. Try again or choose print."),
    oneMore: hiEn("एक और doubt", "Ask one more question"),
  },
} as const;

export type ReceiptShareVariant = "independent" | "supported" | "curated";

export function routeStartButtonText(language: NarrationLanguage, label: LocalizedText) {
  return language === "hi" ? `${label.hi} से शुरू करें` : `Start with ${label.en}`;
}

/** Fixed, privacy-minimised copy: no learner words, raw uploads, IDs, or diagnostic trace. */
export function receiptShareText(language: NarrationLanguage, variant: ReceiptShareVariant) {
  const support = variant === "independent"
    ? hiEn("नई कहानी अपने दम पर समझाई।", "Explained the new story independently.")
    : variant === "supported"
      ? hiEn("नई कहानी support के बाद समझाई।", "Explained the new story after support.")
      : hiEn("एक idea को दो अलग सवालों में इस्तेमाल किया।", "Used one idea in two different questions.");

  return language === "hi"
    ? [
        "Bodh · आज की समझ का receipt",
        support.hi,
        "3/4 में 1/8-size के groups बनाए और यही relationship 2/3 ÷ 1/6 में इस्तेमाल की।",
        "यह session evidence है—grade या long-term mastery claim नहीं।",
      ].join("\n")
    : [
        "Bodh · Today's understanding receipt",
        support.en,
        "Built 1/8-size groups inside 3/4 and used the same relationship in 2/3 ÷ 1/6.",
        "This is session evidence—not a grade or a long-term mastery claim.",
      ].join("\n");
}
