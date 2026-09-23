import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { useBoosterStore } from '../../store/useBoosterStore';
import InvestmentDetail from './InvestmentDetail';

describe('investment detail', () => {
  it('shows a way back when the investment cannot be loaded', async () => {
    useBoosterStore.setState({
      currentInvestment: null,
      isDetailLoading: false,
      fetchInvestmentById: vi.fn(async () => {}),
      fetchProfitPayouts: vi.fn(async () => {}),
    });

    render(
      <MemoryRouter initialEntries={['/booster/investments/999']}>
        <Routes>
          <Route path="/booster/investments/:id" element={<InvestmentDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('ไม่พบรายการลงทุนนี้ หรือไม่สามารถโหลดข้อมูลได้')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'กลับไปรายการลงทุน' })).toHaveAttribute('href', '/booster/investments');
  });
});
