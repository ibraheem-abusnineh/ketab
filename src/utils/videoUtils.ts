export const convertToEmbedUrl = (videoUrl: string): string => {
  if (!videoUrl || typeof videoUrl !== 'string' || videoUrl.trim() === '') {
    return '';
  }

  const trimmedUrl = videoUrl.trim();
  
  if (trimmedUrl.match(/youtu\.be\//)) {
    let id = trimmedUrl.split('youtu.be/')[1];
    if (id.includes('?')) id = id.split('?')[0];
    return `https://www.youtube.com/embed/${id}`;
  } else if (trimmedUrl.match(/youtube\.com\/watch\?v=/)) {
    let id = trimmedUrl.split('watch?v=')[1];
    if (id.includes('&')) id = id.split('&')[0];
    return `https://www.youtube.com/embed/${id}`;
  } else if (trimmedUrl.match(/youtube\.com\/embed\//)) {
    return trimmedUrl;
  } else {
    return trimmedUrl;
  }
};

const PUBLIC_URL = process.env.PUBLIC_URL || '';

export const getLocalVideoPath = (letter: string, word: string): string => {
  return `${PUBLIC_URL}/letters/${encodeURIComponent(letter)}/${encodeURIComponent(word)}.mp4`;
};

export const getLetterImagePath = (letter: string): string => {
  return `${PUBLIC_URL}/letters/${encodeURIComponent(letter)}/1.jpg`;
};

export const getLetterImagePathWithFallback = (letter: string): string => {
  return `${PUBLIC_URL}/letters/${encodeURIComponent(letter)}/1.jpg`;
};

export const getWordImagePath = (word: string): string => {
  return `${PUBLIC_URL}/images/${encodeURIComponent(word)}.png`;
};
