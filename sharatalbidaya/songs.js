// =====================================================================
//  قائمة الأغاني — Song list
// ---------------------------------------------------------------------
//  title   : the answer shown to the player (show name, as people know it)
//  aliases : other spellings / English names that should also be accepted
//
//  Each song uses ONE of these sources:
//  youtube : the full YouTube link (or just the video ID).
//  file    : path to an audio file in the audio/ folder (exact 0.1s clips).
//
//  start   : second where the clip begins. Decimals are fine: 2.5
//            Point it at the first real note — skip any logo sound/silence.
//            Tip: open the site with ?test=5 at the end of the address to
//            play song #5 (counting from 0) and tune its start.
//
//  Two songs can share the same title (e.g. two Digimon intros) — both count as that answer.
//  ⚠ To ADD songs later without changing upcoming days, add them at the END.
// =====================================================================

const SONGS = [
  { title: "أكاديمية الشرطة", aliases: ["police academy"], youtube: "0IeH_seQXC0", start: 4 },
  { title: "هزيم الرعد", aliases: [], youtube: "wcMh6jHdC5Q", start: 0 },
  { title: "باص المدرسة العجيب", aliases: ["magic school bus"], youtube: "pctpiLeVZAU", start: 5 },
  { title: "أجنحة الكاندام", aliases: ["gundam wing", "gundam", "جاندام"], youtube: "_bIqva4VNt0", start: 14 },
  { title: "النمر المقنع", aliases: ["tiger mask"], youtube: "LRbye-zpmks", start: 12 },
  { title: "عهد الأصدقاء", aliases: [], youtube: "BYmcd8I4qcQ", start: 0 },
  { title: "أنا وأخي", aliases: [], youtube: "7t_Ht6v4GkQ", start: 3 },
  { title: "أنا وأختي", aliases: [], youtube: "dB95J8Pa49c", start: 90 },
  { title: "أدغال الديجيتال", aliases: ["digimon"], youtube: "EMGjiPvo89I", start: 12 },
  { title: "سابق ولاحق", aliases: ["let's and go", "lets go"], youtube: "aVps7M4DH4s", start: 0 },
  { title: "الشبح", aliases: [], youtube: "S_NYUfSf3TA", start: 3 },
  { title: "ون بيس", aliases: ["one piece"], youtube: "PCVXntb8WiE", start: 0 },
  { title: "دروبي", aliases: ["do re bi", "دو ري بي"], youtube: "Fc0LTrUSxKE", start: 2 },
  { title: "المقاتل النبيل", aliases: [], youtube: "pcrSBmF9zh4", start: 1 },
  { title: "باتمان", aliases: ["batman", "بات مان"], youtube: "bu6EBd3rPmI", start: 3 },
  { title: "أبطال الديجيتال", aliases: ["digimon", "ديجيمون"], youtube: "1onjKMGZj2M", start: 15 },
  { title: "الحديقة السرية", aliases: ["secret garden"], youtube: "KyWUlkKD_yY", start: 5 },
  { title: "بائعة الكبريت", aliases: ["match girl"], youtube: "71aau2qMeXo", start: 76 },
  { title: "الصياد الجريء", aliases: [], youtube: "Jfk7MDwhhpY", start: 1 },
  { title: "دراغون بول", aliases: ["dragon ball", "دراجون بول"], youtube: "Ad5KfP3r1lE", start: 2 },
  { title: "فرسان الأرض", aliases: [], youtube: "NlBefQp8arI", start: 11 },
  { title: "سلام دانك", aliases: ["slam dunk"], youtube: "WevtBmOU5qY", start: 11 },
  { title: "كابتن ماجد", aliases: ["captain tsubasa", "الكابتن ماجد"], youtube: "y_hGiiGp0Xc", start: 57 },
  { title: "أسرار الغابة", aliases: [], youtube: "cH9SyG-UJgg", start: 21 },
  { title: "أوف سايد", aliases: ["offside", "اوفسايد"], youtube: "ZEW5BHx6urU", start: 3 },
  { title: "القناص", aliases: ["hunter x hunter", "hunter"], youtube: "JOz8CVQjTuA", start: 2 },
  { title: "لحن الحياة", aliases: [], youtube: "Mh85CCQ_BTk", start: 2 },
  { title: "شوت", aliases: ["shoot"], youtube: "BicsIpASXCc", start: 5 },
  { title: "القط الأسود", aliases: ["black cat"], youtube: "P0hzk7xI1b4", start: 3 },
  { title: "ريمي", aliases: ["remi"], youtube: "8yHf-RIEiOU", start: 18 },
  { title: "المحقق كونان", aliases: ["detective conan", "كونان"], youtube: "ONS6lit1-TM", start: 1 },
  { title: "بي بليد", aliases: ["beyblade"], youtube: "u8eT0bblzzw", start: 9 },
  { title: "يوغي يو", aliases: ["yu-gi-oh", "yugioh"], youtube: "WHUcHw7j2Mc", start: 1 },
  { title: "جزيرة الكنز", aliases: ["treasure island"], youtube: "_DEz0ng4m_c", start: 1 },
  { title: "جرندايزر", aliases: ["grendizer", "غرندايزر", "جريندايزر"], youtube: "4KIk8h9xNL8", start: 0 },
  { title: "حكايات ما أحلاها", aliases: [], youtube: "9AmDta7HtmU", start: 1 },
  { title: "أبناء الوطن", aliases: [], youtube: "gISu_-igKsI", start: 1 },
  { title: "بوكيمون", aliases: ["pokemon"], youtube: "MCU3Bya2v9A", start: 1 },
  { title: "أسرار المحيط", aliases: [], youtube: "a259sXecaRQ", start: 0 },
  { title: "السيف القاطع", aliases: ["سبيس باور"], youtube: "QsqyVxYmvf4", start: 18 },
  { title: "همتارو", aliases: ["hamtaro", "هامتارو"], youtube: "eeOlXP63S1g", start: 0 },
  { title: "أبطال الديجيتال", aliases: ["digimon", "ديجيمون"], youtube: "F2pw97R4160", start: 1 },
  { title: "أبطال الديجيتال", aliases: ["digimon", "ديجيمون"], youtube: "Mm-wqnMdAoM", start: 8 },
  { title: "ماوكلي", aliases: ["mowgli", "jungle book"], youtube: "NqTQPCQB_vU", start: 8 },
  { title: "كابتن ماجد", aliases: ["captain tsubasa", "الكابتن ماجد"], youtube: "eV4QsmMFSTk", start: 0 },
  { title: "بابار فيل", aliases: ["babar", "بابار"], youtube: "BwRtzDVS84U", start: 0 },
  { title: "روبن هود", aliases: ["robin hood"], youtube: "m5oUqLmkk08", start: 0 },
  { title: "صقور الأرض", aliases: [], youtube: "PF_1lcQkhCU", start: 0 },
  { title: "داي الشجاع", aliases: ["dragon quest dai", "مغامرات داي الشجاع"], youtube: "U_om7zTMQ6I", start: 0 },
  { title: "مدينة المعلومات", aliases: [], youtube: "3sM1u-iqHU8", start: 1 },
  { title: "الضاحكون", aliases: [], youtube: "D2v0p-oz0dQ", start: 1 },
  { title: "سيمبا", aliases: ["simba"], youtube: "EQuHkjt4WhQ", start: 2 },
  { title: "سلفستر وتويتي", aliases: ["sylvester", "tweety", "سيلفستر"], youtube: "zjTuPPtvnEE", start: 1 },
  { title: "ساندي بل", aliases: ["sandy bell"], youtube: "0_jO87HBA2E", start: 0 },
  { title: "بينكي وبرين", aliases: ["pinky and the brain", "pinky", "بينكي"], youtube: "3lW5XQsw42c", start: 1 },
  { title: "سيف النار", aliases: [], youtube: "i_nF5pFlDaY", start: 4 },
  { title: "أناستازيا", aliases: ["anastasia"], youtube: "SwDBisuEsJg", start: 0 },
  { title: "المحقق كونان", aliases: ["detective conan", "كونان"], youtube: "CHAqIZ1Yl90", start: 0 },
  { title: "مارتن مستري", aliases: [], youtube: "sO_371leHlo", start: 1 },
  { title: "مغامرات نغم", aliases: [], youtube: "2QbKVD2DjTM", start: 9 },
  { title: "مغامرات توم سوير", aliases: [], youtube: "WVB-NgP62Nk", start: 0 },
  { title: "الكابتن رابح", aliases: [], youtube: "yjKXmd2V6CU", start: 6 },
  { title: "المخترع الصغير كرم", aliases: [], youtube: "SLJLhT4y1mk", start: 2 },
  { title: "المفتش فابر", aliases: [], youtube: "91whbV9VEqg", start: 2 },
  { title: "ايميلي", aliases: [], youtube: "_McjTc1Qp9s", start: 0 },
  { title: "تاما والأصدقاء", aliases: [], youtube: "HdyhGiVhQNE", start: 6 },
  { title: "صانع السلام", aliases: [], youtube: "XRBqY5KlvVY", start: 2 },
  { title: "فولترن", aliases: [], youtube: "773xBU6pQvM", start: 0 },
  { title: "في جعبتي حكايا", aliases: [], youtube: "cmnKTBiffiI", start: 9 },
  { title: "لا تبكي يا صغيري", aliases: [], youtube: "0fKox9_pGK8", start: 67 },
];

// =====================================================================
//  Extra answer choices — shows that appear in the guess list but are
//  never the song of the day. They make guessing harder.
//  When you give one of these a song, move it into SONGS (at the end).
// =====================================================================
const EXTRA_TITLES = [
  { title: "ناروتو", aliases: ["naruto"] },
  { title: "سالي", aliases: ["sally"] },
  { title: "هايدي", aliases: ["heidi"] },
  { title: "فلونة", aliases: ["flone"] },
  { title: "زينة ونحول", aliases: ["maya the bee"] },
  { title: "عدنان ولينا", aliases: ["future boy conan"] },
];
