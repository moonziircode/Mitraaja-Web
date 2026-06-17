const http = require('https');
const { URL } = require('url');

const USERNAME = '50004786';
const PASSWORD = 'aa12345';

async function main() {
  try {
    console.log('--- Step 1: GET cas/login ---');
    const step1 = await getRequest('https://cas.anteraja.id/cas/login?isapp=true&acctype=emp');
    
    const cookies = step1.headers['set-cookie'] || [];
    const jsessionidCookie = cookies.find(c => c.startsWith('JSESSIONID='));
    const jsessionid = jsessionidCookie ? jsessionidCookie.split(';')[0] : '';
    const lt = step1.headers['lt'];
    const execution = step1.headers['execution'];
    
    console.log('JSESSIONID:', jsessionid);
    console.log('lt:', lt);
    console.log('execution:', execution);
    
    if (!jsessionid || !lt || !execution) {
      throw new Error('Failed to get JSESSIONID, lt, or execution from step 1');
    }
    
    console.log('\n--- Step 2: POST cas/login (Submit form) ---');
    const postData = `username=${encodeURIComponent(USERNAME)}&password=${encodeURIComponent(PASSWORD)}&_eventId=submit&submit=login&lt=${encodeURIComponent(lt)}&execution=${encodeURIComponent(execution)}`;
    
    const step2 = await postRequest('https://cas.anteraja.id/cas/login?isapp=true&acctype=emp', postData, {
      'Cookie': jsessionid,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    });
    
    const step2Cookies = step2.headers['set-cookie'] || [];
    const tgcCookie = step2Cookies.find(c => c.startsWith('TGC='));
    const tgc = tgcCookie ? tgcCookie.split(';')[0] : '';
    
    console.log('TGC Cookie:', tgc);
    if (!tgc) {
      console.log('Headers from Step 2:', step2.headers);
      console.log('Body from Step 2:', step2.body);
      throw new Error('Failed to get TGC cookie from step 2 (probably wrong username/password)');
    }
    
    console.log('\n--- Step 3: GET cas/login with service ---');
    const step3 = await getRequest('https://cas.anteraja.id/cas/login?service=https%3A%2F%2Fapi.anteraja.id%2F', {
      'Cookie': tgc
    });
    
    console.log('Step 3 Status:', step3.statusCode);
    console.log('Step 3 Headers:', step3.headers);
    
    let redirectUrl = step3.headers['location'] || step3.headers['redirecturl'];
    if (!redirectUrl) {
      console.log('Body from Step 3:', step3.body);
      throw new Error('Failed to get redirect URL from step 3');
    }
    
    console.log('Redirect URL:', redirectUrl);
    
    const parsedUrl = new URL(redirectUrl);
    const ticket = parsedUrl.searchParams.get('ticket');
    console.log('Ticket:', ticket);
    if (!ticket) {
      throw new Error('Failed to parse ticket from redirect URL');
    }
    
    console.log('\n--- Step 4: POST user/cas/login ---');
    const gatewayPayload = JSON.stringify({
      ticket: ticket,
      deviceId: 'dev_device_uuid_12345',
      appKey: 'MAA',
      appSecret: 'santuy',
      service: 'https://api.anteraja.id/'
    });
    
    const step4Headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'token': '',
      'appid': 'JV_APP',
      'msgid': '1555315559769',
      'imei': 'dev_device_uuid_12345',
      'deviceUuid': 'dev_device_uuid_12345',
      'hardwareSerialNo': 'dev_serial',
      'manufacture': 'Apple',
      'model': 'Macbook',
      'os': 'macOS',
      'osVersion': '14.0',
      'appVersion': '2.2.4',
      'mv': '1.1',
      'source': 'MAA'
    };
    
    const step4 = await postRequest('https://api.anteraja.id/user/cas/login', gatewayPayload, step4Headers);
    console.log('Step 4 Status:', step4.statusCode);
    console.log('Response body:');
    console.log(JSON.stringify(JSON.parse(step4.body), null, 2));
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

function getRequest(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: headers
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

function postRequest(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: headers
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

main();
