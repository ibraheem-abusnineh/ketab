/**
 * School directory — generated from
 * «بيانات مدارس الصم والمشرفين.xls» (2025/2026).
 *
 * Regenerate with: node scripts/import-school-directory.js <path-to-xls>
 * (the generator normalises the "مدرسة " prefix and phone numbers).
 *
 * Note: some school names repeat across directorates (e.g. «الأمل للصم» in
 * مادبا and ذيبان), so per-user `directorate` wins when present; this table is
 * the fallback and the source for schools with no accounts.
 */

export interface SchoolRecord {
  school: string;
  directorate: string;
  type?: string;
  principal?: string;
  principalPhone?: string;
  supervisor?: string;
  supervisorPhone?: string;
}

export const schoolDirectory: SchoolRecord[] = [
  {
    "school": "ماركا لذوي التحديات السمعية",
    "directorate": "ماركا",
    "type": "حكومي",
    "principalPhone": "7990291620",
    "supervisorPhone": "7720689810",
    "principal": "عريب عبد / مدير مكلف",
    "supervisor": "فاطمة ابراهيم الحديدي"
  },
  {
    "school": "الرجاء لتعليم المعاقين سمعيًا",
    "directorate": "الرصيفة",
    "type": "خاص",
    "principalPhone": "7954031100",
    "supervisorPhone": "7722840590",
    "principal": "حنان المغربي",
    "supervisor": "الدكتورة اماني المصري"
  },
  {
    "school": "الأمل للغة الإشارة الثانوية المختلطة",
    "directorate": "الزرقاء الأولى",
    "type": "حكومي",
    "principalPhone": "7885799820",
    "supervisorPhone": "7899088730",
    "principal": "سلام حسن علي عبد الرحمن",
    "supervisor": "سناء  زاهر ابو خليل"
  },
  {
    "school": "الأمل الثانوية المختلطة للصم",
    "directorate": "السلط",
    "type": "حكومي",
    "principalPhone": "772116450",
    "supervisorPhone": "7724342610",
    "principal": "رشيد العذرا",
    "supervisor": "سوسن هاشم الحديدي"
  },
  {
    "school": "مؤسسة الأراضي المقدسة للصم والصم المكفوفين",
    "directorate": "",
    "type": "خاص",
    "principalPhone": "7905868390",
    "supervisorPhone": "",
    "principal": "كارولين فرجيان",
    "supervisor": ""
  },
  {
    "school": "الأمل للتحديات السمعية الثانوية المختلطة",
    "directorate": "ناعور",
    "type": "حكومي",
    "principalPhone": "7985383230",
    "supervisorPhone": "7726473930",
    "principal": "الدكتوره سميه ابو الراس",
    "supervisor": "جمانه عبد الهادي"
  },
  {
    "school": "الأمل للصم",
    "directorate": "مادبا",
    "type": "حكومي",
    "principalPhone": "7723946360",
    "supervisorPhone": "7724757480",
    "principal": "ابتسام الدهامشه",
    "supervisor": "الدكتورة مرام البدور"
  },
  {
    "school": "الأمل للصم",
    "directorate": "ذيبان",
    "type": "حكومي",
    "principalPhone": "7790301350",
    "supervisorPhone": "7760091630",
    "principal": "مريم الجماعين",
    "supervisor": "الدكتور رياض النوافعة"
  },
  {
    "school": "الأمل الثانوية المختلطة للصم",
    "directorate": "الكورة",
    "type": "حكومي",
    "principalPhone": "7881547010",
    "supervisorPhone": "7772368100",
    "principal": "شاديه ابو شقير",
    "supervisor": "اريج الصفدي"
  },
  {
    "school": "الأمل الثانوية الشاملة للصم",
    "directorate": "اربد",
    "type": "حكومي",
    "principalPhone": "7965393250",
    "supervisorPhone": "7882532150",
    "principal": "نور الزعبي",
    "supervisor": "مي الزبيدي"
  },
  {
    "school": "التربية الخاصة الثانوية المختلطة للصم",
    "directorate": "الكرك",
    "type": "حكومي",
    "principalPhone": "7974657190",
    "supervisorPhone": "7976694740",
    "principal": "زينب القطاونة / متميزة / مترجم ومدرب لغة اشاره يوجد رخصة",
    "supervisor": "رامي الحباشنة"
  },
  {
    "school": "عبد الرحمن بن عوف للتربية الخاصة",
    "directorate": "الطفيلة",
    "type": "حكومي",
    "principalPhone": "7784283300",
    "supervisorPhone": "7755454960",
    "principal": "غادة المسعيديين",
    "supervisor": "نهى خريسات"
  },
  {
    "school": "الأمل للغة الإشارة الدامجة الثانوية المختلطة",
    "directorate": "العقبة",
    "type": "حكومي",
    "principalPhone": "7965881610",
    "supervisorPhone": "",
    "principal": "سلام المجالي",
    "supervisor": ""
  }
];

/** Normalise a school name for matching (prefix, alef/ya/ta-marbuta, spaces). */
export const normalizeSchoolName = (name: string): string =>
  (name || '')
    .replace(/^مدرسة\s+/, '')
    .replace(/^مؤسسة\s+/, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\u0640/g, '')
    .replace(/[\u064B-\u0652]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** School name (normalised) → directorate from the official list. */
export const schoolDirectorateMap: Record<string, string> = Object.fromEntries(
  schoolDirectory
    .filter((row) => row.directorate)
    .map((row) => [normalizeSchoolName(row.school), row.directorate])
);

/** Normalise a directorate name (مأدبا/مادبا, اربد/إربد …). */
export const normalizeDirectorate = (name: string): string =>
  (name || '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
