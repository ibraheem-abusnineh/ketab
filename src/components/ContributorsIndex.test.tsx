import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ContributorsIndex from './ContributorsIndex';
import { useCourseAvailability } from '../context/CourseAvailabilityContext';
import { getAuthState } from '../utils/auth';

jest.mock('../context/CourseAvailabilityContext', () => ({
  useCourseAvailability: jest.fn(),
}));

jest.mock('../utils/auth', () => ({
  getAuthState: jest.fn(),
}));

const mockAvailability = useCourseAvailability as jest.Mock;
const mockAuth = getAuthState as jest.Mock;

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/contributors']}>
      <ContributorsIndex />
    </MemoryRouter>
  );

const CATEGORY_TITLES = ['الشركاء', 'المساهمون'];

describe('ContributorsIndex', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    mockAvailability.mockReturnValue({ courses: {} });
    mockAuth.mockReturnValue({ user: { role: 'guest' } });
  });

  it('renders the heading and both categories', () => {
    renderPage();

    expect(screen.getAllByText('المساهمون والشركاء').length).toBeGreaterThan(0);
    CATEGORY_TITLES.forEach((title) => {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    });
  });

  it('renders every listed partner', () => {
    renderPage();

    [
      'وزارة التربية والتعليم وتنمية الموارد البشرية',
      'المجلس الأعلى لحقوق الأشخاص ذوي الإعاقة',
      'الجمعية الأردنية الأولى لمترجمي لغة الإشارة',
      'أمن اف ام',
    ].forEach((name) => {
      expect(screen.getByText(name)).toBeInTheDocument();
    });
  });

  it('renders the contributors including the team members', () => {
    renderPage();

    expect(screen.getByText('تمارا محمد القضاة')).toBeInTheDocument();
    expect(screen.getByText('معلمة صاحبة أوراق الرياضيات')).toBeInTheDocument();
    expect(screen.getByText('سُمية جُعباص')).toBeInTheDocument();
    expect(screen.getByText('المعلمة صاحبة الحل')).toBeInTheDocument();
    expect(screen.getByText('الدكتورة هدى سعيفان')).toBeInTheDocument();
    expect(screen.getByText('ابراهيم ابو سنينة')).toBeInTheDocument();
    expect(screen.getByText('محمد العبرة')).toBeInTheDocument();
  });

  it('loads the downloaded logos', () => {
    renderPage();

    [
      'contributors/moe.png',
      'contributors/hcd.jpg',
      'contributors/amen-fm.jpg',
    ].forEach((src) => {
      expect(document.querySelector(`img[src$="${src}"]`)).toBeTruthy();
    });
  });

  it('is reachable from the shared course tab row', () => {
    renderPage();

    expect(
      screen.getByRole('link', { name: 'المساهمون والشركاء' })
    ).toHaveAttribute('href', '/contributors');
  });
});
