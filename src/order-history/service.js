import { getAuthenticatedHttpClient, getAuthenticatedUser } from '@edx/frontend-platform/auth';
import { getConfig } from '@edx/frontend-platform';

/**
 * Resolve the ecommerce URLs at call time, not at module load.
 *
 * Under Tutor the MFE is built with an empty ECOMMERCE_BASE_URL and receives
 * the real value from the LMS runtime config (/api/mfe_config/v1) during
 * initialisation. Reading getConfig() at module scope ran before that fetch,
 * so the orders request went to `/api/v2/orders/` relative to the MFE host.
 *
 * ORDER_HISTORY_URL is deliberately not used as the API endpoint: the LMS
 * publishes that key as the URL of this page (for the account MFE's link),
 * not as an orders API override.
 */
export function getEcommerceUrls() {
  const { RECEIPT_URL, ECOMMERCE_BASE_URL } = getConfig();
  return {
    ordersUrl: `${ECOMMERCE_BASE_URL}/api/v2/orders/`,
    receiptBaseUrl: RECEIPT_URL || `${ECOMMERCE_BASE_URL}/checkout/receipt/`,
  };
}

export async function getOrders(page = 1, pageSize = 20) {
  const httpClient = getAuthenticatedHttpClient();
  const { username } = getAuthenticatedUser();
  const { ordersUrl, receiptBaseUrl } = getEcommerceUrls();

  const { data } = await httpClient.get(ordersUrl, {
    params: {
      username,
      page,
      page_size: pageSize,
    },
  });

  const transformedResults = data.results.map(({
    total_excl_tax, // eslint-disable-line camelcase
    lines,
    number,
    currency,
    date_placed, // eslint-disable-line camelcase
  }) => {
    const lineItems = lines.map(({
      title,
      quantity,
      description,
    }) => ({
      title,
      quantity,
      description,
    }));

    return {
      datePlaced: date_placed, // eslint-disable-line camelcase
      total: total_excl_tax, // eslint-disable-line camelcase
      orderId: number,
      currency,
      lineItems,
      receiptUrl: `${receiptBaseUrl}?order_number=${number}`,
    };
  });

  return {
    count: data.count,
    pageCount: Math.ceil(data.count / pageSize),
    currentPage: page,
    next: data.next,
    previous: data.previous,
    orders: transformedResults,
  };
}
