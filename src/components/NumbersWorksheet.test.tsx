import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import NumbersWorksheet from './NumbersWorksheet';
import { useCourseAvailability } from '../context/CourseAvailabilityContext';
import { getAuthState } from '../utils/auth';

jest.mock('../context/CourseAvailabilityContext', () => ({
  useCourseAvailability: jest.fn(),
}));

jest.mock('../utils/auth', () => ({
  getAuthState: jest.fn(),
}));

// jsdom lacks ResizeObserver (used by NumberDrawablePage) and a 2d
// canvas context (the drawable page strokes real paths).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(global as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;

const ctx2dStub = {
  setTransform: jest.fn(),
  scale: jest.fn(),
  clearRect: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  lineCap: 'round',
  lineJoin: 'round',
  lineWidth: 1,
  strokeStyle: '#000',
} as unknown as CanvasRenderingContext2D;

const mockAvailability = useCourseAvailability as jest.Mock;
const mockAuth = getAuthState as jest.Mock;

const renderWorksheet = (n = 1) =>
  render(
    <MemoryRouter initialEntries={[`/worksheet/${n}`]}>
      {/* The real app mounts this through `/worksheet/:letter` — the Route
          is what feeds useParams, so replicate it exactly. */}
      <Routes>
        <Route path="/worksheet/:letter" element={<NumbersWorksheet />} />
      </Routes>
    </MemoryRouter>
  );

const learnImage = () =>
  document.querySelector<HTMLImageElement>('.numbers-worksheet-learn-image');

const drawableImage = () =>
  document.querySelector<HTMLImageElement>('.number-drawable-image');

const strokeCanvas = () => {
  // Each page mounts a fresh canvas — always re-query, never reuse a
  // reference across a navigation (the old node gets detached).
  const canvas = document.querySelector('canvas.number-drawable-canvas');
  if (!canvas) throw new Error('drawable canvas not mounted');
  fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 10, clientY: 10 });
  fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 40, clientY: 40 });
  fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 40, clientY: 40 });
};

describe('NumbersWorksheet page order', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-stub the canvas 2d context each test (CRA clears spies between
    // tests, and jsdom has no real canvas implementation).
    jest
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(ctx2dStub);
    mockAvailability.mockReturnValue({
      courses: { math: { locked: false } },
    });
    mockAuth.mockReturnValue({ user: { role: 'guest' } });
  });

  it('renders the learn page first', () => {
    renderWorksheet(1);
    expect(learnImage()).toHaveAttribute('src', '/numbers/1/page-1.png');
  });

  it('shows the trace (writing) page right after the video, before the write page', async () => {
    renderWorksheet(1);
    // Learn page never blocks: التالي is enabled immediately.
    const next = screen.getByRole('button', { name: /التالي/ });
    expect(next).toBeEnabled();

    fireEvent.click(next);

    // Page 2 must now be the drawable trace page (page-5), not the write page (page-2).
    await waitFor(
      () => expect(drawableImage()).toBeTruthy(),
      { timeout: 3000 }
    );
    expect(drawableImage()).toHaveAttribute('src', '/numbers/1/page-5.png');
    expect(learnImage()).toBeNull();

    // And the مسح (clear) control of the drawable page is present.
    expect(screen.getByRole('button', { name: 'مسح' })).toBeInTheDocument();
  });

  it('keeps the write page third and the color page last', async () => {
    renderWorksheet(2);
    const next = () => screen.getByRole('button', { name: /التالي/ });

    // learn -> trace
    fireEvent.click(next());
    await waitFor(() => expect(drawableImage()).toHaveAttribute('src', '/numbers/2/page-5.png'), { timeout: 3000 });

    // A stroke completes the drawable page so التالي unlocks.
    strokeCanvas();
    await waitFor(() => expect(next()).toBeEnabled(), { timeout: 3000 });

    // trace -> write
    fireEvent.click(next());
    await waitFor(() => expect(drawableImage()).toHaveAttribute('src', '/numbers/2/page-2.png'), { timeout: 3000 });

    // write -> countChoose (first question page)
    strokeCanvas();
    await waitFor(() => expect(next()).toBeEnabled(), { timeout: 3000 });
    fireEvent.click(next());
    await waitFor(
      () =>
        expect(
          document.querySelector('.numbers-worksheet-page img')
        ).toHaveAttribute('src', '/numbers/2/page-3.png'),
      { timeout: 3000 }
    );
  });
});
