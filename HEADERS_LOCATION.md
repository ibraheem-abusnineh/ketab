# All Headers and Titles Location Guide

## Worksheet Pages (src/components/worksheet/)

### 1. IntroductionPage.tsx (Page 1)
- **h1** (Line 22-25): `وَرَقَةُ عَمَلٍ` / `حَرْفُ {letterName}` - Arabic only
- **h3** (Line 44): `إِشَارَاتُ الْيَّدِ لِحَرْفِ {letterData.name}` - Arabic only
- **Span** (Line 31): `حَرْفُ {letterName}` - Arabic only
- **Placeholder text** (Line 72): `مكان الفيديو هنا` - Arabic only

### 2. VocabularyPage.tsx (Page 2)
- **h3** (Line 54): `كَلِمَاتٌ تَحْتَوي عَلَى حَرْفِ {letterData.name}` - Arabic only

### 3. WritingPracticePage.tsx (Page 3)
- **h3** (Line 29): `أَرْسُمُ بِخَطٍّ وَاضِحٍ حَرْفَ {letterData.name}` - Arabic only

### 4. LetterRecognitionPage.tsx (Page 4)
- **h3** (Line 28): `أَضَعُ دَائِرَةٌ عَلَى حَرْفِ {letterData.name} {selectedLetter}` - Arabic only

### 5. SyllableWritingPage.tsx (Page 5 - Arabic only)
- **h3** (Line 19): Already has conditional - English: `'Write the following syllables:'` / Arabic: `'أَكْتُبُ الْمَقَاطِعَ الآتيةَ:'`

### 6. VowelWritingPage.tsx (Page 6 - Arabic only)
- **h3** (Line 19): Already has conditional - English: `'Write the letter with vowels:'` / Arabic: `'أَكْتُبُ الْحَرْفَ مَعَ الْحَرَكَات:'`

### 7. MatchingExercisePage.tsx (Page 7)
- **h3** (Line 29): `أَرْبُطُ بَيْنَ الْكَلِمَةِ وَحُرُوفِهَا الْإِشَارِيّة:` - Arabic only

## Main Worksheet Components

### ArabicWorksheet.tsx
- **label** (Line 284): `اخترِ الحَرْفَ:` - Arabic only
- **Navigation buttons** (Lines 376-383): `الصفحة السابقة`, `صفحة {currentPage} من 7`, `الصفحة التالية`, `عودة إلى فهرس الحروف` - Arabic only
- **Footer** (Line 371): `الْتَعَلُمْ الْمُمْتِعْ` - Arabic only

### EnglishWorksheet.tsx
- **label** (Line 271): `Choose Letter:` - English only
- **Navigation buttons** (Lines 345-360): `Previous Page`, `Page {currentPage} of 5`, `Next Page`, `Back to Index` - English only
- **Footer** (Line 340): `Fun Learning` - English only

## Letters Index (src/components/LettersIndex.tsx)

- **h1/Title** (Line 158): Dynamic based on course
  - Arabic: `فَهْرَسُ الْأبَجَدِيَّةِ الْإِشَارَّيَةِ الْعَرَبَيّةِ الْأُرْدُنِيةِ`
  - English: `Index of English Sign Language Alphabet`
  - Numbers: `Numbers / الأرقام`
- **Profile button** (Line 129): `👤 Profile` (English) / `👤 الملف الشخصي` (Arabic) - Already conditional
- **Navigation buttons** (Lines 167-172): 
  - Arabic: `الصفحة السابقة`, `صفحة {currentPage} من 2`, `الصفحة التالية`, `انتقل إلى أول حرف`
  - English: `Previous Page`, `Page {currentPage} of 2`, `Next Page`, `Go to First Letter` - Already conditional

## Profile Page (src/components/Profile.tsx)

- **h1** (Line 208): `My Profile / ملفي الشخصي` - Bilingual
- **h2** (Line 223): `Personal Information / المعلومات الشخصية` - Bilingual
- **h2** (Line 305): `Login Statistics / إحصائيات الدخول` - Bilingual
- **h2** (Line 324): `Course Selection / اختيار الدورة` - Bilingual
- **h2** (Line 358): `Recent Activity / النشاط الأخير` - Bilingual

## Video Popup (src/components/VideoPopup.tsx)

- **Title** (Line 23): `فيديو عن الكلمة: <b>{word}</b>` - Arabic only
- **Video fallback** (Line 41): `هذا المتصفح لا يدعم تشغيل الفيديو.` - Arabic only
- **Placeholder** (Line 71): `مكان الفيديو هنا` - Arabic only

## Other Components

### AdminDashboard.tsx
- **h1** (Line 233): `Admin Dashboard` - English only
- **h2** (Line 152): `Notifications` - English only

### FeedbackButton.tsx
- **Title attribute** (Line 21): `إرسال ملاحظة / Send feedback` - Bilingual
- **h2/fb-title** (Line 31): `إرسال ملاحظة / Send Feedback` - Bilingual

### Cover.tsx
- **Title** (Line 45): `تنبيه / Notice` - Bilingual

### LoginModal.tsx
- **Title** (Line 39): `تسجيل الدخول / Login` - Bilingual

### AdminLogin.tsx
- **h2** (Line 48): `Admin Login` - English only

## HTML Title (public/index.html)

- **<title>** (Line 14): `نظام تعلم لغة الإشارة العربية` - Arabic only

---

## Summary of Headers That Need English Versions:

### Worksheet Pages (Need English support):
1. **IntroductionPage.tsx**: h1, h3, letter-name span, video placeholder
2. **VocabularyPage.tsx**: h3
3. **WritingPracticePage.tsx**: h3
4. **LetterRecognitionPage.tsx**: h3
5. **MatchingExercisePage.tsx**: h3

### Video Popup:
- Title and fallback messages need English

### Already Have Conditional Logic:
- SyllableWritingPage.tsx ✓
- VowelWritingPage.tsx ✓
- LettersIndex.tsx ✓
- EnglishWorksheet.tsx ✓

