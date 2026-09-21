import React from 'react';
import { render, screen, within, fireEvent, act } from '@testing-library/react';
import CourseManagement from './CourseManagement';
import { useCourseAvailability } from '../context/CourseAvailabilityContext';
import { CourseType } from '../utils/courseState';

jest.mock('../context/CourseAvailabilityContext', () => ({
  useCourseAvailability: jest.fn(),
}));

const mockUseCourseAvailability = useCourseAvailability as jest.Mock;

type CourseStatus = { locked: boolean; label?: string };

function makeCourses(overrides: Partial<Record<CourseType, CourseStatus>> = {}): Record<CourseType, CourseStatus> {
  return {
    arabic: { locked: false, label: 'Arabic Language' },
    english: { locked: false, label: 'English Language' },
    math: { locked: false, label: 'Math' },
    awareness: { locked: true, label: 'Awareness' },
    ...overrides,
  };
}

function renderCourses(courses: Record<CourseType, CourseStatus>) {
  const updateCourseLock = jest.fn().mockResolvedValue(undefined);
  mockUseCourseAvailability.mockReturnValue({
    courses,
    loading: false,
    error: undefined,
    refresh: jest.fn().mockResolvedValue(undefined),
    updateCourseLock,
  });
  render(<CourseManagement />);
  return { updateCourseLock };
}

function cardFor(name: string): HTMLElement {
  const heading = screen.getByRole('heading', { name });
  const card = heading.closest('.course-card') as HTMLElement | null;
  if (!card) throw new Error(`course card for "${name}" not found`);
  return card;
}

describe('CourseManagement', () => {
  beforeEach(() => {
    mockUseCourseAvailability.mockReset();
  });

  test('renders an Unlock Course button on a locked Math card', () => {
    renderCourses(makeCourses({ math: { locked: true, label: 'Math' } }));

    const mathCard = cardFor('Math');
    expect(within(mathCard).getByRole('button', { name: 'Unlock Course' })).toBeEnabled();
    expect(within(mathCard).getByText('Students will not see this course while it is locked.')).toBeInTheDocument();
    expect(within(mathCard).queryByText(/no admin toggle/i)).not.toBeInTheDocument();
  });

  test('renders an Unlock Course button on a locked Awareness card', () => {
    renderCourses(makeCourses({ awareness: { locked: true, label: 'Awareness' } }));

    const awarenessCard = cardFor('Awareness');
    expect(within(awarenessCard).getByRole('button', { name: 'Unlock Course' })).toBeEnabled();
    expect(within(awarenessCard).queryByText(/no admin toggle/i)).not.toBeInTheDocument();
  });

  test('clicking Unlock Course on a locked Math card toggles the lock off', async () => {
    renderCourses(makeCourses({ math: { locked: true, label: 'Math' } }));

    const mathCard = cardFor('Math');
    await act(async () => {
      fireEvent.click(within(mathCard).getByRole('button', { name: 'Unlock Course' }));
    });

    expect(mockUseCourseAvailability().updateCourseLock).toHaveBeenCalledTimes(1);
    expect(mockUseCourseAvailability().updateCourseLock).toHaveBeenCalledWith('math', false);
  });

  test('clicking Unlock Course on a locked Awareness card toggles the lock off', async () => {
    renderCourses(makeCourses({ awareness: { locked: true, label: 'Awareness' } }));

    const awarenessCard = cardFor('Awareness');
    await act(async () => {
      fireEvent.click(within(awarenessCard).getByRole('button', { name: 'Unlock Course' }));
    });

    expect(mockUseCourseAvailability().updateCourseLock).toHaveBeenCalledTimes(1);
    expect(mockUseCourseAvailability().updateCourseLock).toHaveBeenCalledWith('awareness', false);
  });

  test('unlocked cards show Lock Course and clicking toggles the lock on', async () => {
    renderCourses(makeCourses());

    const mathCard = cardFor('Math');
    expect(within(mathCard).getByRole('button', { name: 'Lock Course' })).toBeEnabled();

    await act(async () => {
      fireEvent.click(within(mathCard).getByRole('button', { name: 'Lock Course' }));
    });
    expect(mockUseCourseAvailability().updateCourseLock).toHaveBeenCalledWith('math', true);
  });

  test('the Arabic card keeps its disabled Always Available button', () => {
    renderCourses(makeCourses());

    const arabicCard = cardFor('Arabic Language');
    const button = within(arabicCard).getByRole('button', { name: 'Always Available' });
    expect(button).toBeDisabled();
  });
});
