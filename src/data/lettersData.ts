import { LetterData, LetterInfo } from '../types';

export const lettersData: Record<string, LetterData> = {
  'ء': {
    name: 'الْهَمْزَةِ الْسَاكِنَةِ',
    pronunciation: 'همزة',
    vocab: [
      { word: 'مَاء', emoji: '💧' },
      { word: 'بَبَّغَاء', emoji: '🦜' },
      { word: 'هَوَاء', emoji: '💨' },
      { word: 'سَمَاء', emoji: '🌌' }
    ]
  },
  'أ': {
    name: 'الْهَمْزَةِ الْمَفْتُوحَةِ',
    pronunciation: 'ألف',
    vocab: [
      { word: 'أَرْنَب', emoji: '🐇' },
      { word: 'أَسَد', emoji: '🦁' },
      { word: 'أُذُن', emoji: '👂' },
      { word: 'رَأْس', emoji: '🧑' }
    ]
  },
  'ا': {
    name: ' الْمَدِّ الْأَلِفُ (ا)',
    pronunciation: 'ألف',
    vocab: [
      { word: 'عَصَا', emoji: '🪄' },
      { word: 'نَار', emoji: '🔥' },
      { word: 'بَاب', emoji: '🚪' },
      { word: 'بَارِد', emoji: '❄️' }
    ]
  },
  'ب': {
    name: ' الْبَاءِ (ب- بـ)',
    pronunciation: 'باء',
    vocab: [
      { word: 'بَاب', emoji: '🚪' },
      { word: 'كَلْب', emoji: '🐶' },
      { word: 'بَابَا', emoji: '👨' },
      { word: 'حَبْل', emoji: '🪢' }
    ]
  },
  'ت': {
    name: ' التَّاءِ الْمَفْتُوحَةِ ( ت - تـ )',
    pronunciation: 'تاء',
    vocab: [
      { word: 'تُوت', emoji: '🫐' },
      { word: 'تِين', emoji: '🍇' },
      { word: 'مُفْتَاح', emoji: '🔑' },
      { word: 'تَمْر', emoji: '🍇' }
    ]
  },
  'ث': {
    name: ' الثَّاءِ ( ث - ثـ )',
    pronunciation: 'ثاء',
    vocab: [
      { word: 'أَثَاث', emoji: '🛋️' },
      { word: 'ثُوم', emoji: '🧄' },
      { word: 'ثِيرَان', emoji: '🐂' },
      { word: 'ثُعْبَان', emoji: '🐍' }
    ]
  },
  'ج': {
    name: ' الْجِيمِ ( ج - جـ )',
    pronunciation: 'جيم',
    vocab: [
      { word: 'جَمَل', emoji: '🐪' },
      { word: 'عَجِين', emoji: '🥧' },
      { word: 'دَجَاجَة', emoji: '🐔' },
      { word: 'نُجُوم', emoji: '🌟' }
    ]
  },
  'ح': {
    name: ' الْحَاءِ ( ح - حـ )',
    pronunciation: 'حاء',
    vocab: [
      { word: 'حَافِلَة', emoji: '🚌' },
      { word: 'حُوت', emoji: '🐋' },
      { word: 'مُحِيط', emoji: '🌊' },
      { word: 'حُبُوب', emoji: '🫛' }
    ]
  },
  'خ': {
    name: ' الْخَاءِ (خ - خـ ) ',
    pronunciation: 'خاء',
    vocab: [
      { word: 'خَاتَم', emoji: '💍' },
      { word: 'بَخُور', emoji: '🪔' },
      { word: 'نَخِيل', emoji: '🌴' },
      { word: 'بَطِّيخ', emoji: '🍉' }
    ]
  },
  'د': {
    name: ' الدَّالِ (د)',
    pronunciation: 'دال',
    vocab: [
      { word: 'دُبّ', emoji: '🐻' },
      { word: 'دَلُو', emoji: '🪣' },
      { word: 'صُدَاع', emoji: '🤕' },
      { word: 'صَدِيق', emoji: '👥' }
    ]
  },
  'ذ': {
    name: ' الذَّالِ (ذ) ',
    pronunciation: 'ذال',
    vocab: [
      { word: 'حِذَاء', emoji: '👟' },
      { word: 'بُذُور', emoji: '🌱' },
      { word: 'لَذِيذ', emoji: '😋' },
      { word: 'جَذُر', emoji: '🌿' }
    ]
  },
  'ر': {
    name: ' الرَّاءِ ( ر)',
    pronunciation: 'راء',
    vocab: [
      { word: 'رَمْل', emoji: '🏖️' },
      { word: 'رُمَّان', emoji: '🍎' },
      { word: 'بَرَاد', emoji: '🧊' },
      { word: 'قَرِيب', emoji: '🚸' }
    ]
  },
  'ز': {
    name: ' الزَّايِ (ز)',
    pronunciation: 'زاي',
    vocab: [
      { word: 'زَيْت', emoji: '🫒' },
      { word: 'مِيزَان', emoji: '⚖️' },
      { word: 'حَلَزُون', emoji: '🐌' },
      { word: 'زُبْدَة', emoji: '🧈' }
    ]
  },
  'س': {
    name: ' السِّينِ ( س - سـ )',
    pronunciation: 'سين',
    vocab: [
      { word: 'رَسَمَ', emoji: '🎨' },
      { word: 'سَاخِن', emoji: '♨️' },
      { word: 'سُوق', emoji: '🏬' },
      { word: 'كُرْسِي', emoji: '🪑' }
    ]
  },
  'ش': {
    name: ' الشِّينِ (ش - شـ )',
    pronunciation: 'شين',
    vocab: [
      { word: 'شَمْس', emoji: '☀️' },
      { word: 'يَمْشِي', emoji: '🚶' },
      { word: 'مِنْشَار', emoji: '🪚' },
      { word: 'شُورَبَة', emoji: '🥣' }
    ]
  },
  'ص': {
    name: ' الصَّادِ ( ص - صـ )',
    pronunciation: 'صاد',
    vocab: [
      { word: 'صُوص', emoji: '🐥' },
      { word: 'رَصِيف', emoji: '🛣️' },
      { word: 'حِصَان', emoji: '🐴' },
      { word: 'صِلْصَال', emoji: '🏺' }
    ]
  },
  'ض': {
    name: ' الضَّادِ ( ض - ضـ )',
    pronunciation: 'ضاد',
    vocab: [
      { word: 'ضَابِط', emoji: '👮' },
      { word: 'رَضِيع', emoji: '👶' },
      { word: 'ضِرْس', emoji: '🦷' },
      { word: 'فُضُولِي', emoji: '🤔' }
    ]
  },
  'ط': {
    name: ' الطَّاءِ (ط ) ',
    pronunciation: 'طاء',
    vocab: [
      { word: 'مُسْتَطِيل', emoji: '█' },
      { word: 'قِطَار', emoji: '🚆' },
      { word: 'بَط', emoji: '🦆' },
      { word: 'عُطُور', emoji: '🧴' }
    ]
  },
  'ظ': {
    name: ' الظَّاءِ (ظ)',
    pronunciation: 'ظاء',
    vocab: [
      { word: 'نَاظُور', emoji: '🔭' },
      { word: 'حَظِيرَة', emoji: '🏡' },
      { word: 'أَظَافِر', emoji: '💅' },
      { word: 'عَظْم', emoji: '🦴' }
    ]
  },
  'ع': {
    name: ' الْعَيْنِ ( ع - عـ - ـعـ - ـع )',
    pronunciation: 'عين',
    vocab: [
      { word: 'عَالَم', emoji: '🌍' },
      { word: 'سَعِيد', emoji: '😊' },
      { word: 'بَعُوضَة', emoji: '🦟' },
      { word: 'شُعُور', emoji: '💇' }
    ]
  },
  'غ': {
    name: ' الْغَيْنِ (غ - غـ - ـغـ - ـغ )',
    pronunciation: 'غين',
    vocab: [
      { word: 'غَابَة', emoji: '🌲' },
      { word: 'غُورِيلَّا', emoji: '🦍' },
      { word: 'صَغِير', emoji: '🤏' },
      { word: 'غَيْمَة', emoji: '☁️' }
    ]
  },
  'ف': {
    name: ' الفاء ( ف - فـ - ـفـ)',
    pronunciation: 'فاء',
    vocab: [
      { word: 'فَرَاشَة', emoji: '🦋' },
      { word: 'فِيل', emoji: '🐘' },
      { word: 'فُول', emoji: '🫘' },
      { word: 'فِطِر', emoji: '🍄' }
    ]
  },
  'ق': {
    name: ' الْقَافِ ( ق - قـ - ـقـ )',
    pronunciation: 'قاف',
    vocab: [
      { word: 'حَقِيبَة', emoji: '🎒' },
      { word: 'نُقُود', emoji: '💰' },
      { word: 'قَارَّة', emoji: '🌍' },
      { word: 'قَلَم', emoji: '✏️' }
    ]
  },
  'ك': {
    name: ' الْكَافِ  ( ك - كـ )',
    pronunciation: 'كاف',
    vocab: [
      { word: 'عُكَاز', emoji: '🦯' },
      { word: 'كُوب', emoji: '🥤' },
      { word: 'كِيس', emoji: '🛍️' },
      { word: 'سَمَك', emoji: '🐟' }
    ]
  },
  'لا': {
    name: 'لا',
    pronunciation: 'لا',
    vocab: [
      { word: 'ظَلَام', emoji: '🌑' },
      { word: 'طُلَّاب', emoji: '🧑‍🎓' },
      { word: 'فَلَافِل', emoji: '🥙' },
      { word: 'دُولَاب', emoji: '🗄️' }
    ]
  },
  'ل': {
    name: ' اللَّامِ ( ل- لـ )',
    pronunciation: 'لام',
    vocab: [
      { word: 'بُلْبُل', emoji: '🐦' },
      { word: 'بُرْتُقَالِي', emoji: '🟠' },
      { word: 'مَالَ', emoji: '💰' },
      { word: 'بَالُون', emoji: '🎈' }
    ]
  },
  'م': {
    name: ' الْمِيمِ ( م - مـ )',
    pronunciation: 'ميم',
    vocab: [
      { word: 'بُوم', emoji: '🦉' },
      { word: 'مَامَا', emoji: '👩' },
      { word: 'لَيْمُون', emoji: '🍋' },
      { word: 'الْخَمِيس', emoji: '🗓️' }
    ]
  },
  'ن': {
    name: ' النُّونِ (ن - نـ )',
    pronunciation: 'نون',
    vocab: [
      { word: 'نَمْل', emoji: '🐜' },
      { word: 'بُنِّي', emoji: '🤎' },
      { word: 'نَادِي', emoji: '🏋️' },
      { word: 'نُور', emoji: '💡' }
    ]
  },
  'ه': {
    name: ' الْهَاءِ ( هـ - ـهـ - ه - ـه )',
    pronunciation: 'هاء',
    vocab: [
      { word: 'هَاتِف', emoji: '📞' },
      { word: 'سُهُول', emoji: '🌄' },
      { word: 'طَاهِي', emoji: '👨‍🍳' },
      { word: 'هِلَال', emoji: '🌛' }
    ]
  },
  'ة': {
    name: ' التَّاءِ الْمَرْبُوطَةِ ( ة - ـة )',
    pronunciation: 'تاء مربوطة',
    vocab: [
      { word: 'حَافِلَة', emoji: '🚌' },
      { word: 'مِمْحَاة', emoji: '🧽' },
      { word: 'حَقِيبَة', emoji: '🎒' },
      { word: 'دُودَة', emoji: '🐛' }
    ]
  },
  'و': {
    name: ' الْمَدّ الْوَاوُ (و)',
    pronunciation: 'واو',
    vocab: [
      { word: 'تُوت', emoji: '🫐' },
      { word: 'فُول', emoji: '🫘' },
      { word: 'كُوب', emoji: '🥤' },
      { word: 'بُذُور', emoji: '🫛' }
    ]
  },
  'ؤ': {
    name: 'واو همزة',
    pronunciation: 'واو همزة',
    vocab: [
      { word: 'بؤبؤ', emoji: '👁️' },
      { word: 'لُؤْلُؤ', emoji: '🦪' },
      { word: 'مُؤْتَمَر', emoji: '🏛️' },
      { word: 'سُؤَال', emoji: '❓' }
    ]
  },
  'ى': {
    name: ' الْمَدِّ الْأَلِفُ (ى)',
    pronunciation: 'ألف مقصورة',
    vocab: [
      { word: 'مَرْمَى', emoji: '🥅' },
      { word: 'حَلْوَى', emoji: '🍬' },
      { word: 'يَنْسَى', emoji: '🤷' },
      { word: 'مُسْتَشْفَى', emoji: '🏥' }
    ]
  },
  'ي': {
    name: ' الْمَدِّ الْيَاءُ (ي - يـ )',
    pronunciation: 'ياء',
    vocab: [
      { word: 'حَلِيب', emoji: '🥛' },
      { word: 'جَدِّي', emoji: '👴' },
      { word: 'دِيك', emoji: '🐓' },
      { word: 'تِين', emoji: '🍇' }
    ]
  },
  'ئ': {
    name: 'ياء همزة',
    pronunciation: 'ياء همزة',
    vocab: [
      { word: 'قَارِئ', emoji: '📖' },
      { word: 'دَافِئ', emoji: '🔥' },
      { word: 'هَادِئ', emoji: '😌' },
      { word: 'شَاطِئ', emoji: '🏖️' }
    ]
  }
};

export const lettersOrder = [
  'ا', 'ى', 'ي', 'و', 'ب',
  'م', 'ل', 'د', 'ن', 'ر', 'س',
  'ف', 'ص', 'ق', 'ح', 'ز', 'ت',
  'ة', 'ش', 'ط', 'ج', 'ض', 'ع',
  'ك', 'خ', 'ذ', 'غ', 'ث', 'ه',
  'ظ','أ', 'ئ', 'ؤ', 'لا', 'ء'
];

export const letterInfo: Record<string, LetterInfo> = {
  'ء': { name: 'الْهَمْزَةِ الْسَاكِنَةِ', pronunciation: 'همزة', link: 'https://youtu.be/8l6EGqKmIIs?si=BrlkOM79o-genSfY' },
  'أ': { name: 'الْهَمْزَةِ الْمَفْتُوحَةِ', pronunciation: 'ألف', link: 'https://youtu.be/B4As1BL0uPo?si=t9J55E5WZjhIspPW' },
  'ا': { name: ' الْمَدِّ الْأَلِفُ (ا)', pronunciation: 'ألف', link: 'https://youtu.be/O0rtfhoBRHI?si=N9kgdJbiBJMweLGE' },
  'ب': { name: ' الْبَاءِ (ب- بـ)', pronunciation: 'باء', link: 'https://youtu.be/AmtsC1HD8co?si=P-Wh-4xSW76vwEA7' },
  'ت': { name: ' التَّاءِ الْمَفْتُوحَةِ ( ت - تـ )', pronunciation: 'تاء', link: 'https://youtu.be/AXgfl-pwP0o?si=ZyOqHg14D1rdySoG' },
  'ث': { name: ' الثَّاءِ ( ث - ثـ )', pronunciation: 'ثاء', link: 'https://youtu.be/El_U9K-J97s?si=pyx-VWd5ndkJIYUC' },
  'ج': { name: ' الْجِيمِ ( ج - جـ )', pronunciation: 'جيم', link: 'https://youtu.be/jpqMJxrfviM?si=e3h0Vypu5ZxkZIy-' },
  'ح': { name: ' الْحَاءِ ( ح - حـ )', pronunciation: 'حاء', link: 'https://youtu.be/UVw2tvkD9Y8?si=qcSKSjB-r8JEe0J6' },
  'خ': { name: ' الْخَاءِ (خ - خـ ) ', pronunciation: 'خاء', link: 'https://youtu.be/0E2648jE4Xs?si=4e16t1h5LhGnBtY3' },
  'د': { name: ' الدَّالِ (د)', pronunciation: 'دال', link: 'https://youtu.be/sgI0whNnqpM?si=Dzy6G_xhPuX64U69' },
  'ذ': { name: ' الذَّالِ (ذ) ', pronunciation: 'ذال', link: 'https://youtu.be/csDudgEMSEo?si=r8PpTQXzXfwjIfdk' },
  'ر': { name: ' الرَّاءِ ( ر)', pronunciation: 'راء', link: 'https://youtu.be/eY2xq81YwBk?si=O_gGNDBdH0FSjh_M' },
  'ز': { name: ' الزَّايِ (ز)', pronunciation: 'زاي', link: 'https://youtu.be/q1GiWh4XuUk?si=Jf2b6riT3DvhftV2' },
  'س': { name: ' السِّينِ ( س - سـ )', pronunciation: 'سين', link: 'https://youtu.be/or_1MXjyIb4?si=jaj3JkllRDXy0f_o' },
  'ش': { name: ' الشِّينِ (ش - شـ )', pronunciation: 'شين', link: 'https://youtu.be/-NaZceY8DA4?si=Ow3NQFH0PfbEBvry' },
  'ص': { name: ' الصَّادِ ( ص - صـ )', pronunciation: 'صاد', link: 'https://youtu.be/vgcynPAB-FA?si=WdP___TkwEeBPn07' },
  'ض': { name: ' الضَّادِ ( ض - ضـ )', pronunciation: 'ضاد', link: 'https://youtu.be/mGgXl4ZsauU?si=8H8c7SiTBnvzb8Rz' },
  'ط': { name: ' الطَّاءِ (ط ) ', pronunciation: 'طاء', link: 'https://youtu.be/vROHSkXfdto?si=LkMKXW_0yFhsPUJy' },
  'ظ': { name: ' الظَّاءِ (ظ)', pronunciation: 'ظاء', link: 'https://youtu.be/h9xnSzq6WAI?si=sdPME3NeJHT1AG5G' },
  'ع': { name: ' الْعَيْنِ ( ع - عـ - ـعـ - ـع )', pronunciation: 'عين', link: 'https://youtu.be/AQ3NKsMz95Q?si=aei9rECfyEiuq1Ig' },
  'غ': { name: ' الْغَيْنِ (غ - غـ - ـغـ - ـغ )', pronunciation: 'غين', link: 'https://youtu.be/cH2EtvW98h4?si=lcUDICTtlxuarLHs' },
  'ف': { name: ' الفاء ( ف - فـ - ـفـ)', pronunciation: 'فاء', link: 'https://youtu.be/uqp6VrYOUjY?si=3OgddjJHKQNP6wyR' },
  'ق': { name: ' الْقَافِ ( ق - قـ - ـقـ )', pronunciation: 'قاف', link: 'https://youtu.be/pxKvETUyA3A?si=3Aic1UOwHcUHIxd9' },
  'ك': { name: ' الْكَافِ  ( ك - كـ )', pronunciation: 'كاف', link: 'https://youtu.be/1IERkBKs09Q?si=cOCaWvmXqt8LB5jm' },
  'لا': { name: 'لا', pronunciation: 'لا', link: 'https://youtu.be/HupuqpSgeXc?si=pjO45U2tsC7K99up' },
  'ل': { name: ' اللَّامِ ( ل- لـ )', pronunciation: 'لام', link: 'https://youtu.be/8X6SfcRsYJo?si=nv3lJzrfEahEXEoC' },
  'م': { name: ' الْمِيمِ ( م - مـ )', pronunciation: 'ميم', link: 'https://youtu.be/RJSzAcyAIcI?si=0NR9UEw6GslPqK-x' },
  'ن': { name: ' النُّونِ (ن - نـ )', pronunciation: 'نون', link: 'https://youtu.be/tNhmzNMQR9Y?si=MZ_9BNfaR-lRQWIG' },
  'ه': { name: ' الْهَاءِ ( هـ - ـهـ - ه - ـه )', pronunciation: 'هاء', link: 'https://youtu.be/1SgJXHXZKOc?si=8ZbKZY5v3R9zixeX' },
  'ة': { name: ' التَّاءِ الْمَرْبُوطَةِ ( ة - ـة )', pronunciation: 'تاء مربوطة', link: 'https://youtu.be/X7MgPrOQ-sQ?si=vglzYR8vwEd4qaC1' },
  'و': { name: ' الْمَدّ الْوَاوُ (و)', pronunciation: 'واو', link: 'https://youtu.be/bMlOdrCdlZE?si=fXIQdhIhKlhzDoCI' },
  'ؤ': { name: 'واو همزة', pronunciation: 'واو همزة', link: 'https://youtu.be/mA1LSQj1sVg?si=X1l7U9QPBTCz6Cqy' },
  'ى': { name: ' الْمَدِّ الْأَلِفُ (ى)', pronunciation: 'ألف مقصورة', link: 'https://youtu.be/u26p58_VYYA?si=ZUFeW93fQC13IRAo' },
  'ي': { name: ' الْمَدِّ الْيَاءُ (ي - يـ )', pronunciation: 'ياء', link: 'https://youtu.be/T4bymPTpoLw?si=rLpB80WrHUjjFZWY' },
  'ئ': { name: 'ياء همزة', pronunciation: 'ياء همزة', link: 'https://youtu.be/NRguxakrlOI?si=bQF1CwJDOSbjhOGz' }
};
