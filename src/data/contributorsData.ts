/**
 * Contributor / partner directory shown on the /contributors page.
 *
 * This file is the single source of truth for the page — edit the
 * categories and entries here; the page renders whatever is listed.
 *
 * Logos live in `public/contributors/` (or reuse an existing asset such
 * as 'qra-logo.svg'). Entries without a `logo` render a monogram tile.
 */

export interface Contributor {
  id: string;
  /** Primary display name. */
  nameAr: string;
  nameEn?: string;
  /** Optional short descriptor shown under the name. */
  subtitleAr?: string;
  subtitleEn?: string;
  /** Optional logo path under public/, e.g. 'contributors/moe.png'. */
  logo?: string;
  /** Optional list of people shown under the name (team credits). */
  membersAr?: string[];
}

export interface ContributorCategory {
  id: string;
  titleAr: string;
  titleEn: string;
  contributors: Contributor[];
}

export const contributorCategories: ContributorCategory[] = [
  {
    id: 'partners',
    titleAr: 'الشركاء',
    titleEn: 'Partners',
    contributors: [
      {
        id: 'moe',
        nameAr: 'وزارة التربية والتعليم وتنمية الموارد البشرية',
        nameEn: 'Ministry of Education and Human Resource Development',
        logo: 'contributors/moe.png',
      },
      {
        id: 'hcd',
        nameAr: 'المجلس الأعلى لحقوق الأشخاص ذوي الإعاقة',
        nameEn: 'Higher Council for the Rights of Persons with Disabilities',
        logo: 'contributors/hcd.jpg',
      },
      {
        id: 'sign-language-interpreters',
        nameAr: 'الجمعية الأردنية الأولى لمترجمي لغة الإشارة',
        nameEn: 'Jordanian First Association of Sign Language Interpreters',
        logo: 'contributors/sign-language-interpreters.png',
      },
      {
        id: 'amen-fm',
        nameAr: 'أمن اف ام',
        nameEn: 'Amen FM',
        subtitleAr: 'إذاعة الأمن العام',
        subtitleEn: 'Public Security Radio',
        logo: 'contributors/amen-fm.jpg',
      },
    ],
  },
  {
    id: 'contributors',
    titleAr: 'المساهمون',
    titleEn: 'Contributors',
    contributors: [
      {
        id: 'sumaya-joubeis',
        nameAr: 'سُمية جُعباص',
        nameEn: 'Sumaya Joubeis',
        subtitleAr: 'المعلمة صاحبة الحل',
        subtitleEn: 'The teacher behind "The Solution"',
      },
      {
        id: 'math-activities',
        nameAr: 'تمارا محمد القضاة',
        nameEn: 'Tamara Mohammad Al-Qudah',
        subtitleAr: 'معلمة صاحبة أوراق الرياضيات',
        subtitleEn: 'The math-worksheet teacher',
      },
      {
        id: 'huda-saifan',
        nameAr: 'الدكتورة هدى سعيفان',
        nameEn: 'Dr. Huda Saifan',
        subtitleAr: 'فريق العمل',
        subtitleEn: 'The Team',
      },
      {
        id: 'ibraheem-abusnineh',
        nameAr: 'ابراهيم ابو سنينة',
        nameEn: 'Ibraheem Abusnineh',
        subtitleAr: 'فريق العمل',
        subtitleEn: 'The Team',
      },
      {
        id: 'mohammed-al-abera',
        nameAr: 'محمد العبرة',
        nameEn: 'Mohammed Al-Abera',
        subtitleAr: 'فريق العمل',
        subtitleEn: 'The Team',
      },
    ],
  },
];
