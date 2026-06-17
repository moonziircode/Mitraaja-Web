const USERNAME = '50004786';
const PASSWORD = 'aa12345';

async function main() {
  try {
    console.log('--- Step 1: GET cas/login ---');
    const step1 = await fetch('https://cas.anteraja.id/cas/login?isapp=true&acctype=emp');
    const setCookie1 = step1.headers.getSetCookie ? step1.headers.getSetCookie() : [];
    const jsessionidCookie = setCookie1.find(c => c.startsWith('JSESSIONID='));
    const jsessionid = jsessionidCookie ? jsessionidCookie.split(';')[0] : '';
    const lt = step1.headers.get('lt');
    const execution = step1.headers.get('execution');
    
    console.log('--- Step 2: POST cas/login ---');
    const postData = new URLSearchParams({
      username: USERNAME,
      password: PASSWORD,
      _eventId: 'submit',
      submit: 'login',
      lt: lt,
      execution: execution
    });
    
    const step2 = await fetch('https://cas.anteraja.id/cas/login?isapp=true&acctype=emp', {
      method: 'POST',
      headers: {
        'Cookie': jsessionid,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: postData.toString()
    });
    
    const setCookie2 = step2.headers.getSetCookie ? step2.headers.getSetCookie() : [];
    const tgcCookie = setCookie2.find(c => c.startsWith('TGC='));
    const tgc = tgcCookie ? tgcCookie.split(';')[0] : '';
    
    console.log('--- Step 3: GET cas/login service ---');
    const step3 = await fetch('https://cas.anteraja.id/cas/login?service=https%3A%2F%2Fapi.anteraja.id%2F', {
      headers: { 'Cookie': tgc }
    });
    
    const redirectUrl = step3.headers.get('redirecturl') || step3.headers.get('location');
    const parsedUrl = new URL(redirectUrl);
    const ticket = parsedUrl.searchParams.get('ticket');
    
    console.log('--- Step 4: POST user/cas/login ---');
    const step4 = await fetch('https://api.anteraja.id/user/cas/login', {
      method: 'POST',
      headers: {
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
      },
      body: JSON.stringify({
        ticket: ticket,
        deviceId: 'dev_device_uuid_12345',
        appKey: 'MAA',
        appSecret: 'santuy',
        service: 'https://api.anteraja.id/'
      })
    });
    
    const resBody = await step4.json();
    const token = resBody.content.token;
    const staffId = resBody.content.agent.agent_staff_id;
    
    const testAwb = '11003838770507';
    const bookingId = 'ID2618738004495';
    
    const metadataHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'token': token,
      'appid': 'JV_APP',
      'msgid': Date.now().toString(),
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
    
    console.log('\n--- Endpoint A: order/v2/task/dropoff/detail ---');
    const urlA = `https://api.anteraja.id/maa-task/order/v2/task/dropoff/detail?booking_id=${bookingId}`;
    try {
      const resA = await fetch(urlA, { method: 'GET', headers: metadataHeaders });
      console.log('Status:', resA.status);
      const bodyA = await resA.json();
      console.log('Body:', JSON.stringify(bodyA, null, 2));
    } catch (e) {
      console.log('Error endpoint A:', e.message);
    }
    
    console.log('\n--- Endpoint B: order/report/shippingDetail ---');
    const urlB = `https://api.anteraja.id/maa-task/order/report/shippingDetail/${testAwb}`;
    try {
      const resB = await fetch(urlB, { method: 'GET', headers: metadataHeaders });
      console.log('Status:', resB.status);
      const bodyB = await resB.json();
      console.log('Body:', JSON.stringify(bodyB, null, 2));
    } catch (e) {
      console.log('Error endpoint B:', e.message);
    }

  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
