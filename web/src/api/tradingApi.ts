import { apiFetch } from './client';
import { PaperAccount, Position, PaperOrder } from '../types';

export interface PaperPortfolioResponse {
  account: PaperAccount;
  positions: Position[];
  orders: PaperOrder[];
}

export const tradingApi = {
  getPortfolio: () => apiFetch<PaperPortfolioResponse>('trading/portfolio', 'paper-portfolio.json')
};
