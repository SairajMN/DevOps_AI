// Local test for Vercel serverless function
const handler = require('./api/index.js');

// Mock request and response objects
function createMockReq(method = 'GET', query = {}, body = null) {
  return {
    method,
    query,
    body,
    headers: {},
  };
}

function createMockRes() {
  const res = {
    headers: {},
    statusCode: 200,
    headersSent: false,
  };
  
  res.setHeader = function(key, value) {
    this.headers[key] = value;
    return this;
  };
  
  res.status = function(code) {
    this.statusCode = code;
    return this;
  };
  
  res.json = function(data) {
    this.body = data;
    console.log('Response Status:', this.statusCode);
    console.log('Response Headers:', JSON.stringify(this.headers, null, 2));
    console.log('Response Body:', JSON.stringify(data, null, 2));
    return this;
  };
  
  res.end = function() {
    console.log('Response Status:', this.statusCode);
    console.log('Response ended with no body');
    return this;
  };
  
  return res;
}

async function runTests() {
  console.log('=== Testing Vercel Serverless Function ===\n');
  
  // Test 1: Default endpoint
  console.log('Test 1: Default endpoint (GET /api)');
  try {
    const req = createMockReq('GET', {});
    const res = createMockRes();
    await handler(req, res);
    console.log('✓ Test 1 passed\n');
  } catch (error) {
    console.log('✗ Test 1 failed:', error.message, '\n');
  }
  
  // Test 2: Health endpoint
  console.log('Test 2: Health endpoint (GET /api?path=health)');
  try {
    const req = createMockReq('GET', { path: 'health' });
    const res = createMockRes();
    await handler(req, res);
    console.log('✓ Test 2 passed\n');
  } catch (error) {
    console.log('✗ Test 2 failed:', error.message, '\n');
  }
  
  // Test 3: Models endpoint
  console.log('Test 3: Models endpoint (GET /api?path=models)');
  try {
    const req = createMockReq('GET', { path: 'models' });
    const res = createMockRes();
    await handler(req, res);
    console.log('✓ Test 3 passed\n');
  } catch (error) {
    console.log('✗ Test 3 failed:', error.message, '\n');
  }
  
  // Test 4: Analyze endpoint
  console.log('Test 4: Analyze endpoint (POST /api?path=analyze)');
  try {
    const req = createMockReq('POST', { path: 'analyze' }, { log: 'test error log' });
    const res = createMockRes();
    await handler(req, res);
    console.log('✓ Test 4 passed\n');
  } catch (error) {
    console.log('✗ Test 4 failed:', error.message, '\n');
  }
  
  // Test 5: OPTIONS (CORS preflight)
  console.log('Test 5: CORS preflight (OPTIONS)');
  try {
    const req = createMockReq('OPTIONS', {});
    const res = createMockRes();
    await handler(req, res);
    console.log('✓ Test 5 passed\n');
  } catch (error) {
    console.log('✗ Test 5 failed:', error.message, '\n');
  }
  
  console.log('=== All tests completed ===');
}

runTests().catch(console.error);