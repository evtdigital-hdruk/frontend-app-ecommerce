import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient, getAuthenticatedUser } from '@edx/frontend-platform/auth';
import { getEcommerceUrls, getOrders } from './service';

jest.mock('@edx/frontend-platform', () => ({ getConfig: jest.fn() }));
jest.mock('@edx/frontend-platform/auth', () => ({
  getAuthenticatedHttpClient: jest.fn(),
  getAuthenticatedUser: jest.fn(),
}));

describe('order history service', () => {
  beforeEach(() => {
    getAuthenticatedUser.mockReturnValue({ username: 'learner' });
  });

  it('resolves the ecommerce URLs from the config current at call time', () => {
    getConfig.mockReturnValue({ ECOMMERCE_BASE_URL: '', RECEIPT_URL: '' });
    expect(getEcommerceUrls().ordersUrl).toBe('/api/v2/orders/');

    // Runtime config arrives after module load; the next call must see it.
    getConfig.mockReturnValue({
      ECOMMERCE_BASE_URL: 'https://ecommerce.example.org',
      RECEIPT_URL: '',
      ORDER_HISTORY_URL: 'https://apps.example.org/orders/orders',
    });
    expect(getEcommerceUrls()).toEqual({
      ordersUrl: 'https://ecommerce.example.org/api/v2/orders/',
      receiptBaseUrl: 'https://ecommerce.example.org/checkout/receipt/',
    });
  });

  it('ignores ORDER_HISTORY_URL as an API endpoint and honours RECEIPT_URL', () => {
    getConfig.mockReturnValue({
      ECOMMERCE_BASE_URL: 'https://ecommerce.example.org',
      RECEIPT_URL: 'https://ecommerce.example.org/receipt/',
      ORDER_HISTORY_URL: 'https://apps.example.org/orders/orders',
    });
    expect(getEcommerceUrls()).toEqual({
      ordersUrl: 'https://ecommerce.example.org/api/v2/orders/',
      receiptBaseUrl: 'https://ecommerce.example.org/receipt/',
    });
  });

  it('fetches orders from the ecommerce API with the username and paging', async () => {
    getConfig.mockReturnValue({ ECOMMERCE_BASE_URL: 'https://ecommerce.example.org', RECEIPT_URL: '' });
    const get = jest.fn().mockResolvedValue({
      data: {
        count: 1,
        next: null,
        previous: null,
        results: [{
          number: 'EDX-1',
          currency: 'GBP',
          total_excl_tax: '49.00',
          date_placed: '2026-09-07T00:00:00Z',
          lines: [{ title: 'Seat', quantity: 1, description: 'Verified' }],
        }],
      },
    });
    getAuthenticatedHttpClient.mockReturnValue({ get });

    const result = await getOrders(2, 10);

    expect(get).toHaveBeenCalledWith('https://ecommerce.example.org/api/v2/orders/', {
      params: { username: 'learner', page: 2, page_size: 10 },
    });
    expect(result.orders[0].receiptUrl).toBe('https://ecommerce.example.org/checkout/receipt/?order_number=EDX-1');
    expect(result.pageCount).toBe(1);
  });
});
