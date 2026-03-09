/**
 * Exact Online Integration Service
 * 
 * This service handles payment tracking via Exact Online API.
 * Configure with your credentials in .env:
 * 
 *   EXACT_CLIENT_ID=your_client_id
 *   EXACT_CLIENT_SECRET=your_client_secret
 *   EXACT_REDIRECT_URI=http://localhost:5000/api/exact/callback
 *   EXACT_DIVISION=your_division_number
 * 
 * Exact Online OAuth2 flow:
 *   1. Admin visits /api/exact/authorize → redirected to Exact login
 *   2. After login, Exact redirects to /api/exact/callback with auth code
 *   3. Server exchanges code for access_token + refresh_token
 *   4. Tokens stored and used for API calls
 * 
 * API Docs: https://start.exactonline.nl/docs/HlpRestAPIResources.aspx
 */

const BASE_URL = 'https://start.exactonline.nl';

let tokenStore = {
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
};

// Check if Exact Online is configured
const isConfigured = () => {
  return !!(process.env.EXACT_CLIENT_ID && process.env.EXACT_CLIENT_SECRET);
};

// Get authorization URL for OAuth2 flow
const getAuthorizationUrl = () => {
  if (!isConfigured()) return null;
  
  const params = new URLSearchParams({
    client_id: process.env.EXACT_CLIENT_ID,
    redirect_uri: process.env.EXACT_REDIRECT_URI,
    response_type: 'code',
    force_login: '0',
  });
  
  return `${BASE_URL}/api/oauth2/auth?${params.toString()}`;
};

// Exchange authorization code for tokens
const exchangeCodeForTokens = async (code) => {
  if (!isConfigured()) throw new Error('Exact Online not configured');
  
  const response = await fetch(`${BASE_URL}/api/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.EXACT_CLIENT_ID,
      client_secret: process.env.EXACT_CLIENT_SECRET,
      redirect_uri: process.env.EXACT_REDIRECT_URI,
      code,
    }),
  });

  const data = await response.json();
  
  tokenStore = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  };
  
  console.log('✅ Exact Online tokens obtained');
  return tokenStore;
};

// Refresh access token
const refreshAccessToken = async () => {
  if (!tokenStore.refreshToken) throw new Error('No refresh token available');
  
  const response = await fetch(`${BASE_URL}/api/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.EXACT_CLIENT_ID,
      client_secret: process.env.EXACT_CLIENT_SECRET,
      refresh_token: tokenStore.refreshToken,
    }),
  });

  const data = await response.json();
  
  tokenStore = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  };
  
  return tokenStore;
};

// Get valid access token (refresh if needed)
const getAccessToken = async () => {
  if (!tokenStore.accessToken) throw new Error('Not authenticated with Exact Online');
  
  if (Date.now() >= tokenStore.expiresAt - 60000) {
    await refreshAccessToken();
  }
  
  return tokenStore.accessToken;
};

// Make authenticated API request
const apiRequest = async (endpoint, method = 'GET', body = null) => {
  const accessToken = await getAccessToken();
  const division = process.env.EXACT_DIVISION;
  
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };
  
  if (body) options.body = JSON.stringify(body);
  
  const url = `${BASE_URL}/api/v1/${division}${endpoint}`;
  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(`Exact API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
};

// ============================================================
// PAYMENT TRACKING METHODS
// ============================================================

/**
 * Check if an invoice has been paid
 * Uses the Exact Online receivables endpoint
 * 
 * @param {string} invoiceNumber - The invoice number to check
 * @returns {object} { paid: boolean, amountPaid: number, amountDue: number }
 */
const checkPaymentStatus = async (invoiceNumber) => {
  if (!isConfigured() || !tokenStore.accessToken) {
    console.log('⚠️ Exact Online not connected - cannot check payment');
    return { paid: false, amountPaid: 0, amountDue: 0, error: 'Not connected' };
  }
  
  try {
    // Query receivables for this invoice
    const result = await apiRequest(
      `/financialtransaction/Receivables?$filter=InvoiceNumber eq '${invoiceNumber}'&$select=InvoiceNumber,Amount,AmountDC`
    );
    
    if (result && result.d && result.d.results && result.d.results.length > 0) {
      const receivable = result.d.results[0];
      const amountDue = receivable.AmountDC || receivable.Amount || 0;
      
      return {
        paid: amountDue <= 0,
        amountPaid: Math.abs(amountDue),
        amountDue: Math.max(0, amountDue),
      };
    }
    
    return { paid: false, amountPaid: 0, amountDue: 0, error: 'Invoice not found' };
  } catch (error) {
    console.error('❌ Error checking payment:', error.message);
    return { paid: false, amountPaid: 0, amountDue: 0, error: error.message };
  }
};

/**
 * Get all outstanding receivables
 * @returns {Array} List of unpaid invoices
 */
const getOutstandingPayments = async () => {
  if (!isConfigured() || !tokenStore.accessToken) {
    return [];
  }
  
  try {
    const result = await apiRequest(
      `/financialtransaction/Receivables?$filter=AmountDC gt 0&$select=InvoiceNumber,AccountName,AmountDC,DueDate`
    );
    
    return result?.d?.results || [];
  } catch (error) {
    console.error('❌ Error fetching receivables:', error.message);
    return [];
  }
};

module.exports = {
  isConfigured,
  getAuthorizationUrl,
  exchangeCodeForTokens,
  checkPaymentStatus,
  getOutstandingPayments,
  getAccessToken,
  apiRequest,
};
